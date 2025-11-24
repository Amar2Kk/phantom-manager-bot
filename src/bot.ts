import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from './types';
import { logger } from './utils/logger';
import { botConfig } from './config';

// Import commands
import { pingCommand } from './commands/ping';
import { infoCommand } from './commands/info';

// Import events
import { readyEvent } from './events/ready';
import { interactionCreateEvent } from './events/interactionCreate';

// Extend the Client type to include commands
declare module 'discord.js' {
  interface Client {
    commands?: Collection<string, Command>;
  }
}

export function createBot(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Initialize commands collection
  client.commands = new Collection<string, Command>();

  // Register commands
  const commands = [pingCommand, infoCommand];
  
  for (const command of commands) {
    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  }

  // Register events
  client.once(readyEvent.name, (readyClient) => readyEvent.execute(client, readyClient));
  logger.info(`Loaded event: ${readyEvent.name}`);
  
  client.on(interactionCreateEvent.name, (interaction) => 
    interactionCreateEvent.execute(client, interaction)
  );
  logger.info(`Loaded event: ${interactionCreateEvent.name}`);

  return client;
}

export async function startBot(): Promise<void> {
  try {
    logger.info('Starting bot...');
    const client = createBot();
    await client.login(botConfig.token);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

