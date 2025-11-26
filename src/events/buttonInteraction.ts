import { 
  Events, 
  Interaction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { BotEvent } from '../types.js';
import { OrderService } from '../services/order-service.js';
import { OrderStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { LogService } from '../services/log-service.js';

const statusMap = {
  [OrderStatus.PENDING]: { emoji: '⏳', label: 'Pending', color: 0xFFA500 },
  [OrderStatus.DONE]: { emoji: '✅', label: 'Done', color: 0x00FF00 },
  [OrderStatus.CANCELED]: { emoji: '❌', label: 'Canceled', color: 0xFF0000 },
};

export const buttonInteractionEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.guildId) return;

    // Handle order buttons
    if (interaction.customId.startsWith('order_payment_')) {
      await handlePaymentToggle(interaction);
    } else if (interaction.customId.startsWith('order_done_')) {
      await handleOrderStatusUpdate(interaction, OrderStatus.DONE);
    } else if (interaction.customId.startsWith('order_cancel_')) {
      await handleOrderStatusUpdate(interaction, OrderStatus.CANCELED);
    }
  },
};

async function handlePaymentToggle(interaction: any) {
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

    // Toggle payment status
    const updatedOrder = await OrderService.togglePaymentReceived(
      orderId,
      interaction.guildId,
      interaction.user.id
    );

    // Update the embed
    await updateOrderEmbed(interaction, updatedOrder);

    logger.info(
      `Order ${orderId} payment status toggled to ${updatedOrder.paymentReceived} by ${interaction.user.tag}`
    );

    // Log to log channel
    await LogService.logPaymentToggle(
      interaction.client,
      interaction.guildId,
      orderId,
      updatedOrder.paymentReceived,
      interaction.user.id
    );

  } catch (error) {
    logger.error('Error toggling payment status:', error);
    await interaction.followUp({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update payment status'}`,
      ephemeral: true,
    });
  }
}

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

    // Update order status (pass client for leaderboard update)
    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      interaction.guildId,
      newStatus,
      interaction.user.id,
      interaction.client
    );

    // If order is canceled, delete the message
    if (newStatus === OrderStatus.CANCELED) {
      try {
        await interaction.message.delete();
        logger.info(`Deleted canceled order message for ${orderId}`);
        
        // Send a follow-up message
        await interaction.followUp({
          content: `✅ Order \`${orderId}\` has been canceled and removed.`,
          ephemeral: true,
        });
      } catch (error) {
        logger.error('Error deleting order message:', error);
      }
    } else {
      // Update the embed for non-canceled orders
      await updateOrderEmbed(interaction, updatedOrder, oldStatus);
    }

    logger.info(
      `Order ${orderId} status updated from ${oldStatus} to ${newStatus} by ${interaction.user.tag}`
    );

    // Log to log channel with credit change info
    let creditChange;
    if (updatedOrder.status === OrderStatus.DONE && oldStatus !== OrderStatus.DONE) {
      creditChange = { userId: order.assignedUserId, amount: order.price, type: 'added' as const };
    } else if (updatedOrder.status === OrderStatus.CANCELED && oldStatus === OrderStatus.DONE) {
      creditChange = { userId: order.assignedUserId, amount: order.price, type: 'deducted' as const };
    } else if (oldStatus === OrderStatus.DONE && updatedOrder.status === OrderStatus.PENDING) {
      creditChange = { userId: order.assignedUserId, amount: order.price, type: 'deducted' as const };
    }

    await LogService.logOrderStatusUpdate(
      interaction.client,
      interaction.guildId,
      orderId,
      oldStatus,
      newStatus,
      interaction.user.id,
      creditChange
    );

  } catch (error) {
    logger.error('Error updating order status:', error);
    await interaction.followUp({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update order'}`,
      ephemeral: true,
    });
  }
}

async function updateOrderEmbed(
  interaction: any,
  order: any,
  oldStatus?: OrderStatus
) {
  const statusInfo = statusMap[order.status as OrderStatus];
  
  // Get user credits
  const userCredits = await OrderService.getUserCredits(
    order.assignedUserId,
    interaction.guildId
  );

  // Create updated embed
  const embed = new EmbedBuilder()
    .setColor(statusInfo.color)
    .setTitle('📦 Order Status')
    .addFields(
      { name: '📋 Order ID', value: order.orderId, inline: true },
      { name: '🎮 Game', value: order.game, inline: true },
      { name: '💰 Price', value: `$${order.price.toFixed(2)}`, inline: true },
      { name: '👤 Assigned To', value: `<@${order.assignedUserId}>`, inline: true },
      { name: '📊 Status', value: `${statusInfo.emoji} ${statusInfo.label}`, inline: true },
      { name: '💵 Payment', value: order.paymentReceived ? '✅ Received' : '⏳ Pending', inline: true }
    )
    .setTimestamp();

  // Add credit notification if status changed
  if (oldStatus !== undefined) {
    if (order.status === OrderStatus.DONE && oldStatus !== OrderStatus.DONE) {
      embed.setDescription(`✅ **+$${order.price.toFixed(2)}** added to <@${order.assignedUserId}>'s credits!`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    } else if (order.status === OrderStatus.CANCELED && oldStatus === OrderStatus.DONE) {
      embed.setDescription(`⚠️ **-$${order.price.toFixed(2)}** deducted from <@${order.assignedUserId}>'s credits!`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    } else if (oldStatus === OrderStatus.DONE && order.status === OrderStatus.PENDING) {
      embed.setDescription(`⚠️ **-$${order.price.toFixed(2)}** deducted from <@${order.assignedUserId}>'s credits!`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    }
  }

  if (order.notes) {
    embed.addFields({ name: '📝 Notes', value: order.notes });
  }

  // Create buttons
  const buttons: ButtonBuilder[] = [];
  const isCanceled = order.status === OrderStatus.CANCELED;

  // Payment button - disabled if order is canceled
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`order_payment_${order.orderId}`)
      .setLabel(order.paymentReceived ? '💵 Payment Received' : '💵 Mark Payment Received')
      .setStyle(order.paymentReceived ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(isCanceled)
  );

  // Done button - disabled if order is canceled or already done
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`order_done_${order.orderId}`)
      .setLabel('✅ Mark as Done')
      .setStyle(order.status === OrderStatus.DONE ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(isCanceled || order.status === OrderStatus.DONE)
  );

  // Cancel button - disabled if order is already canceled
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`order_cancel_${order.orderId}`)
      .setLabel('❌ Cancel Order')
      .setStyle(order.status === OrderStatus.CANCELED ? ButtonStyle.Secondary : ButtonStyle.Danger)
      .setDisabled(isCanceled)
  );

  embed.setFooter({ 
    text: isCanceled 
      ? '🔒 Order is canceled and cannot be modified' 
      : 'Use buttons to update order status and payment' 
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  await interaction.editReply({ 
    embeds: [embed], 
    components: [row] 
  });
}

