import { Events, Guild, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { BotEvent } from '../types';
import { GuildService } from '../services/guild-service.js';
import { logger } from '../utils/logger.js';

export const guildCreateEvent: BotEvent<Events.GuildCreate> = {
  name: Events.GuildCreate,
  execute: async (client, guild: Guild) => {
    logger.info(`Bot joined new guild: ${guild.name} (${guild.id})`);

    try {
      // Create guild entry in database
      await GuildService.getOrCreate(guild);

      // Find the first text channel where the bot can send messages
      const channel = guild.channels.cache.find(
        (ch) =>
          ch.type === ChannelType.GuildText &&
          ch.permissionsFor(guild.members.me!)?.has(['SendMessages', 'EmbedLinks'])
      ) as TextChannel | undefined;

      if (!channel) {
        logger.warn(`No suitable channel found in guild ${guild.name} to send welcome message`);
        return;
      }

      // Create welcome embed
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Thanks for adding Phantom Manager Bot!')
        .setDescription(
          '**Phantom Manager Bot** is a complete shop order management system for Discord.\n\n' +
          'Track orders, manage credits, and monitor your team\'s performance with ease!'
        )
        .addFields(
          {
            name: '📦 Order Management',
            value:
              '• `/order` - Create orders with interactive buttons\n' +
              '• `/orders` - List and filter orders\n' +
              '• `/order-status` - View order details',
            inline: false,
          },
          {
            name: '💰 Credits & Earnings',
            value:
              '• `/total` - Check your credits\n' +
              '• `/credits` - View detailed stats\n' +
              '• `/credits-leaderboard` - See top earners',
            inline: false,
          },
          {
            name: '⚙️ Setup (Admin Only)',
            value:
              '• `/set-leaderboard` - Enable live leaderboard in a channel\n' +
              '• `/set-log-channel` - Set channel for action logs\n' +
              '• `/reset-credits` - Reset user credits\n' +
              '• `/reset-all-credits` - Reset all credits',
            inline: false,
          },
          {
            name: '🚀 Quick Start',
            value:
              '1️⃣ **Set up logging:** `/set-log-channel #logs`\n' +
              '2️⃣ **Enable leaderboard:** `/set-leaderboard #leaderboard`\n' +
              '3️⃣ **Create your first order:** `/order @user`\n' +
              '4️⃣ **Track credits:** `/credits @user`',
            inline: false,
          },
          {
            name: '📚 How It Works',
            value:
              '• Create orders and assign them to users\n' +
              '• Track payment status separately from order status\n' +
              '• Credits are added when orders are marked "Done"\n' +
              '• Credits are deducted if "Done" orders are canceled\n' +
              '• Live leaderboard updates automatically',
            inline: false,
          },
          {
            name: '🔐 Permissions',
            value:
              'Most commands are available to everyone.\n' +
              'Admin commands (setup, resets) require **Administrator** permission.',
            inline: false,
          }
        )
        .setFooter({ 
          text: 'Need help? Use /info for more details or check the documentation' 
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info(`Sent welcome message to guild ${guild.name}`);
    } catch (error) {
      logger.error(`Error sending welcome message to guild ${guild.name}:`, error);
    }
  },
};

