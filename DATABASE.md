# Database Setup Guide

This bot uses **PostgreSQL** with **Prisma ORM** for type-safe database operations.

## Table of Contents
- [Quick Start](#quick-start)
- [Database Options](#database-options)
- [Schema Overview](#schema-overview)
- [Database Operations](#database-operations)
- [Migrations](#migrations)

## Quick Start

### 1. Choose Your Database

You have several options:

#### Option A: Local PostgreSQL (Development)

Install PostgreSQL locally:
- **macOS**: `brew install postgresql`
- **Ubuntu**: `sudo apt install postgresql`
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

Create a database:
```bash
psql postgres
CREATE DATABASE phantom_bot;
CREATE USER phantom_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE phantom_bot TO phantom_user;
\q
```

Your DATABASE_URL:
```
DATABASE_URL="postgresql://phantom_user:your_password@localhost:5432/phantom_bot"
```

#### Option B: Supabase (Free Cloud Database)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (Transaction mode)
5. Replace `[YOUR-PASSWORD]` with your database password

Your DATABASE_URL:
```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
```

#### Option C: Neon (Free Serverless PostgreSQL)

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

Your DATABASE_URL:
```
DATABASE_URL="postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require"
```

#### Option D: Railway (Free Tier)

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL database
4. Copy the DATABASE_URL from variables

### 2. Configure Environment

Add to your `.env` file:
```env
DATABASE_URL="your_connection_string_here"
```

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Push Schema to Database

For development (no migrations):
```bash
pnpm db:push
```

Or create a migration:
```bash
pnpm db:migrate
```

### 5. (Optional) Seed Test Data

```bash
pnpm db:seed
```

## Schema Overview

### Models

#### Guild
Stores Discord server settings and configuration.

```typescript
{
  id: string        // Discord Guild ID
  name: string      // Guild name
  prefix: string    // Command prefix (default: "!")
  settings: Json?   // Custom settings
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### User
Stores global user data across all guilds.

```typescript
{
  id: string        // Discord User ID
  username: string  // Username
  globalXp: number  // Global XP (default: 0)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### GuildUser
Stores user data specific to each guild (levels, XP, warnings).

```typescript
{
  userId: string    // Discord User ID
  guildId: string   // Discord Guild ID
  xp: number        // Guild-specific XP
  level: number     // Current level
  messages: number  // Message count
  warnings: number  // Warning count
  settings: Json?   // User settings for this guild
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### CommandUsage
Tracks command executions for analytics.

```typescript
{
  commandName: string
  userId: string
  guildId: string?
  success: boolean
  error: string?
  executedAt: DateTime
}
```

#### CustomResponse
Custom auto-responses for guilds.

```typescript
{
  guildId: string
  trigger: string    // Trigger phrase
  response: string   // Bot response
  isRegex: boolean   // Is trigger a regex?
  enabled: boolean
  createdBy: string  // User ID who created it
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### ModerationLog
Logs moderation actions.

```typescript
{
  guildId: string
  userId: string     // User being moderated
  moderator: string  // Moderator ID
  action: string     // ban, kick, warn, mute, etc.
  reason: string?
  duration: number?  // Duration in minutes
  createdAt: DateTime
}
```

## Database Operations

### Using Services

The bot includes pre-built services for common operations:

#### GuildService

```typescript
import { GuildService } from './services/guild-service';

// Get or create guild
const guild = await GuildService.getOrCreate(discordGuild);

// Update prefix
await GuildService.updatePrefix(guildId, '?');

// Get settings
const settings = await GuildService.getSettings(guildId);

// Update settings
await GuildService.updateSettings(guildId, { welcomeChannel: '123' });
```

#### UserService

```typescript
import { UserService } from './services/user-service';

// Get or create user
const user = await UserService.getOrCreate(discordUser);

// Add XP and check for level up
const result = await UserService.addXp(userId, guildId, 25);
if (result.leveledUp) {
  // User leveled up!
  console.log(`Level ${result.level}!`);
}

// Get leaderboard
const leaderboard = await UserService.getLeaderboard(guildId, 10);

// Add warning
await UserService.addWarning(userId, guildId);
```

#### AnalyticsService

```typescript
import { AnalyticsService } from './services/analytics-service';

// Log command usage
await AnalyticsService.logCommand('ping', userId, guildId, true);

// Get command statistics
const stats = await AnalyticsService.getCommandStats(7); // Last 7 days

// Get most active users
const activeUsers = await AnalyticsService.getMostActiveUsers(10, 30);
```

### Direct Prisma Queries

For custom queries, use the Prisma client directly:

```typescript
import { db } from './utils/database';

// Find unique
const user = await db.user.findUnique({
  where: { id: userId }
});

// Find many with filters
const warnings = await db.guildUser.findMany({
  where: {
    guildId: guildId,
    warnings: { gt: 3 }
  },
  include: {
    user: true
  }
});

// Create
await db.moderationLog.create({
  data: {
    guildId,
    userId,
    moderator: modId,
    action: 'warn',
    reason: 'Spam'
  }
});

// Update
await db.guild.update({
  where: { id: guildId },
  data: { prefix: '!' }
});

// Delete
await db.customResponse.delete({
  where: { id: responseId }
});
```

## Migrations

### Development Workflow

1. **Modify Schema**: Edit `prisma/schema.prisma`
2. **Create Migration**: `pnpm db:migrate`
3. **Name Migration**: Give it a descriptive name
4. **Generated Files**: Migration SQL files created in `prisma/migrations/`

### Push Without Migration (Development)

For rapid development without creating migration files:

```bash
pnpm db:push
```

This syncs your schema directly to the database.

### Production Deployment

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
npx prisma migrate deploy
```

## Prisma Studio

Prisma Studio is a GUI for viewing and editing your database:

```bash
pnpm db:studio
```

Opens at http://localhost:5555

## Common Tasks

### Reset Database

```bash
# Delete all data and reset
npx prisma migrate reset

# Or just push schema again
pnpm db:push --force-reset
```

### View Database

```bash
pnpm db:studio
```

### Format Schema

```bash
npx prisma format
```

### Check Schema

```bash
npx prisma validate
```

## Troubleshooting

### "Can't reach database server"
- Check if PostgreSQL is running
- Verify DATABASE_URL is correct
- Check firewall/network settings
- For cloud databases, verify IP whitelist

### "Column does not exist"
- Run `pnpm db:push` or `pnpm db:migrate`
- Regenerate client: `pnpm db:generate`

### "Unique constraint failed"
- You're trying to create a duplicate record
- Check unique fields in schema
- Use `upsert` instead of `create`

### "Type errors after schema changes"
- Regenerate Prisma Client: `pnpm db:generate`
- Restart TypeScript server in your editor

## Best Practices

1. **Always use services** for common operations
2. **Use transactions** for related operations:
   ```typescript
   await db.$transaction([
     db.user.create({ data: {...} }),
     db.guildUser.create({ data: {...} })
   ]);
   ```
3. **Index frequently queried fields** (already done in schema)
4. **Use `select` to limit returned fields** for performance
5. **Handle errors gracefully** in production

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)

