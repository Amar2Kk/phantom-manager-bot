import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { AnalyticsService } from '../services/analytics-service';

export const statsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot usage statistics')
    .addIntegerOption(option =>
      option
        .setName('days')
        .setDescription('Number of days to look back (default: 7)')
        .setMinValue(1)
        .setMaxValue(90)
        .setRequired(false)
    ) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    await interaction.deferReply();

    const days = interaction.options.getInteger('days') ?? 7;
    const commandStats = await AnalyticsService.getCommandStats(days);
    const mostActiveUsers = await AnalyticsService.getMostActiveUsers(5, days);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📊 Bot Statistics')
      .setDescription(`Statistics for the last ${days} day(s)`)
      .addFields(
        {
          name: '📈 Top Commands',
          value: commandStats.length > 0
            ? commandStats.slice(0, 5).map(stat => 
                `\`${stat.commandName}\`: ${stat._count.id} uses`
              ).join('\n')
            : 'No data yet',
          inline: false,
        },
        {
          name: '👥 Most Active Users',
          value: mostActiveUsers.length > 0
            ? mostActiveUsers.map((user, i) => 
                `${i + 1}. <@${user.userId}>: ${user._count.id} commands`
              ).join('\n')
            : 'No data yet',
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

