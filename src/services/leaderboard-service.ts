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
        // Header - Border has 6 dashes for rank, 22 for user, 14 for credits
        table += '```\n';
        table += '┌──────┬──────────────────────┬──────────────┐\n';
        table += '│ Rank │ User                 │      Credits │\n';
        table += '├──────┼──────────────────────┼──────────────┤\n';

        // Rows
        usersWithNames.forEach((user, index) => {
          const rank = `#${index + 1}`;
          const username = user.username.length > 20 
            ? user.username.substring(0, 17) + '...' 
            : user.username;
          const credits = `$${user.credits.toFixed(2)}`;
          
          // Pad strings to fit columns exactly
          // Rank column: 4 chars
          const rankPad = rank.padEnd(4, ' ');
          // User column: 20 chars
          const userPad = username.padEnd(20, ' ');
          // Credits column: 12 chars (right-aligned)
          const creditPad = credits.padStart(12, ' ');
          
          table += `│ ${rankPad} │ ${userPad} │ ${creditPad} │\n`;
        });

        // Footer
        table += '└──────┴──────────────────────┴──────────────┘\n';
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

