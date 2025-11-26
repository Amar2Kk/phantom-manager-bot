import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';
import { db } from '../utils/database.js';
import { OrderStatus } from '@prisma/client';

const statusEmoji = {
  [OrderStatus.PENDING]: '⏳',
  [OrderStatus.DONE]: '✅',
  [OrderStatus.CANCELED]: '❌',
};

export const archivedOrdersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('archived-orders')
    .setDescription('View archived orders (Admin only)')
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
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply();

    const userFilter = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;

    try {
      const orders = await db.order.findMany({
        where: {
          guildId: interaction.guildId,
          archived: true,
          ...(userFilter ? { assignedUserId: userFilter.id } : {}),
        },
        orderBy: { archivedAt: 'desc' },
        take: limit,
      });

      if (orders.length === 0) {
        await interaction.editReply('📦 No archived orders found.');
        return;
      }

      // Get total count
      const totalCount = await db.order.count({
        where: {
          guildId: interaction.guildId,
          archived: true,
          ...(userFilter ? { assignedUserId: userFilter.id } : {}),
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('📦 Archived Orders')
        .setDescription(
          orders.map((order, index) => {
            const status = statusEmoji[order.status];
            const payment = order.paymentReceived ? '💵' : '⏳';
            const archivedDate = order.archivedAt 
              ? `<t:${Math.floor(order.archivedAt.getTime() / 1000)}:R>`
              : 'Unknown';
            return (
              `**${index + 1}.** \`${order.orderId}\` ${status} ${payment}\n` +
              `   🎮 ${order.game} | 💰 $${order.price.toFixed(2)} | 👤 <@${order.assignedUserId}>\n` +
              `   📅 Archived ${archivedDate}`
            );
          }).join('\n\n')
        )
        .setFooter({ 
          text: `Showing ${orders.length} of ${totalCount} archived order(s) | 💵 = Payment Received` 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to list archived orders'}`,
      });
    }
  },
};

