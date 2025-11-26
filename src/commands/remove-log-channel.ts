import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types.js';
import { db } from '../utils/database.js';

export const removeLogChannelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('remove-log-channel')
    .setDescription('Remove the log channel (stop logging bot actions)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server!',
        ephemeral: true,
      });
      return;
    }

    try {
      // Check if log channel is configured
      const guild = await db.guild.findUnique({
        where: { id: interaction.guildId },
      });

      if (!guild?.logChannelId) {
        await interaction.reply({
          content: '❌ No log channel is currently configured!',
          ephemeral: true,
        });
        return;
      }

      // Clear log channel
      await db.guild.update({
        where: { id: interaction.guildId },
        data: { logChannelId: null },
      });

      await interaction.reply({
        content: '✅ Log channel removed! Bot actions will no longer be logged.',
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to remove log channel'}`,
        ephemeral: true,
      });
    }
  },
};

