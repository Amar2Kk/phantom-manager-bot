# Phantom Manager Bot

A Discord bot built with discord.js and TypeScript.

## Features

- Built with TypeScript for type safety
- Modular command structure
- Event handling system
- Easy to extend with new commands
- Development mode with hot reload

## Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

## Setup

1. **Clone the repository** (if not already done)

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Create a `.env` file** in the root directory:
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here  # Optional: for faster command deployment during development
   ```

   To get these values:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application (or select existing)
   - `DISCORD_TOKEN`: Bot → Token → Reset Token / Copy
   - `CLIENT_ID`: General Information → Application ID
   - `GUILD_ID`: Enable Developer Mode in Discord → Right-click your server → Copy ID

5. **Deploy slash commands:**
   ```bash
   pnpm deploy
   ```

6. **Invite the bot to your server:**
   
   Use this URL (replace `YOUR_CLIENT_ID`):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```

## Development

**Run in development mode** (with hot reload):
```bash
pnpm dev
```

## Production

**Build the project:**
```bash
pnpm build
```

**Start the bot:**
```bash
pnpm start
```

## Available Commands

- `/ping` - Check bot latency
- `/info` - Get bot information

## Project Structure

```
phantom-manager-bot/
├── src/
│   ├── commands/       # Slash commands
│   │   ├── ping.ts
│   │   └── info.ts
│   ├── events/         # Event handlers
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── utils/          # Utility functions
│   │   └── logger.ts
│   ├── bot.ts          # Bot initialization
│   ├── config.ts       # Configuration
│   ├── types.ts        # TypeScript types
│   ├── index.ts        # Entry point
│   └── deploy-commands.ts  # Command deployment script
├── .env                # Environment variables (create this)
├── .env.example        # Environment template
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies
```

## Adding New Commands

1. Create a new file in `src/commands/` (e.g., `mycommand.ts`)
2. Implement the command following this structure:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';

export const myCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description of my command'),
  
  execute: async (interaction) => {
    await interaction.reply('Hello from my command!');
  },
};
```

3. Import and register the command in `src/bot.ts`:
   - Add import: `import { myCommand } from './commands/mycommand';`
   - Add to commands array: `const commands = [pingCommand, infoCommand, myCommand];`

4. Import and add to `src/deploy-commands.ts`:
   - Add import: `import { myCommand } from './commands/mycommand';`
   - Add to commands array: `const commands = [pingCommand, infoCommand, myCommand].map(...)`

5. Deploy the new command:
   ```bash
   pnpm deploy
   ```

## Scripts

- `pnpm dev` - Run in development mode with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start the built bot
- `pnpm deploy` - Deploy slash commands to Discord
- `pnpm lint` - Run ESLint
- `pnpm clean` - Remove build directory

## License

ISC

