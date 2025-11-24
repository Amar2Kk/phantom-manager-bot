import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { UserService } from '../services/user-service';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the XP leaderboard for this server')
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') ?? 10;
    const leaderboard = await UserService.getLeaderboard(interaction.guildId, limit);

    if (leaderboard.length === 0) {
      await interaction.editReply('No users found in the leaderboard yet!');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆 XP Leaderboard')
      .setDescription(
        leaderboard
          .map((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} **${entry.user.username}**\n   Level ${entry.level} • ${entry.xp} XP • ${entry.messages} messages`;
          })
          .join('\n\n')
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

