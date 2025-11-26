import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types.js';
import { OrderService } from '../services/order-service.js';

export const creditsLeaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('credits-leaderboard')
    .setDescription('Show the credits leaderboard (Admin only)')
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
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

    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') || 10;

    try {
      const leaderboard = await OrderService.getCreditsLeaderboard(interaction.guildId, limit);

      if (leaderboard.length === 0) {
        await interaction.editReply('No users with credits found yet!');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Credits Leaderboard')
        .setDescription(
          leaderboard
            .map((entry, index) => {
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
              return `${medal} <@${entry.userId}> - **$${entry.credits.toFixed(2)}**`;
            })
            .join('\n')
        )
        .setFooter({ text: `Top ${leaderboard.length} earners` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to fetch leaderboard'}`,
      });
    }
  },
};

