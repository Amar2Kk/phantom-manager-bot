# Quick Setup Guide

## Step 1: Create a Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give your bot a name (e.g., "Phantom Manager")
4. Go to the "Bot" section in the left sidebar
5. Click "Reset Token" and copy the token
6. Enable these Privileged Gateway Intents:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

## Step 2: Get Your IDs

1. **Get Client ID:**
   - Go to "General Information" in the left sidebar
   - Copy the "Application ID"

2. **Get Guild ID (Server ID):**
   - Open Discord
   - Enable Developer Mode: Settings → Advanced → Developer Mode
   - Right-click your server → Copy ID

## Step 3: Configure Environment

Create a `.env` file in the project root:

```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

## Step 4: Deploy Commands

```bash
pnpm deploy
```

## Step 5: Invite Bot to Server

Replace `YOUR_CLIENT_ID` with your actual Client ID:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## Step 6: Start the Bot

**Development (with hot reload):**
```bash
pnpm dev
```

**Production:**
```bash
pnpm build
pnpm start
```

## Troubleshooting

### Bot doesn't respond to commands
- Make sure you ran `pnpm deploy` after creating commands
- Check that the bot has proper permissions in your server
- Verify your `.env` file has the correct values

### "Invalid Token" error
- Double-check your `DISCORD_TOKEN` in `.env`
- Make sure there are no extra spaces or quotes
- Try resetting the token in the Discord Developer Portal

### Commands not showing up
- If using `GUILD_ID`, commands should appear instantly
- Without `GUILD_ID`, global commands take up to 1 hour to register
- Try restarting Discord (Ctrl+R or Cmd+R)

## Next Steps

- Add more commands in `src/commands/`
- Customize bot behavior in `src/events/`
- Check the README.md for detailed documentation

