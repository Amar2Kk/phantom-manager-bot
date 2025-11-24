import { Events, Interaction } from 'discord.js';
import { BotEvent } from '../types';
import { logger } from '../utils/logger';
import { AnalyticsService } from '../services/analytics-service';
import { GuildService } from '../services/guild-service';
import { UserService } from '../services/user-service';

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
      // Ensure user and guild exist in database
      await UserService.getOrCreate(interaction.user);
      if (interaction.guildId) {
        await GuildService.getOrCreate(interaction.guild!);
      }

      // Execute command
      await command.execute(interaction);
      
      // Log successful command execution
      await AnalyticsService.logCommand(
        interaction.commandName,
        interaction.user.id,
        interaction.guildId,
        true
      );
      
      logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      // Log failed command execution
      await AnalyticsService.logCommand(
        interaction.commandName,
        interaction.user.id,
        interaction.guildId,
        false,
        error instanceof Error ? error.message : String(error)
      );
      
      const errorMessage = 'There was an error executing this command!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

