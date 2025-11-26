# Phantom Manager Bot

A Discord bot built with discord.js and TypeScript.

## Features

-   ✅ Built with TypeScript for type safety
-   ✅ PostgreSQL database with Prisma ORM
-   ✅ **Shop Order Management System**
    -   Create and track orders with interactive buttons
    -   Automatic credit calculation
    -   Order status workflow (Pending → Payment Received → Done/Canceled)
    -   User credits and earnings tracking
    -   Credits leaderboard
    -   Admin credit management
-   ✅ Modular command structure
-   ✅ Easy to extend with new commands
-   ✅ Development mode with hot reload

## Prerequisites

-   Node.js 18+
-   pnpm (or npm/yarn)
-   Docker (for local database) or PostgreSQL (cloud/local)
-   A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

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
    GUILD_ID=your_guild_id_here
    DATABASE_URL=postgresql://user:password@localhost:5432/phantom_bot
    NODE_ENV=development
    ```

    To get these values:

    - Go to [Discord Developer Portal](https://discord.com/developers/applications)
    - Create a new application (or select existing)
    - `DISCORD_TOKEN`: Bot → Token → Reset Token / Copy
    - `CLIENT_ID`: General Information → Application ID
    - `GUILD_ID`: Enable Developer Mode in Discord → Right-click your server → Copy ID
    - `DATABASE_URL`: See [DATABASE.md](./DATABASE.md) for setup options

5. **Set up the database:**

    **Option A: Docker (Recommended)**

    ```bash
    # Start PostgreSQL in Docker
    docker compose up -d

    # Generate Prisma Client
    pnpm db:generate

    # Push schema to database
    pnpm db:push
    ```

    **Option B: Cloud Database**

    - See [DATABASE.md](./DATABASE.md) for Supabase, Neon, or Railway setup

    📖 Full guide: [DATABASE.md](./DATABASE.md) | [DOCKER.md](./DOCKER.md)

6. **Deploy slash commands:**

    ```bash
    pnpm deploy
    ```

7. **Invite the bot to your server:**

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

### General
-   `/ping` - Check bot latency
-   `/info` - Get bot information

### Shop Order Management
-   `/order` - Create a new shop order with interactive buttons
-   `/order-status` - View an order's details
-   `/orders` - List orders (with filters)

### Credits & Earnings
-   `/total` - Quick view of your total credits
-   `/credits` - Check user credits and order statistics
-   `/credits-leaderboard` - View credits leaderboard

### Admin Commands
-   `/reset-credits` - Reset a specific user's credits (Admin only)
-   `/reset-all-credits` - Reset ALL users' credits (Admin only)

## Project Structure

```
phantom-manager-bot/
├── prisma/
│   ├── schema.prisma   # Database schema
│   ├── seed.ts         # Database seeding script
│   └── migrations/     # Migration files
├── src/
│   ├── commands/       # Slash commands
│   │   ├── ping.ts
│   │   ├── info.ts
│   │   ├── order.ts
│   │   ├── order-status.ts
│   │   ├── orders.ts
│   │   ├── credits.ts
│   │   ├── credits-leaderboard.ts
│   │   ├── total.ts
│   │   ├── reset-credits.ts
│   │   └── reset-all-credits.ts
│   ├── events/         # Event handlers
│   │   ├── ready.ts
│   │   ├── interactionCreate.ts
│   │   ├── modalSubmit.ts
│   │   └── buttonInteraction.ts
│   ├── services/       # Business logic
│   │   ├── guild-service.ts
│   │   └── order-service.ts
│   ├── utils/          # Utility functions
│   │   ├── logger.ts
│   │   └── database.ts
│   ├── bot.ts          # Bot initialization
│   ├── config.ts       # Configuration
│   ├── types.ts        # TypeScript types
│   ├── index.ts        # Entry point
│   └── deploy-commands.ts  # Command deployment script
├── .env                # Environment variables (create this)
├── .env.example        # Environment template
├── DATABASE.md         # Database setup guide
├── SHOP-GUIDE.md       # Shop system guide
├── DOCKER.md           # Docker database guide
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies
```

## Adding New Commands

1. Create a new file in `src/commands/` (e.g., `mycommand.ts`)
2. Implement the command following this structure:

```typescript
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types";

export const myCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("mycommand")
        .setDescription("Description of my command"),

    execute: async (interaction) => {
        await interaction.reply("Hello from my command!");
    },
};
```

3. Import and register the command in `src/bot.ts`:

    - Add import: `import { myCommand } from './commands/mycommand';`
    - Add to commands array: `const commands = [..., myCommand];`

4. Import and add to `src/deploy-commands.ts`:

    - Add import: `import { myCommand } from './commands/mycommand';`
    - Add to commands array: `const commands = [..., myCommand].map(...)`

5. Deploy the new command:
    ```bash
    pnpm deploy
    ```

## Scripts

### Bot Commands

-   `pnpm dev` - Run in development mode with hot reload
-   `pnpm build` - Build TypeScript to JavaScript
-   `pnpm start` - Start the built bot
-   `pnpm deploy` - Deploy slash commands to Discord
-   `pnpm lint` - Run ESLint
-   `pnpm clean` - Remove build directory

### Database Commands

-   `pnpm db:generate` - Generate Prisma Client
-   `pnpm db:push` - Push schema to database (dev)
-   `pnpm db:migrate` - Create and run migrations
-   `pnpm db:studio` - Open Prisma Studio GUI
-   `pnpm db:seed` - Seed database with test data

## License

ISC
