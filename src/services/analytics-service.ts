import { db } from '../utils/database';

export const AnalyticsService = {
  /**
   * Log command usage
   */
  async logCommand(
    commandName: string,
    userId: string,
    guildId: string | null,
    success: boolean,
    error?: string
  ) {
    return await db.commandUsage.create({
      data: {
        commandName,
        userId,
        guildId,
        success,
        error,
      },
    });
  },

  /**
   * Get command usage statistics
   */
  async getCommandStats(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await db.commandUsage.groupBy({
      by: ['commandName'],
      where: {
        executedAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  },

  /**
   * Get user command usage
   */
  async getUserCommandCount(userId: string) {
    return await db.commandUsage.count({
      where: { userId },
    });
  },

  /**
   * Get most active users
   */
  async getMostActiveUsers(limit = 10, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await db.commandUsage.groupBy({
      by: ['userId'],
      where: {
        executedAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });
  },
};

