import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { Command } from '../types.js';
import { db } from '../utils/database.js';
import { LogService } from '../services/log-service.js';

export const deleteUserCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('delete-user')
    .setDescription('Permanently delete all data for a user (Admin only - IRREVERSIBLE)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose data to permanently delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,
  
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({ 
        content: 'This command can only be used in a server!', 
        flags: ['Ephemeral'] 
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);

    try {
      // Get user's data before deletion
      const userCredits = await db.userCredit.findUnique({
        where: {
          userId_guildId: {
            userId: targetUser.id,
            guildId: interaction.guildId,
          },
        },
      });

      const [activeOrders, archivedOrders] = await Promise.all([
        db.order.count({
          where: { 
            guildId: interaction.guildId,
            assignedUserId: targetUser.id,
            archived: false
          },
        }),
        db.order.count({
          where: { 
            guildId: interaction.guildId,
            assignedUserId: targetUser.id,
            archived: true
          },
        }),
      ]);

      const totalOrders = activeOrders + archivedOrders;

      if (!userCredits && totalOrders === 0) {
        await interaction.reply({
          content: `✅ User ${targetUser.username} has no data in this server.`,
          flags: ['Ephemeral'],
        });
        return;
      }

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⚠️ PERMANENT DELETION WARNING')
        .setDescription(
          `This will **PERMANENTLY DELETE ALL DATA** for ${targetUser}.\n\n` +
          `**What will be deleted:**\n` +
          `• All orders (active and archived)\n` +
          `• All credit history\n` +
          `• User cannot be recovered\n\n` +
          `**⚠️ THIS ACTION CANNOT BE UNDONE!**`
        )
        .addFields(
          { name: '👤 User', value: targetUser.username, inline: true },
          { name: '📦 Active Orders', value: activeOrders.toString(), inline: true },
          { name: '📦 Archived Orders', value: archivedOrders.toString(), inline: true },
          { name: '💰 Current Credits', value: `$${(userCredits?.credits || 0).toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'You have 30 seconds to confirm' })
        .setTimestamp();

      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_delete_user')
        .setLabel('⚠️ PERMANENTLY DELETE')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_delete_user')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton, confirmButton);

      const response = await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        flags: ['Ephemeral'],
      });

      // Wait for button interaction
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000, // 30 seconds
      });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: '❌ Only the command user can confirm this action!',
            flags: ['Ephemeral'],
          });
          return;
        }

        if (buttonInteraction.customId === 'cancel_delete_user') {
          await buttonInteraction.update({
            content: '✅ Deletion canceled. No data was deleted.',
            embeds: [],
            components: [],
          });
          collector.stop();
          return;
        }

        if (buttonInteraction.customId === 'confirm_delete_user') {
          await buttonInteraction.deferUpdate();

          // Delete all user data
          const [deletedOrders, deletedCredits] = await Promise.all([
            db.order.deleteMany({
              where: {
                guildId: interaction.guildId!,
                assignedUserId: targetUser.id,
              },
            }),
            db.userCredit.deleteMany({
              where: {
                userId: targetUser.id,
                guildId: interaction.guildId!,
              },
            }),
          ]);

          // Update leaderboard
          const { LeaderboardService } = await import('../services/leaderboard-service.js');
          await LeaderboardService.updateLeaderboard(interaction.client, interaction.guildId!);

          const successEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🗑️ User Data Permanently Deleted')
            .setDescription(`All data for ${targetUser} has been permanently deleted.`)
            .addFields(
              { name: '👤 User', value: targetUser.username, inline: true },
              { name: '📦 Orders Deleted', value: `${deletedOrders.count}`, inline: true },
              { name: '💰 Credits Deleted', value: `$${(userCredits?.credits || 0).toFixed(2)}`, inline: true }
            )
            .setTimestamp();

          await buttonInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });

          // Log to log channel
          const logEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🗑️ User Data Deleted')
            .setDescription(`All data for ${targetUser} has been permanently deleted`)
            .addFields(
              { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
              { name: '📦 Orders Deleted', value: deletedOrders.count.toString(), inline: true },
              { name: '💰 Credits Lost', value: `$${(userCredits?.credits || 0).toFixed(2)}`, inline: true },
              { name: '👨‍💼 Deleted By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

          await LogService.sendLog(interaction.client, interaction.guildId!, logEmbed);

          collector.stop();
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: '⏱️ Confirmation timed out. No data was deleted.',
            embeds: [],
            components: [],
          });
        }
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to delete user data'}`,
        flags: ['Ephemeral'],
      });
    }
  },
};

