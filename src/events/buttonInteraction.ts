import { 
  Events, 
  Interaction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { BotEvent } from '../types';
import { OrderService } from '../services/order-service';
import { OrderStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const statusMap = {
  [OrderStatus.PENDING]: { emoji: '⏳', label: 'Pending', color: 0xFFA500 },
  [OrderStatus.PAYMENT_RECEIVED]: { emoji: '💵', label: 'Payment Received', color: 0x00BFFF },
  [OrderStatus.DONE]: { emoji: '✅', label: 'Done', color: 0x00FF00 },
  [OrderStatus.CANCELED]: { emoji: '❌', label: 'Canceled', color: 0xFF0000 },
};

export const buttonInteractionEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.guildId) return;

    // Handle order status buttons
    if (interaction.customId.startsWith('order_payment_')) {
      await handleOrderStatusUpdate(interaction, OrderStatus.PAYMENT_RECEIVED);
    } else if (interaction.customId.startsWith('order_done_')) {
      await handleOrderStatusUpdate(interaction, OrderStatus.DONE);
    } else if (interaction.customId.startsWith('order_cancel_')) {
      await handleOrderStatusUpdate(interaction, OrderStatus.CANCELED);
    }
  },
};

async function handleOrderStatusUpdate(
  interaction: any,
  newStatus: OrderStatus
) {
  const orderId = interaction.customId.split('_').slice(2).join('_');
  
  try {
    await interaction.deferUpdate();

    // Get current order
    const order = await OrderService.getOrder(orderId, interaction.guildId);

    if (!order) {
      await interaction.followUp({
        content: `❌ Order "${orderId}" not found!`,
        ephemeral: true,
      });
      return;
    }

    const oldStatus = order.status;

    // Don't update if already in this status
    if (oldStatus === newStatus) {
      await interaction.followUp({
        content: `ℹ️ Order is already marked as ${statusMap[newStatus].label}`,
        ephemeral: true,
      });
      return;
    }

    // Update order status
    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      interaction.guildId,
      newStatus,
      interaction.user.id
    );

    // Get user credits after update
    const userCredits = await OrderService.getUserCredits(
      order.assignedUserId,
      interaction.guildId
    );

    const statusInfo = statusMap[newStatus];

    // Create updated embed
    const embed = new EmbedBuilder()
      .setColor(statusInfo.color)
      .setTitle('📦 Order Status Updated')
      .addFields(
        { name: '📋 Order ID', value: updatedOrder.orderId, inline: true },
        { name: '🎮 Game', value: updatedOrder.game, inline: true },
        { name: '💰 Price', value: `$${updatedOrder.price.toFixed(2)}`, inline: true },
        { name: '👤 Assigned To', value: `<@${updatedOrder.assignedUserId}>`, inline: true },
        { name: '📊 Status', value: `${statusInfo.emoji} ${statusInfo.label}`, inline: true },
        { name: '🔄 Updated By', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    // Add credit notification
    if (newStatus === OrderStatus.DONE && oldStatus !== OrderStatus.DONE) {
      embed.setDescription(`✅ **+$${order.price.toFixed(2)}** added to <@${order.assignedUserId}>'s credits!`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    } else if (newStatus === OrderStatus.CANCELED && oldStatus === OrderStatus.DONE) {
      embed.setDescription(`⚠️ **-$${order.price.toFixed(2)}** deducted from <@${order.assignedUserId}>'s credits!`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    }

    if (updatedOrder.notes) {
      embed.addFields({ name: '📝 Notes', value: updatedOrder.notes });
    }

    // Create new buttons based on current status
    let buttons: ButtonBuilder[] = [];

    // Payment Received button - always show unless already in that state
    if (newStatus !== OrderStatus.PAYMENT_RECEIVED) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`order_payment_${orderId}`)
          .setLabel('💵 Payment Received')
          .setStyle(ButtonStyle.Primary)
      );
    }

    // Done button - always show unless already in that state
    if (newStatus !== OrderStatus.DONE) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`order_done_${orderId}`)
          .setLabel('✅ Mark as Done')
          .setStyle(ButtonStyle.Success)
      );
    }

    // Cancel button - always show unless already in that state
    if (newStatus !== OrderStatus.CANCELED) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`order_cancel_${orderId}`)
          .setLabel('❌ Cancel Order')
          .setStyle(ButtonStyle.Danger)
      );
    }

    // Update footer based on status - no buttons are ever disabled
    embed.setFooter({ text: 'Click buttons below to update status' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    await interaction.editReply({ 
      embeds: [embed], 
      components: buttons.length > 0 ? [row] : [] 
    });

    logger.info(
      `Order ${orderId} status updated from ${oldStatus} to ${newStatus} by ${interaction.user.tag}`
    );

  } catch (error) {
    logger.error('Error updating order status:', error);
    await interaction.followUp({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update order'}`,
      ephemeral: true,
    });
  }
}

