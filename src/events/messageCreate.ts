import { Events, Message } from 'discord.js';
import { BotEvent } from '../types';
import { UserService } from '../services/user-service';
import { logger } from '../utils/logger';

// Cooldown map to prevent XP spam (user ID -> timestamp)
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60000; // 1 minute cooldown between XP gains
const XP_MIN = 15;
const XP_MAX = 25;

export const messageCreateEvent: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (client, message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Only process guild messages
    if (!message.guildId) return;
    
    // Check cooldown
    const now = Date.now();
    const cooldownEnd = cooldowns.get(message.author.id);
    
    if (cooldownEnd && now < cooldownEnd) {
      // User is still on cooldown
      return;
    }
    
    try {
      // Ensure user exists in database
      await UserService.getOrCreate(message.author);
      
      // Generate random XP amount
      const xpGain = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
      
      // Add XP to user
      const result = await UserService.addXp(
        message.author.id,
        message.guildId,
        xpGain
      );
      
      // Set cooldown
      cooldowns.set(message.author.id, now + COOLDOWN_MS);
      
      // If user leveled up, send a message
      if (result.leveledUp) {
        const levelUpMessage = await message.reply(
          `🎉 Congratulations ${message.author}! You've reached **Level ${result.level}**!`
        );
        
        // Delete level up message after 10 seconds to avoid spam
        setTimeout(() => {
          levelUpMessage.delete().catch(() => {});
        }, 10000);
        
        logger.info(`User ${message.author.tag} leveled up to ${result.level} in guild ${message.guildId}`);
      }
    } catch (error) {
      logger.error('Error processing message for XP:', error);
    }
  },
};

