import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types.js';

export const infoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about the bot'),
  
  execute: async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Bot Information')
      .setDescription('A Discord bot built with discord.js')
      .addFields(
        { name: 'Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${interaction.client.users.cache.size}`, inline: true },
        { name: 'Uptime', value: formatUptime(interaction.client.uptime || 0), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

