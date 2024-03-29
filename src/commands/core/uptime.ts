import { SlashCommandBuilder } from "discord.js";

import { Command } from "../../structures/Command";
import { msToTime } from "../../util/time-formatter";

export default new Command({
  coreOnly: true,
  data: new SlashCommandBuilder().setName("uptime").setDescription("Check bot uptime."),

  execute: async ({ interaction, client }) => {
    const uptime = msToTime(client.uptime || 0);

    await interaction.reply({
      content: `🕐 Czas pracy: ${uptime.length != 0 ? uptime : "-"}.`,
      ephemeral: true,
    });
  },
});
