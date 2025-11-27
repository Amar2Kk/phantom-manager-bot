import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../types.js';
import { OrderService } from '../services/order-service.js';

export const orderCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('order')
    .setDescription('Create a new shop order (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to assign this order to')
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

    const assignedUser = interaction.options.getUser('user', true);

    // Create modal for order details
    const modal = new ModalBuilder()
      .setCustomId(`order_create_${assignedUser.id}`)
      .setTitle('Create New Order');

    const orderIdInput = new TextInputBuilder()
      .setCustomId('orderId')
      .setLabel('Order ID')
      .setPlaceholder('e.g., ORD-12345')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    const gameInput = new TextInputBuilder()
      .setCustomId('game')
      .setLabel('Game')
      .setPlaceholder('e.g., Valorant, League of Legends')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const priceInput = new TextInputBuilder()
      .setCustomId('price')
      .setLabel('Price')
      .setPlaceholder('e.g., 25.50')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);

    const notesInput = new TextInputBuilder()
      .setCustomId('notes')
      .setLabel('Notes (Optional)')
      .setPlaceholder('Additional order details...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    // Add inputs to action rows
    const row1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(orderIdInput);
    const row2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(gameInput);
    const row3 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(priceInput);
    const row4 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(notesInput);

    modal.addComponents(row1, row2, row3, row4);

    await interaction.showModal(modal);
  },
};

