import { db } from '../utils/database';
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
   * Update guild prefix
   */
  async updatePrefix(guildId: string, prefix: string) {
    return await db.guild.update({
      where: { id: guildId },
      data: { prefix },
    });
  },

  /**
   * Get guild settings
   */
  async getSettings(guildId: string) {
    return await db.guild.findUnique({
      where: { id: guildId },
    });
  },

  /**
   * Update guild settings
   */
  async updateSettings(guildId: string, settings: Record<string, unknown>) {
    return await db.guild.update({
      where: { id: guildId },
      data: { settings: settings as never },
    });
  },
};

