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
import { db } from '../utils/database.js';
import { LogService } from '../services/log-service.js';

export const resetOrdersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('reset-all-orders')
    .setDescription('Archive all current orders for a fresh start (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        ephemeral: true 
      });
      return;
    }

    try {
      // Count current active orders
      const orderCount = await db.order.count({
        where: { 
          guildId: interaction.guildId,
          archived: false
        },
      });

      if (orderCount === 0) {
        await interaction.reply({
          content: '✅ There are no active orders to reset!',
          ephemeral: true,
        });
        return;
      }

      // Get credit stats
      const userCredits = await db.userCredit.findMany({
        where: { guildId: interaction.guildId },
      });
      const totalCredits = userCredits.reduce((sum, uc) => sum + uc.credits, 0);
      const usersWithCredits = userCredits.filter(uc => uc.credits > 0).length;

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('⚠️ Reset All Orders & Credits')
        .setDescription(
          `This will **archive ${orderCount} order(s)** and **reset all credits**.\n\n` +
          `**What happens:**\n` +
          `• All current orders will be archived\n` +
          `• ALL user credits will be reset to $0.00\n` +
          `• Archived orders can be viewed with \`/archived-orders\`\n` +
          `• Order IDs can be reused\n\n` +
          `**This action cannot be undone!**`
        )
        .addFields(
          { name: '📦 Orders to Archive', value: orderCount.toString(), inline: true },
          { name: '👥 Users with Credits', value: usersWithCredits.toString(), inline: true },
          { name: '💰 Total Credits', value: `$${totalCredits.toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'You have 30 seconds to confirm' })
        .setTimestamp();

      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_reset_orders')
        .setLabel('✅ Confirm Reset')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_reset_orders')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton, confirmButton);

      const response = await interaction.reply({
        embeds: [confirmEmbed],
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

        if (buttonInteraction.customId === 'cancel_reset_orders') {
          await buttonInteraction.update({
            content: '✅ Reset canceled. No orders were archived.',
            embeds: [],
            components: [],
          });
          collector.stop();
          return;
        }

        if (buttonInteraction.customId === 'confirm_reset_orders') {
          await buttonInteraction.deferUpdate();

          // Archive all orders
          const result = await db.order.updateMany({
            where: {
              guildId: interaction.guildId!,
              archived: false,
            },
            data: {
              archived: true,
              archivedAt: new Date(),
            },
          });

          // Reset all credits
          const creditResult = await db.userCredit.updateMany({
            where: {
              guildId: interaction.guildId!,
            },
            data: {
              credits: 0,
            },
          });

          // Update leaderboard
          const { LeaderboardService } = await import('../services/leaderboard-service');
          await LeaderboardService.updateLeaderboard(interaction.client, interaction.guildId!);

          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Complete Reset Successful')
            .setDescription('All orders have been archived and all credits have been reset!')
            .addFields(
              { name: '📦 Orders Archived', value: `${result.count}`, inline: true },
              { name: '👥 Users Reset', value: `${creditResult.count}`, inline: true },
              { name: '💡 Tip', value: 'Use `/archived-orders` to view archived orders', inline: false }
            )
            .setTimestamp();

          await buttonInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });

          // Log to log channel
          const logEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔄 Complete Reset')
            .setDescription(`All orders and credits have been reset`)
            .addFields(
              { name: '📦 Orders Archived', value: result.count.toString(), inline: true },
              { name: '👥 Users Reset', value: creditResult.count.toString(), inline: true },
              { name: '👨‍💼 Reset By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

          await LogService.sendLog(interaction.client, interaction.guildId!, logEmbed);

          collector.stop();
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: '⏱️ Confirmation timed out. No orders were archived.',
            embeds: [],
            components: [],
          });
        }
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to reset orders'}`,
        ephemeral: true,
      });
    }
  },
};

