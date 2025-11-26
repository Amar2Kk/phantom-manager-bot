import { Events } from 'discord.js';
import { BotEvent } from '../types';
import { logger } from '../utils/logger.js';

export const readyEvent: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    if (!client.user) {
      logger.error('Client user is null');
      return;
    }
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
  },
};

