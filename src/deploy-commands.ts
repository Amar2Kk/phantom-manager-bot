import { REST, Routes } from 'discord.js';
import { botConfig } from './config';
import { logger } from './utils/logger';

// Import commands
import { pingCommand } from './commands/ping';
import { infoCommand } from './commands/info';

async function deployCommands() {
  const commands = [pingCommand, infoCommand].map(command => 
    command.data.toJSON()
  );

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

