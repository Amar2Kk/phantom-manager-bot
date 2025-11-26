import { db } from '../utils/database.js';
import { Guild as DiscordGuild } from 'discord.js';

export const GuildService = {
  /**
   * Get or create guild settings
   */
  async getOrCreate(guild: DiscordGuild) {
    return await db.guild.upsert({
      where: { id: guild.id },
      update: { name: guild.name },
      create: {
        id: guild.id,
        name: guild.name,
      },
    });
  },

  /**
   * Get guild by ID
   */
  async getGuild(guildId: string) {
    return await db.guild.findUnique({
      where: { id: guildId },
    });
  },

  /**
   * Set leaderboard channel and message
   */
  async setLeaderboard(guildId: string, channelId: string, messageId: string) {
    return await db.guild.update({
      where: { id: guildId },
      data: {
        leaderboardChannelId: channelId,
        leaderboardMessageId: messageId,
      },
    });
  },

  /**
   * Clear leaderboard configuration
   */
  async clearLeaderboard(guildId: string) {
    return await db.guild.update({
      where: { id: guildId },
      data: {
        leaderboardChannelId: null,
        leaderboardMessageId: null,
      },
    });
  },
};

