import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';
import { LeaderboardService } from '../services/leaderboard-service';

export const removeLeaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('remove-leaderboard')
    .setDescription('Remove the live credits leaderboard (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        ephemeral: true 
      });
      return;
    }

    // Double-check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ You need Administrator permissions to use this command!',
        ephemeral: true,
      });
      return;
    }

    try {
      await LeaderboardService.removeLeaderboardChannel(interaction.guildId);

      await interaction.reply({
        content: '✅ Live credits leaderboard removed.',
        ephemeral: true,
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to remove leaderboard'}`,
        ephemeral: true,
      });
    }
  },
};

