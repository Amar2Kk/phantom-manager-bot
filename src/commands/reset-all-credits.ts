import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { Command } from '../types';
import { db } from '../utils/database';

export const resetAllCreditsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('reset-all-credits')
    .setDescription('Reset ALL users\' credits to zero (Admin only - USE WITH CAUTION)')
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
      // Get count of users with credits
      const usersWithCredits = await db.userCredit.count({
        where: {
          guildId: interaction.guildId,
          credits: {
            not: 0,
          },
        },
      });

      if (usersWithCredits === 0) {
        await interaction.reply({
          content: '✅ All users already have $0.00 credits.',
          ephemeral: true,
        });
        return;
      }

      // Get total credits that will be reset
      const allCredits = await db.userCredit.findMany({
        where: {
          guildId: interaction.guildId,
        },
      });

      const totalAmount = allCredits.reduce((sum, user) => sum + user.credits, 0);

      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_reset_all')
        .setLabel('Yes, Reset All Credits')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_reset_all')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton, confirmButton);

      const warningEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⚠️ CONFIRM RESET ALL CREDITS')
        .setDescription(
          '**This action will reset ALL users\' credits to $0.00!**\n\n' +
          'This action **CANNOT** be undone!'
        )
        .addFields(
          { name: '👥 Users Affected', value: `${usersWithCredits}`, inline: true },
          { name: '💰 Total Credits', value: `$${totalAmount.toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'You have 30 seconds to confirm' });

      const response = await interaction.reply({
        embeds: [warningEmbed],
        components: [row],
        ephemeral: true,
      });

      // Wait for button interaction
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000, // 30 seconds
      });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: '❌ Only the command user can confirm this action!',
            ephemeral: true,
          });
          return;
        }

        if (buttonInteraction.customId === 'cancel_reset_all') {
          await buttonInteraction.update({
            content: '✅ Reset canceled. No credits were changed.',
            embeds: [],
            components: [],
          });
          collector.stop();
          return;
        }

        if (buttonInteraction.customId === 'confirm_reset_all') {
          await buttonInteraction.deferUpdate();

          // Reset all credits
          const result = await db.userCredit.updateMany({
            where: {
              guildId: interaction.guildId!,
            },
            data: {
              credits: 0,
            },
          });

          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ All Credits Reset')
            .setDescription('Successfully reset all users\' credits to $0.00')
            .addFields(
              { name: '👥 Users Reset', value: `${result.count}`, inline: true },
              { name: '💰 Total Amount Reset', value: `$${totalAmount.toFixed(2)}`, inline: true },
              { name: '👨‍💼 Reset By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

          await buttonInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });

          collector.stop();
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: '⏱️ Confirmation timed out. No credits were changed.',
            embeds: [],
            components: [],
          });
        }
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to reset credits'}`,
        ephemeral: true,
      });
    }
  },
};

