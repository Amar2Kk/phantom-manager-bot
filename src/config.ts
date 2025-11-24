import { config } from 'dotenv';

config();

interface BotConfig {
  token: string;
  clientId: string;
  guildId?: string;
}

function validateConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token) {
    throw new Error('DISCORD_TOKEN is required in .env file');
  }

  if (!clientId) {
    throw new Error('CLIENT_ID is required in .env file');
  }

  return {
    token,
    clientId,
    guildId,
  };
}

export const botConfig = validateConfig();

