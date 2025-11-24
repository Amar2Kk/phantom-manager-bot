import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { UserService } from '../services/user-service';
import { db } from '../utils/database';

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your rank or another user\'s rank')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check (default: yourself)')
        .setRequired(false)
    ) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        ephemeral: true 
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Get user data
    const guildUser = await db.guildUser.findUnique({
      where: {
        userId_guildId: {
          userId: targetUser.id,
          guildId: interaction.guildId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!guildUser) {
      await interaction.reply({
        content: `${targetUser.username} hasn't gained any XP yet!`,
        ephemeral: true,
      });
      return;
    }

    // Get user's rank
    const higherRanked = await db.guildUser.count({
      where: {
        guildId: interaction.guildId,
        xp: {
          gt: guildUser.xp,
        },
      },
    });
    
    const rank = higherRanked + 1;
    const totalUsers = await db.guildUser.count({
      where: { guildId: interaction.guildId },
    });

    // Calculate XP needed for next level
    const nextLevel = guildUser.level + 1;
    const xpForNextLevel = nextLevel * 100;
    const xpNeeded = xpForNextLevel - guildUser.xp;
    const progressPercent = ((guildUser.xp % 100) / 100) * 100;

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`📊 ${targetUser.username}'s Rank`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '🏅 Rank', value: `#${rank} of ${totalUsers}`, inline: true },
        { name: '⭐ Level', value: `${guildUser.level}`, inline: true },
        { name: '✨ XP', value: `${guildUser.xp}`, inline: true },
        { name: '💬 Messages', value: `${guildUser.messages}`, inline: true },
        { name: '📈 Progress', value: `${progressPercent.toFixed(1)}%`, inline: true },
        { name: '🎯 Next Level', value: `${xpNeeded} XP needed`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

