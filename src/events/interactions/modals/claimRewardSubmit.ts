import { Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { warn, debug } from "../../../util/logger";
import { Response, ColllectRewardResponse } from "../../../typings/api";

const usernamePattern = /^[a-zA-Z0-9_]{3,16}$/;

function isValidMinecraftUsername(username: string) {
  return usernamePattern.test(username);
}

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("bytecore-discordreward-")) return;

    await interaction.deferReply({ ephemeral: true });

    const instanceId = interaction.customId.split("-").pop();
    const playerName = interaction.fields.getTextInputValue("input1");

    if (!instanceId || !playerName) {
      await interaction.reply({
        content: "An error has occurred. Contact an administrator for more information.",
        ephemeral: true,
      });

      return;
    }

    if (!isValidMinecraftUsername(playerName)) {
      await interaction.editReply({
        content: "Invalid Minecraft username.",
      });

      return;
    }

    const response = await client.api.user.collectReward(instanceId, playerName);

    if (response === Response.InvalidRequest) {
      await interaction.editReply({
        content: "An error has occurred. Contact an administrator for more information.",
      });

      warn(`Invalid request when collecting reward.`);
      debug(`Instance ID: ${instanceId}`);
      debug(`Player name: ${playerName}`);

      return;
    }

    if (response === ColllectRewardResponse.RewardClaimed) {
      await interaction.editReply({
        content: "You have claimed your reward!",
      });

      return;
    }
  },
});
