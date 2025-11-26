import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from './types.js';
import { logger } from './utils/logger.js';
import { testDatabaseConnection } from './utils/database.js';
import { botConfig } from './config.js';

// Import commands
import { pingCommand } from './commands/ping.js';
import { infoCommand } from './commands/info.js';
import { orderCommand } from './commands/order.js';
import { orderStatusCommand } from './commands/order-status.js';
import { ordersCommand } from './commands/orders.js';
import { creditsCommand } from './commands/credits.js';
import { creditsLeaderboardCommand } from './commands/credits-leaderboard.js';
import { totalCommand } from './commands/total.js';
import { resetCreditsCommand } from './commands/reset-credits.js';
import { resetAllCreditsCommand } from './commands/reset-all-credits.js';
import { setLeaderboardCommand } from './commands/set-leaderboard.js';
import { removeLeaderboardCommand } from './commands/remove-leaderboard.js';
import { setLogChannelCommand } from './commands/set-log-channel.js';
import { removeLogChannelCommand } from './commands/remove-log-channel.js';
import { resetOrdersCommand } from './commands/reset-orders.js';
import { resetUserOrdersCommand } from './commands/reset-user-orders.js';
import { archivedOrdersCommand } from './commands/archived-orders.js';
import { clearMessagesCommand } from './commands/clearmessages.js';
import { deleteUserCommand } from './commands/delete-user.js';

// Import events
import { readyEvent } from './events/ready.js';
import { interactionCreateEvent } from './events/interactionCreate.js';
import { modalSubmitEvent } from './events/modalSubmit.js';
import { buttonInteractionEvent } from './events/buttonInteraction.js';
import { guildCreateEvent } from './events/guildCreate.js';

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
    resetAllCreditsCommand,
    setLeaderboardCommand,
    removeLeaderboardCommand,
    setLogChannelCommand,
    removeLogChannelCommand,
    resetOrdersCommand,
    resetUserOrdersCommand,
    archivedOrdersCommand,
    clearMessagesCommand,
    deleteUserCommand
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
  
  client.on(guildCreateEvent.name, (guild) => 
    guildCreateEvent.execute(client, guild)
  );
  logger.info(`Loaded event: ${guildCreateEvent.name} (guild join)`);

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

