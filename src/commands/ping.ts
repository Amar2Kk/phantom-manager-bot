import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types.js';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and bot latency'),
  
  execute: async (interaction) => {
    const startTime = Date.now();
    
    await interaction.reply({ content: 'Pinging...' });
    
    const latency = Date.now() - startTime;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(
      `🏓 Pong!\nLatency: ${latency}ms\nAPI Latency: ${apiLatency}ms`
    );
  },
};

