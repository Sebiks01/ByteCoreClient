import { SlashCommandBuilder } from "discord.js";

import { Command } from "../../structures/Command";

export default new Command({
  coreOnly: true,
  data: new SlashCommandBuilder().setName("ping").setDescription("Check bot latency."),

  execute: async ({ interaction, client }) => {
    const reply = await interaction.reply({
      content: `Fetching data...`,
      ephemeral: true,
    });

    await interaction.deleteReply();

    const latency = reply.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = client.ws.ping;

    

    await interaction.followUp({
      content: `🏓 Latency: ${latency}ms. API Latency: ${wsLatency}ms.`,
      ephemeral: true,
    });
  },
});
