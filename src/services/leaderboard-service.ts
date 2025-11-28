import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { OrderStatus } from '@prisma/client';
import { db } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export const LeaderboardService = {
  /**
   * Create or update the live leaderboard message
   */
  async updateLeaderboard(client: Client, guildId: string): Promise<void> {
    try {
      logger.info(`Attempting to update leaderboard for guild ${guildId}`);
      
      // Get guild settings
      const guild = await db.guild.findUnique({
        where: { id: guildId },
      });

      if (!guild?.leaderboardChannelId) {
        logger.warn(`No leaderboard channel set for guild ${guildId}`);
        return;
      }

      logger.info(`Found leaderboard channel ID: ${guild.leaderboardChannelId} for guild ${guildId}`);

      // Get the channel
      const channel = await client.channels.fetch(guild.leaderboardChannelId);
      if (!channel || !channel.isTextBased()) {
        logger.error(`Invalid leaderboard channel for guild ${guildId}`);
        return;
      }

      logger.info(`Successfully fetched channel for guild ${guildId}`)

      // Get top users by credits
      const topUsers = await db.userCredit.findMany({
        where: { guildId },
        orderBy: { credits: 'desc' },
        take: 15,
      });

      // Fetch user data to get usernames and pending credits
      const usersWithNames = await Promise.all(
        topUsers.map(async (userCredit) => {
          try {
            const user = await client.users.fetch(userCredit.userId);
            
            // Calculate pending credits from currently pending orders
            const pendingCredits = await db.order.aggregate({
              where: {
                assignedUserId: userCredit.userId,
                guildId,
                status: OrderStatus.PENDING,
                archived: false,
              },
              _sum: {
                price: true,
              },
            });

            return {
              ...userCredit,
              username: user.username,
              pendingCredits: pendingCredits._sum.price || 0,
            };
          } catch {
            return {
              ...userCredit,
              username: 'Unknown User',
              pendingCredits: 0,
            };
          }
        })
      );

      // Create table
      let table = '';
      if (usersWithNames.length > 0) {
        // Header - Border has 6 for rank, 18 for user, 12 for credits, 12 for pending
        table += '```\n';
        table += '┌──────┬──────────────────┬────────────┬────────────┐\n';
        table += '│ Rank │ User             │    Credits │    Pending │\n';
        table += '├──────┼──────────────────┼────────────┼────────────┤\n';

        // Rows
        usersWithNames.forEach((user, index) => {
          const rank = `#${index + 1}`;
          const username = user.username.length > 16 
            ? user.username.substring(0, 13) + '...' 
            : user.username;
          const credits = `$${user.credits.toFixed(2)}`;
          const pending = `$${user.pendingCredits.toFixed(2)}`;
          
          // Pad strings to fit columns exactly
          // Rank column: 4 chars
          const rankPad = rank.padEnd(4, ' ');
          // User column: 16 chars
          const userPad = username.padEnd(16, ' ');
          // Credits column: 10 chars (right-aligned)
          const creditPad = credits.padStart(10, ' ');
          // Pending column: 10 chars (right-aligned)
          const pendingPad = pending.padStart(10, ' ');
          
          table += `│ ${rankPad} │ ${userPad} │ ${creditPad} │ ${pendingPad} │\n`;
        });

        // Footer
        table += '└──────┴──────────────────┴────────────┴────────────┘\n';
        table += '```';
      } else {
        table = '```\nNo users with credits yet\n```';
      }

      // Create leaderboard embed
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💰 Live Credits Leaderboard')
        .setDescription(table)
        .setFooter({ text: 'Updates automatically when credits change' })
        .setTimestamp();

      const textChannel = channel as TextChannel;

      // Update or create message
      if (guild.leaderboardMessageId) {
        logger.info(`Attempting to update existing message ${guild.leaderboardMessageId} for guild ${guildId}`);
        try {
          const message = await textChannel.messages.fetch(guild.leaderboardMessageId);
          await message.edit({ embeds: [embed] });
          logger.info(`✅ Successfully updated leaderboard message in guild ${guildId}`);
        } catch (error) {
          // Message not found, create new one
          logger.warn(`Leaderboard message not found (${error instanceof Error ? error.message : 'unknown error'}), creating new one for guild ${guildId}`);
          const newMessage = await textChannel.send({ embeds: [embed] });
          await db.guild.update({
            where: { id: guildId },
            data: { leaderboardMessageId: newMessage.id },
          });
          logger.info(`✅ Created new leaderboard message ${newMessage.id} in guild ${guildId}`);
        }
      } else {
        logger.info(`No existing message ID, creating new leaderboard message for guild ${guildId}`);
        // Create new message
        const newMessage = await textChannel.send({ embeds: [embed] });
        await db.guild.update({
          where: { id: guildId },
          data: { leaderboardMessageId: newMessage.id },
        });
        logger.info(`✅ Created leaderboard message ${newMessage.id} in guild ${guildId}`);
      }
    } catch (error) {
      logger.error(`❌ Error updating leaderboard for guild ${guildId}:`, error);
      if (error instanceof Error) {
        logger.error(`Error stack: ${error.stack}`);
      }
    }
  },

  /**
   * Set the leaderboard channel
   */
  async setLeaderboardChannel(guildId: string, channelId: string): Promise<void> {
    await db.guild.upsert({
      where: { id: guildId },
      update: {
        leaderboardChannelId: channelId,
        leaderboardMessageId: null, // Reset message ID
      },
      create: {
        id: guildId,
        name: 'Unknown',
        leaderboardChannelId: channelId,
      },
    });
  },

  /**
   * Remove the leaderboard channel
   */
  async removeLeaderboardChannel(guildId: string): Promise<void> {
    await db.guild.update({
      where: { id: guildId },
      data: {
        leaderboardChannelId: null,
        leaderboardMessageId: null,
      },
    });
  },
};

