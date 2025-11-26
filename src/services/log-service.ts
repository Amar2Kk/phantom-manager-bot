import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

export const LogService = {
  /**
   * Send a log message to the configured log channel
   */
  async sendLog(client: Client, guildId: string, embed: EmbedBuilder) {
    try {
      // Get guild settings
      const guild = await db.guild.findUnique({
        where: { id: guildId },
        select: { logChannelId: true },
      });

      if (!guild?.logChannelId) {
        // No log channel configured, skip silently
        return;
      }

      // Get the channel
      const channel = await client.channels.fetch(guild.logChannelId);
      
      if (!channel || !channel.isTextBased()) {
        logger.warn(`Log channel ${guild.logChannelId} not found or not text-based`);
        return;
      }

      // Send the log
      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send log message:', error);
    }
  },

  /**
   * Log order creation
   */
  async logOrderCreated(
    client: Client,
    guildId: string,
    orderId: string,
    game: string,
    price: number,
    assignedUserId: string,
    createdBy: string
  ) {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📦 Order Created')
      .addFields(
        { name: '📋 Order ID', value: orderId, inline: true },
        { name: '🎮 Game', value: game, inline: true },
        { name: '💰 Price', value: `$${price.toFixed(2)}`, inline: true },
        { name: '👤 Assigned To', value: `<@${assignedUserId}>`, inline: true },
        { name: '👨‍💼 Created By', value: `<@${createdBy}>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(client, guildId, embed);
  },

  /**
   * Log order status update
   */
  async logOrderStatusUpdate(
    client: Client,
    guildId: string,
    orderId: string,
    oldStatus: string,
    newStatus: string,
    updatedBy: string,
    creditChange?: { userId: string; amount: number; type: 'added' | 'deducted' }
  ) {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🔄 Order Status Updated')
      .addFields(
        { name: '📋 Order ID', value: orderId, inline: true },
        { name: '📊 Status Change', value: `${oldStatus} → ${newStatus}`, inline: true },
        { name: '👤 Updated By', value: `<@${updatedBy}>`, inline: true }
      )
      .setTimestamp();

    if (creditChange) {
      const sign = creditChange.type === 'added' ? '+' : '-';
      embed.addFields({
        name: '💳 Credit Change',
        value: `${sign}$${creditChange.amount.toFixed(2)} for <@${creditChange.userId}>`,
      });
    }

    await this.sendLog(client, guildId, embed);
  },

  /**
   * Log payment status toggle
   */
  async logPaymentToggle(
    client: Client,
    guildId: string,
    orderId: string,
    paymentReceived: boolean,
    updatedBy: string
  ) {
    const embed = new EmbedBuilder()
      .setColor(paymentReceived ? 0x00BFFF : 0xFFA500)
      .setTitle('💵 Payment Status Updated')
      .addFields(
        { name: '📋 Order ID', value: orderId, inline: true },
        { name: '💵 Status', value: paymentReceived ? '✅ Received' : '⏳ Pending', inline: true },
        { name: '👤 Updated By', value: `<@${updatedBy}>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(client, guildId, embed);
  },

  /**
   * Log credit reset for a single user
   */
  async logCreditReset(
    client: Client,
    guildId: string,
    userId: string,
    previousAmount: number,
    resetBy: string
  ) {
    const embed = new EmbedBuilder()
      .setColor(0xFF9900)
      .setTitle('🔄 Credits Reset')
      .addFields(
        { name: '👤 User', value: `<@${userId}>`, inline: true },
        { name: '💰 Previous Amount', value: `$${previousAmount.toFixed(2)}`, inline: true },
        { name: '💰 New Amount', value: '$0.00', inline: true },
        { name: '👨‍💼 Reset By', value: `<@${resetBy}>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(client, guildId, embed);
  },

  /**
   * Log credit reset for all users
   */
  async logAllCreditsReset(
    client: Client,
    guildId: string,
    userCount: number,
    totalAmount: number,
    resetBy: string
  ) {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('⚠️ All Credits Reset')
      .setDescription('**All user credits have been reset to $0.00**')
      .addFields(
        { name: '👥 Users Affected', value: userCount.toString(), inline: true },
        { name: '💰 Total Amount Reset', value: `$${totalAmount.toFixed(2)}`, inline: true },
        { name: '👨‍💼 Reset By', value: `<@${resetBy}>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(client, guildId, embed);
  },
};

