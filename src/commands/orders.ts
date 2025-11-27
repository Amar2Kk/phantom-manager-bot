import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types.js';
import { OrderService } from '../services/order-service.js';
import { OrderStatus } from '@prisma/client';

const statusEmoji = {
  [OrderStatus.PENDING]: '⏳',
  [OrderStatus.DONE]: '✅',
  [OrderStatus.CANCELED]: '❌',
};

export const ordersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('orders')
    .setDescription('List orders (Admin only)')
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: '⏳ Pending', value: OrderStatus.PENDING },
          { name: '✅ Done', value: OrderStatus.DONE },
          { name: '❌ Canceled', value: OrderStatus.CANCELED }
        )
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Filter by assigned user')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of orders to show (default: 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        flags: ['Ephemeral'] 
      });
      return;
    }

    await interaction.deferReply();

    const statusFilter = interaction.options.getString('status');
    const userFilter = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;

    try {
      const orders = await OrderService.listOrders(interaction.guildId, {
        status: statusFilter && statusFilter !== 'all' ? statusFilter as OrderStatus : undefined,
        assignedUserId: userFilter?.id,
        limit,
      });

      if (orders.length === 0) {
        await interaction.editReply('No orders found with the specified filters.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📦 Orders List')
        .setDescription(
          orders.map((order, index) => {
            const status = statusEmoji[order.status];
            const payment = order.paymentReceived ? '💵' : '⏳';
            return `**${index + 1}.** \`${order.orderId}\` ${status} ${payment}\n` +
                   `   🎮 ${order.game} | 💰 $${order.price.toFixed(2)} | 👤 <@${order.assignedUserId}>`;
          }).join('\n\n')
        )
        .setFooter({ text: `Showing ${orders.length} order(s) | 💵 = Payment Received` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to list orders'}`,
      });
    }
  },
};

