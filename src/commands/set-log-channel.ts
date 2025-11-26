import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Command } from '../types';
import { db } from '../utils/database.js';
import { GuildService } from '../services/guild-service.js';

export const setLogChannelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('set-log-channel')
    .setDescription('Set the channel for bot action logs')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to send logs to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server!',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);

    try {
      // Ensure guild exists
      await GuildService.getOrCreate(interaction.guild!);

      // Update log channel
      await db.guild.update({
        where: { id: interaction.guildId },
        data: { logChannelId: channel.id },
      });

      await interaction.reply({
        content: `✅ Log channel set to ${channel}!\n\n` +
                 `All bot actions will be logged there, including:\n` +
                 `• Order creation and status updates\n` +
                 `• Payment status changes\n` +
                 `• Credit resets`,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to set log channel'}`,
        ephemeral: true,
      });
    }
  },
};

