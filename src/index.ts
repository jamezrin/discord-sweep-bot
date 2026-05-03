import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  MessageFlags,
  SlashCommandBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

process.on("uncaughtException", (err) => {
  logger.error({ event: "uncaught_exception", error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ event: "unhandled_rejection", reason: String(reason) });
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = [
  new SlashCommandBuilder()
    .setName("channelsweep")
    .setDescription("Bulk delete channels (Admin only)")
    .addSubcommand((sub) =>
      sub
        .setName("category")
        .setDescription("Delete all channels within a category")
        .addChannelOption((opt) =>
          opt
            .setName("category")
            .setDescription("The category to sweep")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("channels")
        .setDescription("Delete specific channels")
        .addStringOption((opt) =>
          opt
            .setName("mentions")
            .setDescription("Mention the channels to delete (e.g. #general #rules)")
            .setRequired(true)
        )
    )
    .toJSON(),
];

const delayMs = parseInt(process.env.SWEEP_DELAY_MS || "0", 10);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseChannelMentions(input: string): string[] {
  const matches = input.matchAll(/<#(\d+)>/g);
  const ids = Array.from(matches, (m) => m[1]);
  return [...new Set(ids)];
}

async function sendResult(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  try {
    await interaction.editReply({ content });
  } catch {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  }
}

async function deleteChannels(
  interaction: ChatInputCommandInteraction,
  channelIds: string[]
): Promise<void> {
  const guild = interaction.guild!;
  const deleted: string[] = [];
  const failed: string[] = [];

  // Resolve names before deletion so we can report them even after the channel is gone
  const names = new Map<string, string>();
  for (const id of channelIds) {
    const channel = guild.channels.cache.get(id);
    names.set(id, channel?.name ?? id);
  }

  for (const id of channelIds) {
    const channel = guild.channels.cache.get(id);
    if (!channel) {
      failed.push(names.get(id) ?? id);
      continue;
    }
    try {
      await channel.delete();
      deleted.push(names.get(id) ?? id);
      logger.info({ event: "channel_deleted", channelId: id, guildId: guild.id, userId: interaction.user.id });
      if (delayMs > 0) await sleep(delayMs);
    } catch (err) {
      failed.push(names.get(id) ?? id);
      logger.error({
        event: "channel_delete_failed",
        channelId: id,
        guildId: guild.id,
        userId: interaction.user.id,
        error: (err as Error).message,
      });
    }
  }

  const lines: string[] = [];
  if (deleted.length > 0) lines.push(`Deleted (${deleted.length}): ${deleted.join(", ")}`);
  if (failed.length > 0) lines.push(`Failed (${failed.length}): ${failed.join(", ")}`);

  await sendResult(
    interaction,
    lines.length > 0 ? lines.join("\n") : "No channels were deleted."
  );
}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info({ event: "bot_ready", tag: readyClient.user.tag, version: process.env.npm_package_version });
  try {
    await readyClient.application.commands.set(commands);
    logger.info({ event: "commands_registered", count: commands.length });
  } catch (err) {
    logger.error({
      event: "commands_register_failed",
      error: (err as Error).message,
    });
    process.exit(1);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "channelsweep") return;

  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "You must have Administrator permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
    logger.warn({
      event: "unauthorized_attempt",
      userId: interaction.user.id,
      guildId: interaction.guildId,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "category") {
    const category = interaction.options.getChannel("category", true);
    const children = interaction.guild!.channels.cache.filter(
      (ch) => ch.parentId === category.id
    );
    const ids = children.map((ch) => ch.id);
    ids.push(category.id);
    await deleteChannels(interaction, ids);
  } else if (subcommand === "channels") {
    const mentions = interaction.options.getString("mentions", true);
    const ids = parseChannelMentions(mentions);
    if (ids.length === 0) {
      await sendResult(interaction, "No valid channel mentions found. Use #channel to mention channels.");
      return;
    }
    await deleteChannels(interaction, ids);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error({ event: "missing_token" });
  process.exit(1);
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ event: "shutdown_start", signal });
  try {
    await client.destroy();
    logger.info({ event: "shutdown_complete" });
  } catch (err) {
    logger.error({ event: "shutdown_error", error: (err as Error).message });
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

client.login(token);
