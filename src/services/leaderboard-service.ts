import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

export const LeaderboardService = {
  /**
   * Create or update the live leaderboard message
   */
  async updateLeaderboard(client: Client, guildId: string): Promise<void> {
    try {
      // Get guild settings
      const guild = await db.guild.findUnique({
        where: { id: guildId },
      });

      if (!guild?.leaderboardChannelId) {
        logger.warn(`No leaderboard channel set for guild ${guildId}`);
        return;
      }

      // Get the channel
      const channel = await client.channels.fetch(guild.leaderboardChannelId);
      if (!channel || !channel.isTextBased()) {
        logger.error(`Invalid leaderboard channel for guild ${guildId}`);
        return;
      }

      // Get top users by credits
      const topUsers = await db.userCredit.findMany({
        where: { guildId },
        orderBy: { credits: 'desc' },
        take: 15,
      });

      // Fetch user data to get usernames
      const usersWithNames = await Promise.all(
        topUsers.map(async (userCredit) => {
          try {
            const user = await client.users.fetch(userCredit.userId);
            return {
              ...userCredit,
              username: user.username,
            };
          } catch {
            return {
              ...userCredit,
              username: 'Unknown User',
            };
          }
        })
      );

      // Create table
      let table = '';
      if (usersWithNames.length > 0) {
        // Header
        table += '```\n';
        table += '┌──────┬─────────────────────┬──────────────┐\n';
        table += '│ Rank │ User                │ Credits      │\n';
        table += '├──────┼─────────────────────┼──────────────┤\n';

        // Rows
        usersWithNames.forEach((user, index) => {
          const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
          const username = user.username.length > 18 
            ? user.username.substring(0, 15) + '...' 
            : user.username;
          const credits = `$${user.credits.toFixed(2)}`;
          
          // Pad strings to fit columns
          const rankPad = rank.length > 2 ? rank : rank.padEnd(4, ' ');
          const userPad = username.padEnd(19, ' ');
          const creditPad = credits.padStart(12, ' ');
          
          table += `│ ${rankPad} │ ${userPad} │ ${creditPad} │\n`;
        });

        // Footer
        table += '└──────┴─────────────────────┴──────────────┘\n';
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
        try {
          const message = await textChannel.messages.fetch(guild.leaderboardMessageId);
          await message.edit({ embeds: [embed] });
          logger.info(`Updated leaderboard message in guild ${guildId}`);
        } catch (error) {
          // Message not found, create new one
          logger.warn(`Leaderboard message not found, creating new one for guild ${guildId}`);
          const newMessage = await textChannel.send({ embeds: [embed] });
          await db.guild.update({
            where: { id: guildId },
            data: { leaderboardMessageId: newMessage.id },
          });
          logger.info(`Created new leaderboard message in guild ${guildId}`);
        }
      } else {
        // Create new message
        const newMessage = await textChannel.send({ embeds: [embed] });
        await db.guild.update({
          where: { id: guildId },
          data: { leaderboardMessageId: newMessage.id },
        });
        logger.info(`Created leaderboard message in guild ${guildId}`);
      }
    } catch (error) {
      logger.error(`Error updating leaderboard for guild ${guildId}:`, error);
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

