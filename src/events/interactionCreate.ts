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
      
      try {
        const errorMessage = 'There was an error executing this command!';
        
        // Check if interaction has been responded to in any way
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          // Modal interactions don't need a reply
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch (replyError) {
        // Interaction already handled or expired, just log it
        logger.error('Could not send error message to user:', replyError);
      }
    }
  },
};

