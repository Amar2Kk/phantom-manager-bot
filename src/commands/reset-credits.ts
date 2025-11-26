import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';
import { db } from '../utils/database';

export const resetCreditsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('reset-credits')
    .setDescription('Reset a user\'s credits to zero (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose credits to reset')
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

    const targetUser = interaction.options.getUser('user', true);

    try {
      // Get current credits
      const currentCredits = await db.userCredit.findUnique({
        where: {
          userId_guildId: {
            userId: targetUser.id,
            guildId: interaction.guildId,
          },
        },
      });

      if (!currentCredits || currentCredits.credits === 0) {
        await interaction.reply({
          content: `${targetUser.username} already has $0.00 credits.`,
          ephemeral: true,
        });
        return;
      }

      const previousAmount = currentCredits.credits;

      // Reset credits to 0
      await db.userCredit.update({
        where: {
          userId_guildId: {
            userId: targetUser.id,
            guildId: interaction.guildId,
          },
        },
        data: {
          credits: 0,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🔄 Credits Reset')
        .setDescription(`Successfully reset <@${targetUser.id}>'s credits`)
        .addFields(
          { name: '👤 User', value: targetUser.username, inline: true },
          { name: '💰 Previous Amount', value: `$${previousAmount.toFixed(2)}`, inline: true },
          { name: '💳 New Amount', value: '$0.00', inline: true },
          { name: '👨‍💼 Reset By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to reset credits'}`,
        ephemeral: true,
      });
    }
  },
};

