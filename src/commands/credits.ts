import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types.js';
import { OrderService } from '../services/order-service.js';

export const creditsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Check credits and order statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check (default: yourself)')
        .setRequired(false)
    ) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        flags: ['Ephemeral'] 
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;

    await interaction.deferReply();

    try {
      // Get user credits
      const userCredits = await OrderService.getUserCredits(targetUser.id, interaction.guildId);
      
      // Get user order stats
      const stats = await OrderService.getUserOrderStats(targetUser.id, interaction.guildId);

      const credits = userCredits?.credits || 0;

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`💰 ${targetUser.username}'s Credits & Stats`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '💳 Total Credits', value: `$${credits.toFixed(2)}`, inline: true },
          { name: '📦 Total Orders', value: `${stats.total}`, inline: true },
          { name: '✅ Completed', value: `${stats.completed}`, inline: true },
          { name: '⏳ Pending', value: `${stats.pending}`, inline: true },
          { name: '💵 Payment Received', value: `${stats.paymentReceived}`, inline: true },
          { name: '❌ Canceled', value: `${stats.canceled}`, inline: true }
        )
        .setTimestamp();

      // Calculate completion rate
      if (stats.total > 0) {
        const completionRate = ((stats.completed / stats.total) * 100).toFixed(1);
        embed.addFields({ 
          name: '📊 Completion Rate', 
          value: `${completionRate}%`,
          inline: true 
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to fetch credits'}`,
      });
    }
  },
};

