import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from '../types.js';
import { logger } from '../utils/logger.js';

export const clearMessagesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('clearmessages')
    .setDescription('Delete messages in the current channel (Admin only)')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100, default: 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: '❌ This command can only be used in text channels!',
        ephemeral: true,
      });
      return;
    }

    const amount = interaction.options.getInteger('amount') || 100;

    try {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel as TextChannel;
      
      // Fetch messages
      const messages = await channel.messages.fetch({ limit: amount });
      
      // Discord only allows bulk delete for messages less than 14 days old
      const filteredMessages = messages.filter(
        msg => Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
      );

      if (filteredMessages.size === 0) {
        await interaction.editReply({
          content: '❌ No messages found to delete (messages must be less than 14 days old).',
        });
        return;
      }

      // Bulk delete messages
      const deleted = await channel.bulkDelete(filteredMessages, true);

      await interaction.editReply({
        content: `✅ Successfully deleted **${deleted.size}** message(s) from ${channel}.`,
      });

      logger.info(
        `${interaction.user.tag} deleted ${deleted.size} messages in ${channel.name} (${channel.id})`
      );

    } catch (error) {
      logger.error('Error deleting messages:', error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to delete messages'}`,
        });
      } else {
        await interaction.reply({
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to delete messages'}`,
          ephemeral: true,
        });
      }
    }
  },
};

