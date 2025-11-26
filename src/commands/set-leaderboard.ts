import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Command } from '../types.js';
import { LeaderboardService } from '../services/leaderboard-service.js';

export const setLeaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('set-leaderboard')
    .setDescription('Set the channel for live credits leaderboard (Admin only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to display the leaderboard')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
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

    const channel = interaction.options.getChannel('channel', true);

    try {
      await LeaderboardService.setLeaderboardChannel(interaction.guildId, channel.id);
      
      // Create initial leaderboard
      await LeaderboardService.updateLeaderboard(interaction.client, interaction.guildId);

      await interaction.reply({
        content: `✅ Live credits leaderboard set to <#${channel.id}>!\n\nThe leaderboard will update automatically whenever credits change.`,
        ephemeral: true,
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to set leaderboard channel'}`,
        ephemeral: true,
      });
    }
  },
};

