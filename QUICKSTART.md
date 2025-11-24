# Quick Start Guide

Get your Discord bot running in 5 minutes!

## 1️⃣ Database Setup (Choose One)

### Supabase (Easiest - Recommended)
1. Create account at [supabase.com](https://supabase.com)
2. New Project → Copy connection string
3. Add to `.env`: `DATABASE_URL="postgresql://postgres:...@...supabase.co:5432/postgres"`

### Local PostgreSQL
```bash
brew install postgresql  # macOS
psql postgres -c "CREATE DATABASE phantom_bot;"
```
Add to `.env`: `DATABASE_URL="postgresql://localhost:5432/phantom_bot"`

## 2️⃣ Discord Bot Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. New Application → Name it
3. Bot tab → Reset Token → Copy token
4. Enable these intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. General Information → Copy Application ID

## 3️⃣ Environment Variables

Create `.env` file:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here
DATABASE_URL=your_database_url_here
NODE_ENV=development
```

## 4️⃣ Initialize Database

```bash
pnpm db:generate
pnpm db:push
```

## 5️⃣ Deploy & Start

```bash
pnpm deploy  # Register commands
pnpm dev     # Start bot
```

## 6️⃣ Invite Bot

Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## ✅ Done!

Try `/ping` in your Discord server!

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- Read [DATABASE.md](./DATABASE.md) for database guide
- Add more commands in `src/commands/`
- Customize bot behavior

## 🆘 Need Help?

- Database issues → See [DATABASE.md](./DATABASE.md)
- Bot setup issues → See [SETUP.md](./SETUP.md)
- No response to commands? Check bot permissions and make sure you ran `pnpm deploy`

