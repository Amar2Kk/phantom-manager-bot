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

export const modalSubmitEvent: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (client, interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;

    // Handle order creation modal
    if (interaction.customId.startsWith('order_create_')) {
      const assignedUserId = interaction.customId.replace('order_create_', '');
      
      if (!interaction.guildId) {
        await interaction.reply({ 
          content: 'This can only be used in a server!', 
          flags: ['Ephemeral']
        });
        return;
      }

      try {
        // Get form values
        const orderId = interaction.fields.getTextInputValue('orderId');
        const game = interaction.fields.getTextInputValue('game');
        const priceStr = interaction.fields.getTextInputValue('price');
        const notes = interaction.fields.getTextInputValue('notes') || undefined;

        // Validate price
        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) {
          await interaction.reply({
            content: '❌ Invalid price! Please enter a valid number.',
            flags: ['Ephemeral']
          });
          return;
        }

        // Create order
        const order = await OrderService.createOrder({
          orderId,
          guildId: interaction.guildId,
          game,
          price,
          assignedUserId,
          createdBy: interaction.user.id,
          notes,
        });

        // Create status buttons
        const paymentButton = new ButtonBuilder()
          .setCustomId(`order_payment_${orderId}`)
          .setLabel('💵 Mark Payment Received')
          .setStyle(ButtonStyle.Primary);

        const doneButton = new ButtonBuilder()
          .setCustomId(`order_done_${orderId}`)
          .setLabel('✅ Mark as Done')
          .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
          .setCustomId(`order_cancel_${orderId}`)
          .setLabel('❌ Cancel Order')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(paymentButton, doneButton, cancelButton);

        // Create success embed
        const embed = new EmbedBuilder()
          .setColor(statusMap[OrderStatus.PENDING].color)
          .setTitle('📦 New Order Created')
          .addFields(
            { name: '📋 Order ID', value: order.orderId, inline: true },
            { name: '🎮 Game', value: order.game, inline: true },
            { name: '💰 Price', value: `$${order.price.toFixed(2)}`, inline: true },
            { name: '👤 Assigned To', value: `<@${order.assignedUserId}>`, inline: true },
            { name: '📊 Status', value: '⏳ Pending', inline: true },
            { name: '💵 Payment', value: '⏳ Pending', inline: true }
          )
          .setFooter({ text: 'Use buttons to update order status and payment' })
          .setTimestamp();

        if (notes) {
          embed.addFields({ name: '📝 Notes', value: notes });
        }

        await interaction.reply({ embeds: [embed], components: [row] });
        logger.info(`Order ${orderId} created by ${interaction.user.tag} in guild ${interaction.guildId}`);

        // Log to log channel
        await LogService.logOrderCreated(
          interaction.client,
          interaction.guildId,
          orderId,
          game,
          price,
          assignedUserId,
          interaction.user.id
        );

      } catch (error) {
        logger.error('Error creating order:', error);
        await interaction.reply({
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to create order'}`,
          flags: ['Ephemeral']
        });
      }
    }
  },
};

