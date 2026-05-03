# discord-sweep-bot

Bulk channel deletion for server administrators. Delete entire categories or multiple channels instantly — no confirmation modals.

Always free and available, open-source at [github.com/jamezrin/discord-sweep-bot](https://github.com/jamezrin/discord-sweep-bot)

## Features

- **Delete entire categories** — `/channelsweep category <category>` deletes all channels within a category, including the category itself
- **Delete multiple channels** — `/channelsweep channels <#ch1 #ch2 ...>` deletes any number of specific channels by mentioning them
- **Administrator-only** — Hard permission check, no exceptions
- **Instant execution** — No confirmation modals or prompts
- **Rate limit friendly** — Configurable delay between deletions
- **Stateless** — No database, no stored state

## Adding the Bot to Your Server

[Click here to add the bot to your server](https://discord.com/oauth2/authorize?client_id=1500547924021739720&permissions=8&integration_type=0&scope=bot+applications.commands)

## Commands

| Command | Description |
|---------|-------------|
| `/channelsweep category <category>` | Delete all channels within a category (including the category itself) |
| `/channelsweep channels <mentions>` | Delete specific channels by mentioning them (e.g. `#general #rules #logs`) |

**Only users with Administrator permission can use these commands.**

## Development

### Prerequisites

- [mise](https://mise.jdx.dev/) (optional, for automatic Node.js and env management)
- Node.js 24
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env and add your DISCORD_TOKEN

# Start development server (with hot reload)
pnpm run dev

# Build for production
pnpm run build

# Start production build
pnpm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token (required) | - |
| `LOG_LEVEL` | Winston log level | `info` |
| `SWEEP_DELAY_MS` | Delay between channel deletions in ms | `0` |

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

### Kubernetes (ArgoCD)

This bot is designed to be deployed via ArgoCD. The manifests are in the `k8s/` directory.

**Prerequisites:**
- [External Secrets Operator](https://external-secrets.io/) with a Bitwarden SecretStore configured

**Deployment:**

Point ArgoCD to the `k8s/` directory in this repository. The manifests include:

- Namespace: `discord-sweep-bot`
- Deployment with security hardening (non-root, read-only root fs, dropped capabilities)
- ExternalSecret synced from Bitwarden vault
- Liveness probe and resource limits

**Manual application:**

```bash
kubectl apply -f k8s/
```

The ExternalSecret will automatically create a Kubernetes Secret from your Bitwarden vault.

### Docker Image

The GitHub Actions workflow automatically builds and pushes multi-arch images (`linux/amd64`, `linux/arm64`) to `ghcr.io/jamezrin/discord-sweep-bot` on every push to `main` and on version tags.

## Architecture

- **Stack**: Node.js 24, TypeScript (ESM), discord.js v14, pnpm, Winston
- **State**: Completely stateless — no database, no volumes, no persistent storage
- **Security**: Hard Administrator permission check on every command invocation
- **Logging**: Structured JSON logging with user ID, guild ID, and channel ID for every action
- **Graceful shutdown**: Handles SIGTERM/SIGINT for clean disconnects (Kubernetes-friendly)
- **Error handling**: Global uncaught exception and unhandled rejection handlers

## License

[GPL-3.0](LICENSE)
