import { db } from '../utils/database';
import { User as DiscordUser } from 'discord.js';

export const UserService = {
  /**
   * Get or create user
   */
  async getOrCreate(user: DiscordUser) {
    return await db.user.upsert({
      where: { id: user.id },
      update: { username: user.username },
      create: {
        id: user.id,
        username: user.username,
      },
    });
  },

  /**
   * Get or create guild user data
   */
  async getOrCreateGuildUser(userId: string, guildId: string) {
    return await db.guildUser.upsert({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      update: {},
      create: {
        userId,
        guildId,
      },
    });
  },

  /**
   * Add XP to user in guild
   */
  async addXp(userId: string, guildId: string, amount: number) {
    const guildUser = await db.guildUser.upsert({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      update: {
        xp: {
          increment: amount,
        },
        messages: {
          increment: 1,
        },
      },
      create: {
        userId,
        guildId,
        xp: amount,
        messages: 1,
      },
    });

    // Check for level up (simple formula: level = floor(xp / 100))
    const newLevel = Math.floor(guildUser.xp / 100);
    if (newLevel > guildUser.level) {
      await db.guildUser.update({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
        data: { level: newLevel },
      });
      return { ...guildUser, level: newLevel, leveledUp: true };
    }

    return { ...guildUser, leveledUp: false };
  },

  /**
   * Get leaderboard for guild
   */
  async getLeaderboard(guildId: string, limit = 10) {
    return await db.guildUser.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
  },

  /**
   * Add warning to user
   */
  async addWarning(userId: string, guildId: string) {
    return await db.guildUser.update({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      data: {
        warnings: {
          increment: 1,
        },
      },
    });
  },
};

