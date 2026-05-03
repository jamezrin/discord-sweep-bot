# Agent Notes

## Project: discord-sweep-bot

- **Stack**: Node.js 24, TypeScript (ESM), discord.js v14, pnpm, Winston, dotenv
- **Bot**: Stateless Discord bot for bulk channel deletion
- **Commands**:
  - `/channelsweep category <category>` — Delete all channels within a category (including the category itself)
  - `/channelsweep channels <#ch1 #ch2 ...>` — Delete specific channels by mentioning them (unlimited count)
- **Security**: Requires `Administrator` permission — hard check, no exceptions
- **Registry**: `ghcr.io/jamezrin/discord-sweep-bot`
- **Build**: Multi-arch Docker (amd64 + arm64) via GitHub Actions
- **Dev**: `pnpm install && pnpm run dev` (uses tsx watch)
- **Build**: `pnpm run build` (tsc) → `dist/index.js`
- **Env vars**: `DISCORD_TOKEN` (required), `LOG_LEVEL` (default: info), `SWEEP_DELAY_MS` (default: 0)
- **Dotenv**: Loads `.env` file automatically via `import "dotenv/config"`
- **Mise**: `mise.toml` configures Node.js 24 and auto-loads `.env`
- **Graceful shutdown**: Handles SIGTERM/SIGINT for clean Discord client disconnects
- **Error handling**: Global uncaughtException and unhandledRejection handlers
- **Logging**: Structured JSON with userId, guildId, channelId for every deletion
- **Deployment**: K8s manifests with ArgoCD support, ExternalSecret synced from Bitwarden
- **K8s namespace**: `discord-sweep-bot`
- **Security hardening**: Non-root user, read-only root fs, dropped capabilities
