import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { OrderService } from '../services/order-service';
import { OrderStatus } from '@prisma/client';

const statusMap = {
  [OrderStatus.PENDING]: { emoji: '⏳', label: 'Pending', color: 0xFFA500 },
  [OrderStatus.DONE]: { emoji: '✅', label: 'Done', color: 0x00FF00 },
  [OrderStatus.CANCELED]: { emoji: '❌', label: 'Canceled', color: 0xFF0000 },
};

export const orderStatusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('order-status')
    .setDescription('Update or view an order status')
    .addStringOption(option =>
      option
        .setName('order-id')
        .setDescription('The order ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('New status (leave empty to view current status)')
        .setRequired(false)
        .addChoices(
          { name: '⏳ Pending', value: OrderStatus.PENDING },
          { name: '✅ Done', value: OrderStatus.DONE },
          { name: '❌ Canceled', value: OrderStatus.CANCELED }
        )
    ) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        ephemeral: true 
      });
      return;
    }

    const orderId = interaction.options.getString('order-id', true);
    const newStatus = interaction.options.getString('status') as OrderStatus | null;

    try {
      // Get order
      const order = await OrderService.getOrder(orderId, interaction.guildId);

      if (!order) {
        await interaction.reply({
          content: `❌ Order "${orderId}" not found!`,
          ephemeral: true,
        });
        return;
      }

      // If no status provided, just show current order
      if (!newStatus) {
        const statusInfo = statusMap[order.status];
        const embed = new EmbedBuilder()
          .setColor(statusInfo.color)
          .setTitle(`📦 Order: ${order.orderId}`)
          .addFields(
            { name: '🎮 Game', value: order.game, inline: true },
            { name: '💰 Price', value: `$${order.price.toFixed(2)}`, inline: true },
            { name: '📊 Status', value: `${statusInfo.emoji} ${statusInfo.label}`, inline: true },
            { name: '💵 Payment', value: order.paymentReceived ? '✅ Received' : '⏳ Pending', inline: true },
            { name: '👤 Assigned To', value: `<@${order.assignedUserId}>`, inline: true },
            { name: '👨‍💼 Created By', value: `<@${order.createdBy}>`, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(order.createdAt.getTime() / 1000)}:R>`, inline: true }
          )
          .setTimestamp();

        if (order.notes) {
          embed.addFields({ name: '📝 Notes', value: order.notes });
        }

        if (order.completedAt) {
          embed.addFields({ 
            name: '✅ Completed', 
            value: `<t:${Math.floor(order.completedAt.getTime() / 1000)}:R>` 
          });
        }

        if (order.canceledAt) {
          embed.addFields({ 
            name: '❌ Canceled', 
            value: `<t:${Math.floor(order.canceledAt.getTime() / 1000)}:R>` 
          });
        }

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // Update status
      const oldStatus = order.status;
      const updatedOrder = await OrderService.updateOrderStatus(
        orderId,
        interaction.guildId,
        newStatus,
        interaction.user.id
      );

      const oldStatusInfo = statusMap[oldStatus];
      const newStatusInfo = statusMap[newStatus];

      // Get user credits after update
      const userCredits = await OrderService.getUserCredits(order.assignedUserId, interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(newStatusInfo.color)
        .setTitle('🔄 Order Status Updated')
        .addFields(
          { name: '📋 Order ID', value: updatedOrder.orderId, inline: true },
          { name: '🎮 Game', value: updatedOrder.game, inline: true },
          { name: '💰 Price', value: `$${updatedOrder.price.toFixed(2)}`, inline: true },
          { 
            name: '📊 Status Change', 
            value: `${oldStatusInfo.emoji} ${oldStatusInfo.label} → ${newStatusInfo.emoji} ${newStatusInfo.label}`,
            inline: false
          },
          { name: '👤 Assigned User', value: `<@${updatedOrder.assignedUserId}>`, inline: true },
          { name: '💳 User Credits', value: `$${userCredits?.credits.toFixed(2) || '0.00'}`, inline: true }
        )
        .setTimestamp();

      // Add credit change notification
      if (newStatus === OrderStatus.DONE && oldStatus !== OrderStatus.DONE) {
        embed.setDescription(`✅ **+$${order.price.toFixed(2)}** added to <@${order.assignedUserId}>'s credits!`);
      } else if (newStatus === OrderStatus.CANCELED && oldStatus === OrderStatus.DONE) {
        embed.setDescription(`⚠️ **-$${order.price.toFixed(2)}** deducted from <@${order.assignedUserId}>'s credits!`);
      }

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update order'}`,
        ephemeral: true,
      });
    }
  },
};

