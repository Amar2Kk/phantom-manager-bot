import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and bot latency'),
  
  execute: async (interaction) => {
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(
      `🏓 Pong!\nLatency: ${latency}ms\nAPI Latency: ${apiLatency}ms`
    );
  },
};

