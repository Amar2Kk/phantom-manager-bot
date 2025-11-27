import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types.js';
import { OrderService } from '../services/order-service.js';

export const totalCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('total')
    .setDescription('View your total credits'),
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        flags: ['Ephemeral'] 
      });
      return;
    }

    try {
      // Get user credits
      const userCredits = await OrderService.getUserCredits(
        interaction.user.id, 
        interaction.guildId
      );
      
      const credits = userCredits?.credits || 0;

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Your Total Credits')
        .setDescription(`**$${credits.toFixed(2)}**`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: `Use /credits for detailed statistics` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to fetch credits'}`,
        flags: ['Ephemeral'],
      });
    }
  },
};

