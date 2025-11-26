import { Events, Interaction } from 'discord.js';
import { BotEvent } from '../types';
import { logger } from '../utils/logger';

export const interactionCreateEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    try {
      // Execute command
      await command.execute(interaction);
      
      logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      const errorMessage = 'There was an error executing this command!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

