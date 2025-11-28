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
  const idFromButton = interaction.customId.split('_').slice(2).join('_');
  
  try {
    await interaction.deferUpdate();

    // Try to get order by internal ID first (new format)
    let order = await OrderService.getOrderById(idFromButton);

    // If not found, try to get by custom orderId (old format for backward compatibility)
    if (!order && interaction.guildId) {
      order = await OrderService.getOrder(idFromButton, interaction.guildId);
    }

    if (!order) {
      await interaction.followUp({
        content: `❌ Order not found!`,
        flags: ['Ephemeral'],
      });
      return;
    }

    // Use the internal ID for all operations
    const internalId = order.id;

    // Get old payment status for credit change detection
    const oldPaymentStatus = order.paymentReceived;

    // Toggle payment status
    const updatedOrder = await OrderService.togglePaymentReceivedById(
      internalId,
      interaction.user.id
    );

    logger.info(
      `Order ${updatedOrder.orderId} (ID: ${internalId}) payment status toggled to ${updatedOrder.paymentReceived} by ${interaction.user.tag}`
    );

    // Determine credit change for logging
    let creditChange;
    if (order.status === OrderStatus.DONE) {
      if (updatedOrder.paymentReceived && !oldPaymentStatus) {
        // Payment marked as received → credits deducted
        creditChange = { userId: order.assignedUserId, amount: order.price, type: 'deducted' as const };
      } else if (!updatedOrder.paymentReceived && oldPaymentStatus) {
        // Payment unmarked → credits added back
        creditChange = { userId: order.assignedUserId, amount: order.price, type: 'added' as const };
      }
    }

    // Log to log channel
    await LogService.logPaymentToggle(
      interaction.client,
      interaction.guildId,
      updatedOrder.orderId,
      updatedOrder.paymentReceived,
      interaction.user.id,
      creditChange
    );

    // Update leaderboard if credits changed
    if (creditChange) {
      const { LeaderboardService } = await import('../services/leaderboard-service.js');
      await LeaderboardService.updateLeaderboard(interaction.client, interaction.guildId);
    }

    // If order is DONE and payment is received, delete the message
    if (updatedOrder.status === OrderStatus.DONE && updatedOrder.paymentReceived) {
      try {
        await interaction.message.delete();
        logger.info(`Deleted completed and paid order message for ${updatedOrder.orderId} (ID: ${internalId})`);
        
        // Send confirmation
        await interaction.followUp({
          content: `✅ Order \`${updatedOrder.orderId}\` is complete and paid. Message removed.`,
          flags: ['Ephemeral'],
        });
      } catch (error) {
        logger.error('Error deleting order message:', error);
      }
    } else {
      // Update the embed if not deleting
      await updateOrderEmbed(interaction, updatedOrder, undefined, oldPaymentStatus);
    }

  } catch (error) {
    logger.error('Error toggling payment status:', error);
    await interaction.followUp({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update payment status'}`,
      flags: ['Ephemeral'],
    });
  }
}

async function handleOrderStatusUpdate(
  interaction: any,
  newStatus: OrderStatus
) {
  const idFromButton = interaction.customId.split('_').slice(2).join('_');
  
  try {
    // Try to get order by internal ID first (new format)
    let order = await OrderService.getOrderById(idFromButton);

    // If not found, try to get by custom orderId (old format for backward compatibility)
    if (!order && interaction.guildId) {
      order = await OrderService.getOrder(idFromButton, interaction.guildId);
    }

    if (!order) {
      await interaction.reply({
        content: `❌ Order not found!`,
        flags: ['Ephemeral'],
      });
      return;
    }

    // Use the internal ID for all operations
    const internalId = order.id;
    const oldStatus = order.status;

    // Don't update if already in this status
    if (oldStatus === newStatus) {
      await interaction.reply({
        content: `ℹ️ Order is already marked as ${statusMap[newStatus].label}`,
        flags: ['Ephemeral'],
      });
      return;
    }

    // If order is being canceled, delete the message immediately
    if (newStatus === OrderStatus.CANCELED) {
      // Update order status first (pass client for leaderboard update)
      await OrderService.updateOrderStatusById(
        internalId,
        newStatus,
        interaction.user.id,
        interaction.client
      );

      // Log the status update
      logger.info(
        `Order ${order.orderId} (ID: ${internalId}) status updated from ${oldStatus} to ${newStatus} by ${interaction.user.tag}`
      );

      // Log to log channel with credit change info
      let creditChange;
      if (oldStatus === OrderStatus.DONE) {
        creditChange = { userId: order.assignedUserId, amount: order.price, type: 'deducted' as const };
      }

      await LogService.logOrderStatusUpdate(
        interaction.client,
        interaction.guildId,
        order.orderId,
        oldStatus,
        newStatus,
        interaction.user.id,
        creditChange
      );

      // Delete the message
      try {
        await interaction.message.delete();
        logger.info(`Deleted canceled order message for ${order.orderId} (ID: ${internalId})`);
      } catch (error) {
        logger.error('Error deleting order message:', error);
      }

      // Send confirmation
      await interaction.reply({
        content: `✅ Order \`${order.orderId}\` has been canceled and removed.`,
        flags: ['Ephemeral'],
      });

      return;
    }

    // For non-canceled orders, defer the update
    await interaction.deferUpdate();

    // Update order status (pass client for leaderboard update)
    const updatedOrder = await OrderService.updateOrderStatusById(
      internalId,
      newStatus,
      interaction.user.id,
      interaction.client
    );

    logger.info(
      `Order ${updatedOrder.orderId} (ID: ${internalId}) status updated from ${oldStatus} to ${newStatus} by ${interaction.user.tag}`
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
      updatedOrder.orderId,
      oldStatus,
      newStatus,
      interaction.user.id,
      creditChange
    );

    // If order is now DONE and payment is already received, delete the message
    if (updatedOrder.status === OrderStatus.DONE && updatedOrder.paymentReceived) {
      try {
        await interaction.message.delete();
        logger.info(`Deleted completed and paid order message for ${updatedOrder.orderId} (ID: ${internalId})`);
        
        // Send confirmation
        await interaction.followUp({
          content: `✅ Order \`${updatedOrder.orderId}\` is complete and paid. Message removed.`,
          flags: ['Ephemeral'],
        });
      } catch (error) {
        logger.error('Error deleting order message:', error);
      }
    } else {
      // Update the embed for non-deleted orders
      await updateOrderEmbed(interaction, updatedOrder, oldStatus);
    }

  } catch (error) {
    logger.error('Error updating order status:', error);
    await interaction.followUp({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update order'}`,
      flags: ['Ephemeral'],
    });
  }
}

async function updateOrderEmbed(
  interaction: any,
  order: any,
  oldStatus?: OrderStatus,
  oldPaymentStatus?: boolean
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

  // Add credit notification if status or payment changed
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
  } else if (oldPaymentStatus !== undefined && order.status === OrderStatus.DONE) {
    // Payment status changed on a DONE order
    if (order.paymentReceived && !oldPaymentStatus) {
      embed.setDescription(`💵 **-$${order.price.toFixed(2)}** deducted from <@${order.assignedUserId}>'s credits (Payment received)`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    } else if (!order.paymentReceived && oldPaymentStatus) {
      embed.setDescription(`💵 **+$${order.price.toFixed(2)}** added back to <@${order.assignedUserId}>'s credits (Payment unmarked)`);
      embed.addFields({ 
        name: '💳 User Credits', 
        value: `$${userCredits?.credits.toFixed(2) || '0.00'}` 
      });
    }
  }

  if (order.notes) {
    embed.addFields({ name: '📝 Notes', value: order.notes });
  }

  // Create buttons using internal database ID
  const buttons: ButtonBuilder[] = [];
  const isCanceled = order.status === OrderStatus.CANCELED;

  // Payment button - disabled if order is canceled
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`order_payment_${order.id}`)
      .setLabel(order.paymentReceived ? '💵 Payment Received' : '💵 Mark Payment Received')
      .setStyle(order.paymentReceived ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(isCanceled)
  );

  // Done button - disabled if order is canceled or already done
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`order_done_${order.id}`)
      .setLabel('✅ Mark as Done')
      .setStyle(order.status === OrderStatus.DONE ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(isCanceled || order.status === OrderStatus.DONE)
  );

  // Cancel button - disabled if order is already canceled
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`order_cancel_${order.id}`)
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

