import { REST, Routes } from 'discord.js';
import { botConfig } from './config.js';
import { logger } from './utils/logger.js';

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
import { deleteOrderCommand } from './commands/delete-order.js';

async function deployCommands() {
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
    deleteUserCommand,
    deleteOrderCommand
  ].map(command => command.data.toJSON());

  const rest = new REST().setToken(botConfig.token);

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // Deploy to specific guild (faster for development)
    if (botConfig.guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
        { body: commands }
      ) as unknown[];

      logger.info(`Successfully reloaded ${data.length} guild commands.`);
    } else {
      // Deploy globally (takes up to an hour to update)
      const data = await rest.put(
        Routes.applicationCommands(botConfig.clientId),
        { body: commands }
      ) as unknown[];

      logger.info(`Successfully reloaded ${data.length} global commands.`);
    }
  } catch (error) {
    logger.error('Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();

