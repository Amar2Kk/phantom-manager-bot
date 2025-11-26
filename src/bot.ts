import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from './types';
import { logger } from './utils/logger';
import { testDatabaseConnection } from './utils/database';
import { botConfig } from './config';

// Import commands
import { pingCommand } from './commands/ping';
import { infoCommand } from './commands/info';
import { orderCommand } from './commands/order';
import { orderStatusCommand } from './commands/order-status';
import { ordersCommand } from './commands/orders';
import { creditsCommand } from './commands/credits';
import { creditsLeaderboardCommand } from './commands/credits-leaderboard';
import { totalCommand } from './commands/total';
import { resetCreditsCommand } from './commands/reset-credits';
import { resetAllCreditsCommand } from './commands/reset-all-credits';

// Import events
import { readyEvent } from './events/ready';
import { interactionCreateEvent } from './events/interactionCreate';
import { modalSubmitEvent } from './events/modalSubmit';
import { buttonInteractionEvent } from './events/buttonInteraction';

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
  const commands = [
    pingCommand, 
    infoCommand,
    orderCommand,
    orderStatusCommand,
    ordersCommand,
    creditsCommand,
    creditsLeaderboardCommand,
    totalCommand,
    resetCreditsCommand,
    resetAllCreditsCommand
  ];
  
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
  
  client.on(modalSubmitEvent.name, (interaction) => 
    modalSubmitEvent.execute(client, interaction)
  );
  logger.info(`Loaded event: ${modalSubmitEvent.name} (modal submissions)`);
  
  client.on(buttonInteractionEvent.name, (interaction) => 
    buttonInteractionEvent.execute(client, interaction)
  );
  logger.info(`Loaded event: ${buttonInteractionEvent.name} (button interactions)`);

  return client;
}

export async function startBot(): Promise<void> {
  try {
    logger.info('Starting bot...');
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Please check your DATABASE_URL.');
      process.exit(1);
    }
    
    const client = createBot();
    await client.login(botConfig.token);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

