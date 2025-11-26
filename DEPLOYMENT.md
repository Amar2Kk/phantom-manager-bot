# Deployment Guide - Coolify & Docker

This guide covers deploying the Phantom Manager Bot to Coolify using Docker.

## Prerequisites

1. A Coolify instance (self-hosted or managed)
2. A PostgreSQL database (can be created in Coolify or use docker-compose)
3. Your Discord bot token and client ID
4. Your GitHub repository connected to Coolify
5. Docker and Docker Compose installed (for local/manual deployment)

# Deployment Method 1: Coolify with Docker

## Step 1: Create PostgreSQL Database in Coolify

1. In Coolify, go to **Databases** → **New Database**
2. Select **PostgreSQL**
3. Configure the database:
     - **Name**: `phantom-bot-db` (or any name)
     - **Version**: Latest stable (15 or 16)
     - **Database Name**: `postgres` (default is fine)
4. Click **Create**
5. Once created, copy the **Internal Connection String** (looks like: `postgres://postgres:password@servicename:5432/postgres`)

## Step 2: Create Application in Coolify

1. Go to **Applications** → **New Application**
2. Select your **GitHub repository**: `Amar2Kk/phantom-manager-bot`
3. Select the **main** branch
4. Configure basic settings:
     - **Build Pack**: **Dockerfile** (select this instead of Nixpacks)
     - **Dockerfile Location**: `Dockerfile` (default)
     - **Port**: Not needed (Discord bot doesn't expose HTTP)

## Step 3: Configure Environment Variables

In your Coolify application settings, add these environment variables:

### Required Variables

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Important Notes:

-   **DATABASE_URL**: Use the **Internal Connection String** from your Coolify PostgreSQL database
-   **DISCORD_TOKEN**: Get from [Discord Developer Portal](https://discord.com/developers/applications)
-   **CLIENT_ID**: Your Discord application ID (same page as token)

## Step 4: Deploy Commands to Discord

Before starting the bot, you need to register the slash commands with Discord.

### Option A: Deploy from Local Machine (Recommended for first time)

1. Make sure your `.env` file has the correct `DISCORD_TOKEN` and `CLIENT_ID`
2. Run the deploy command locally:
    ```bash
    pnpm run deploy:commands
    ```
3. This registers all slash commands with Discord

### Option B: Deploy from Coolify

1. After the first deployment, SSH into your Coolify container
2. Navigate to the app directory
3. Run: `pnpm run deploy:commands`

**Note**: You only need to deploy commands once, or when you add/modify commands.

## Step 5: Deploy the Application

1. In Coolify, click **Deploy**
2. Monitor the build logs for any errors
3. The deployment process will:
    - Install dependencies (`pnpm install`)
    - Build TypeScript (`pnpm run build`)
    - Generate Prisma Client (`pnpm prisma generate`)
    - Run database migrations (`pnpm prisma migrate deploy`)
    - Start the bot (`pnpm run start`)

## Step 6: Verify Deployment

1. Check the application logs in Coolify
2. Look for: `✅ Logged in as YourBotName#1234`
3. In Discord, type `/` in any server with the bot to see available commands

## Post-Deployment Setup (In Discord)

Once the bot is running, you need to configure it in each server:

### 1. Set Log Channel

```
/set-log-channel channel:#your-log-channel
```

### 2. Set Leaderboard Channel

```
/set-leaderboard channel:#credits-leaderboard
```

### 3. Test the Bot

```
/ping
/order
/total
```

## Troubleshooting

### Bot is offline

-   Check Coolify logs for errors
-   Verify `DISCORD_TOKEN` is correct
-   Ensure the bot has been added to your Discord server

### Commands not showing

-   Run `/deploy:commands` to register slash commands
-   Wait a few minutes for Discord to propagate commands globally
-   Try kicking and re-inviting the bot

### Database connection errors

-   Verify `DATABASE_URL` is correct
-   Use the **internal** connection string (not external)
-   Check that the PostgreSQL service is running

### Migration errors

-   Migrations run automatically during deployment
-   If issues persist, check the database logs in Coolify
-   You may need to manually run: `pnpm prisma migrate deploy`

## Updating the Bot

1. Push changes to your GitHub repository
2. Coolify will automatically detect changes (if auto-deploy enabled)
3. Or manually click **Deploy** in Coolify
4. Database migrations run automatically during deployment

## Environment Variables Reference

| Variable        | Required | Description                  | Example                                   |
| --------------- | -------- | ---------------------------- | ----------------------------------------- |
| `DISCORD_TOKEN` | Yes      | Your Discord bot token       | `MTQ0MjQ5NzY0...`                         |
| `CLIENT_ID`     | Yes      | Your Discord application ID  | `1442497644135059557`                     |
| `DATABASE_URL`  | Yes      | PostgreSQL connection string | `postgresql://postgres:pass@host:5432/db` |

# Deployment Method 2: Docker Compose (Self-Hosted)

If you want to deploy on your own server using Docker Compose:

## Step 1: Clone the Repository

```bash
git clone https://github.com/Amar2Kk/phantom-manager-bot.git
cd phantom-manager-bot
```

## Step 2: Create Environment File

Create a `.env.production` file:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@db:5432/phantom_bot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=phantom_bot
```

## Step 3: Build and Start Services

```bash
# Build the Docker image
docker-compose -f docker-compose.production.yml build

# Start all services (bot + database)
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f bot
```

## Step 4: Deploy Discord Commands

```bash
# Access the bot container
docker exec -it phantom-manager-bot sh

# Inside the container, run:
pnpm run deploy:commands

# Exit the container
exit
```

## Step 5: Verify Deployment

```bash
# Check if services are running
docker-compose -f docker-compose.production.yml ps

# View bot logs
docker-compose -f docker-compose.production.yml logs bot

# View database logs
docker-compose -f docker-compose.production.yml logs db
```

## Managing Docker Deployment

### Stop Services
```bash
docker-compose -f docker-compose.production.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.production.yml restart
```

### Update Bot
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.production.yml up -d --build
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Bot only
docker-compose -f docker-compose.production.yml logs -f bot

# Database only
docker-compose -f docker-compose.production.yml logs -f db
```

### Database Backup
```bash
# Backup database
docker exec phantom-bot-db pg_dump -U postgres phantom_bot > backup.sql

# Restore database
cat backup.sql | docker exec -i phantom-bot-db psql -U postgres phantom_bot
```

---

## Build Configuration

The bot uses a multi-stage `Dockerfile` for optimal image size:

```dockerfile
# Build stage - compiles TypeScript and generates Prisma Client
FROM node:22-alpine AS builder
...

# Production stage - only includes runtime dependencies
FROM node:22-alpine AS runner
...
```

### Build Process:
1. Install dependencies with pnpm
2. Generate Prisma Client
3. Compile TypeScript to JavaScript
4. Create production image with only necessary files
5. Run migrations on startup
6. Start the bot

## Database Migrations

Migrations are stored in `prisma/migrations/` and are automatically applied during deployment.

### Manual Migration (if needed)

```bash
# SSH into Coolify container
pnpm prisma migrate deploy
```

### Check Migration Status

```bash
pnpm prisma migrate status
```

## Monitoring

-   **Logs**: Available in Coolify's application logs panel
-   **Database**: Use `prisma studio` locally to inspect data
-   **Discord**: Use `/credits-leaderboard` and log channel to monitor activity

## Scaling

This bot runs as a single instance. Discord.js handles reconnections automatically.

For multiple servers:

-   The database stores data per guild (server)
-   One bot instance can handle thousands of guilds
-   No special scaling configuration needed

## Backup

**Database Backups**:

1. Coolify can create automatic PostgreSQL backups
2. Configure in Database → Backups
3. Recommended: Daily backups with 7-day retention

**Application Backups**:

-   Your code is backed up in GitHub
-   Migration files are version-controlled

## Security Checklist

-   [ ] Discord token is kept secret (never commit to Git)
-   [ ] Database uses strong password
-   [ ] DATABASE_URL uses internal network (not exposed publicly)
-   [ ] Only admins can use sensitive commands (configured in code)
-   [ ] Regular updates to dependencies (`pnpm update`)

## Support

-   **Bot Issues**: Check application logs in Coolify
-   **Discord API**: [Discord Developer Portal](https://discord.com/developers/docs)
-   **Prisma**: [Prisma Documentation](https://www.prisma.io/docs)
-   **Coolify**: [Coolify Documentation](https://coolify.io/docs)
