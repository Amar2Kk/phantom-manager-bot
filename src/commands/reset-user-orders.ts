import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { Command } from '../types.js';
import { db } from '../utils/database.js';
import { LogService } from '../services/log-service.js';

export const resetUserOrdersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('reset-orders')
    .setDescription('Archive orders for a specific user (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose orders to archive')
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

    const targetUser = interaction.options.getUser('user', true);

    try {
      // Count current active orders for this user
      const orderCount = await db.order.count({
        where: { 
          guildId: interaction.guildId,
          assignedUserId: targetUser.id,
          archived: false
        },
      });

      if (orderCount === 0) {
        await interaction.reply({
          content: `✅ ${targetUser.username} has no active orders to reset!`,
          ephemeral: true,
        });
        return;
      }

      // Get order stats for display
      const orders = await db.order.findMany({
        where: {
          guildId: interaction.guildId,
          assignedUserId: targetUser.id,
          archived: false,
        },
      });

      const totalValue = orders.reduce((sum, order) => sum + order.price, 0);

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('⚠️ Reset User Orders')
        .setDescription(
          `This will **archive ${orderCount} order(s)** and **reset credits** for ${targetUser}.\n\n` +
          `**What happens:**\n` +
          `• All orders assigned to ${targetUser} will be archived\n` +
          `• User's credits will be reset to $0.00\n` +
          `• Archived orders can be viewed with \`/archived-orders\`\n` +
          `• Order IDs can be reused\n\n` +
          `**This action cannot be undone!**`
        )
        .addFields(
          { name: '👤 User', value: targetUser.username, inline: true },
          { name: '📦 Orders to Archive', value: orderCount.toString(), inline: true },
          { name: '💰 Total Value', value: `$${totalValue.toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'You have 30 seconds to confirm' })
        .setTimestamp();

      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_reset_user_orders')
        .setLabel('✅ Confirm Reset')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_reset_user_orders')
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

        if (buttonInteraction.customId === 'cancel_reset_user_orders') {
          await buttonInteraction.update({
            content: '✅ Reset canceled. No orders were archived.',
            embeds: [],
            components: [],
          });
          collector.stop();
          return;
        }

        if (buttonInteraction.customId === 'confirm_reset_user_orders') {
          await buttonInteraction.deferUpdate();

          // Get current credits before reset
          const currentCredits = await db.userCredit.findUnique({
            where: {
              userId_guildId: {
                userId: targetUser.id,
                guildId: interaction.guildId!,
              },
            },
          });

          const previousCredits = currentCredits?.credits || 0;

          // Archive all orders for this user
          const result = await db.order.updateMany({
            where: {
              guildId: interaction.guildId!,
              assignedUserId: targetUser.id,
              archived: false,
            },
            data: {
              archived: true,
              archivedAt: new Date(),
            },
          });

          // Reset user's credits to 0
          await db.userCredit.upsert({
            where: {
              userId_guildId: {
                userId: targetUser.id,
                guildId: interaction.guildId!,
              },
            },
            update: {
              credits: 0,
            },
            create: {
              userId: targetUser.id,
              guildId: interaction.guildId!,
              credits: 0,
            },
          });

          // Update leaderboard
          const { LeaderboardService } = await import('../services/leaderboard-service');
          await LeaderboardService.updateLeaderboard(interaction.client, interaction.guildId!);

          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ User Reset Complete')
            .setDescription(`All orders and credits for ${targetUser} have been reset!`)
            .addFields(
              { name: '👤 User', value: targetUser.username, inline: true },
              { name: '📦 Orders Archived', value: `${result.count}`, inline: true },
              { name: '💰 Previous Credits', value: `$${previousCredits.toFixed(2)}`, inline: true },
              { name: '💰 New Credits', value: '$0.00', inline: true },
              { name: '💡 Tip', value: 'Use `/archived-orders user:@user` to view archived orders', inline: false }
            )
            .setTimestamp();

          await buttonInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });

          // Log to log channel
          const logEmbed = new EmbedBuilder()
            .setColor(0xFF9900)
            .setTitle('🔄 User Reset')
            .setDescription(`Orders and credits for ${targetUser} have been reset`)
            .addFields(
              { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
              { name: '📦 Orders Archived', value: result.count.toString(), inline: true },
              { name: '💰 Credits Reset', value: `$${previousCredits.toFixed(2)} → $0.00`, inline: true },
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
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to reset user orders'}`,
        ephemeral: true,
      });
    }
  },
};

