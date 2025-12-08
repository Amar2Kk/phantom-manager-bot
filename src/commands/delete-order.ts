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
import { OrderStatus } from '@prisma/client';

export const deleteOrderCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('delete-order')
    .setDescription('Permanently delete a specific order (Admin only - IRREVERSIBLE)')
    .addStringOption(option =>
      option
        .setName('order-id')
        .setDescription('The order ID to delete')
        .setRequired(true)
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

    const orderId = interaction.options.getString('order-id', true);

    try {
      // Find the order (only non-archived)
      const order = await db.order.findFirst({
        where: {
          orderId,
          guildId: interaction.guildId,
          archived: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!order) {
        await interaction.reply({
          content: `❌ Order \`${orderId}\` not found in this server.`,
          flags: ['Ephemeral'],
        });
        return;
      }

      // Get user info
      let assignedUserName = 'Unknown User';
      try {
        const user = await interaction.client.users.fetch(order.assignedUserId);
        assignedUserName = user.username;
      } catch {
        assignedUserName = `<@${order.assignedUserId}>`;
      }

      // Status emoji
      const statusEmoji = {
        [OrderStatus.PENDING]: '⏳',
        [OrderStatus.DONE]: '✅',
        [OrderStatus.CANCELED]: '❌',
      };

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⚠️ PERMANENT DELETION WARNING')
        .setDescription(
          `This will **PERMANENTLY DELETE** this order.\n\n` +
          `**Order Details:**\n` +
          `• Order ID: \`${order.orderId}\`\n` +
          `• Game: ${order.game}\n` +
          `• Price: $${order.price.toFixed(2)}\n` +
          `• Status: ${statusEmoji[order.status]} ${order.status}\n` +
          `• Payment: ${order.paymentReceived ? '✅ Received' : '⏳ Pending'}\n` +
          `• Assigned to: ${assignedUserName}\n\n` +
          `**⚠️ THIS ACTION CANNOT BE UNDONE!**`
        )
        .addFields(
          { name: '💰 Credit Impact', value: order.status === OrderStatus.DONE && !order.paymentReceived 
            ? `$${order.price.toFixed(2)} will be deducted from user credits` 
            : 'No credit changes (order not completed or already paid)', 
            inline: false 
          }
        )
        .setFooter({ text: 'You have 30 seconds to confirm' })
        .setTimestamp();

      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_delete_order')
        .setLabel('⚠️ PERMANENTLY DELETE')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_delete_order')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton, confirmButton);

      const response = await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        flags: ['Ephemeral'],
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
            flags: ['Ephemeral'],
          });
          return;
        }

        if (buttonInteraction.customId === 'cancel_delete_order') {
          await buttonInteraction.update({
            content: '✅ Deletion canceled. No data was deleted.',
            embeds: [],
            components: [],
          });
          collector.stop();
          return;
        }

        if (buttonInteraction.customId === 'confirm_delete_order') {
          await buttonInteraction.deferUpdate();

          // Handle credit adjustments
          // If order was DONE and payment not received, deduct credits
          if (order.status === OrderStatus.DONE && !order.paymentReceived) {
            await db.userCredit.update({
              where: {
                userId_guildId: {
                  userId: order.assignedUserId,
                  guildId: interaction.guildId!,
                },
              },
              data: {
                credits: {
                  decrement: order.price,
                },
              },
            });
          }

          // Delete the order
          await db.order.delete({
            where: { id: order.id },
          });

          // Update leaderboard
          const { LeaderboardService } = await import('../services/leaderboard-service.js');
          await LeaderboardService.updateLeaderboard(interaction.client, interaction.guildId!);

          const successEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🗑️ Order Permanently Deleted')
            .setDescription(`Order \`${order.orderId}\` has been permanently deleted.`)
            .addFields(
              { name: '🎮 Game', value: order.game, inline: true },
              { name: '💰 Price', value: `$${order.price.toFixed(2)}`, inline: true },
              { name: '👤 Assigned User', value: assignedUserName, inline: true },
              { name: '📊 Status', value: `${statusEmoji[order.status]} ${order.status}`, inline: true },
              { name: '💵 Payment', value: order.paymentReceived ? '✅ Received' : '⏳ Pending', inline: true },
              { name: '💰 Credits Adjusted', value: order.status === OrderStatus.DONE && !order.paymentReceived 
                ? `-$${order.price.toFixed(2)}` 
                : 'None', 
                inline: true 
              }
            )
            .setTimestamp();

          await buttonInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });

          // Log to log channel
          const logEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🗑️ Order Deleted')
            .setDescription(`Order \`${order.orderId}\` has been permanently deleted`)
            .addFields(
              { name: '🎮 Game', value: order.game, inline: true },
              { name: '💰 Price', value: `$${order.price.toFixed(2)}`, inline: true },
              { name: '👤 Assigned User', value: `<@${order.assignedUserId}>`, inline: true },
              { name: '📊 Status', value: `${statusEmoji[order.status]} ${order.status}`, inline: true },
              { name: '💵 Payment', value: order.paymentReceived ? '✅ Received' : '⏳ Pending', inline: true },
              { name: '👨‍💼 Deleted By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

          await LogService.sendLog(interaction.client, interaction.guildId!, logEmbed);

          collector.stop();
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: '⏱️ Confirmation timed out. No data was deleted.',
            embeds: [],
            components: [],
          });
        }
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to delete order'}`,
        flags: ['Ephemeral'],
      });
    }
  },
};

