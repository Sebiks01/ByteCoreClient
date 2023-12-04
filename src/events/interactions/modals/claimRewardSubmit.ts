import { Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { warn, debug } from "../../../util/logger";
import { Response, ColllectRewardResponse } from "../../../typings/api";
import rewardResponseMessagesSchema, { RewardResponseMessages } from "../../../models/reward-response-messages";

const usernamePattern = /^[a-zA-Z0-9_]{3,16}$/;

function isValidMinecraftUsername(username: string) {
  return usernamePattern.test(username);
}

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("bytecore-discordreward_")) return;

    await interaction.deferReply({ ephemeral: true });

    const instanceId = interaction.customId.split("_").pop();
    const playerName = interaction.fields.getTextInputValue("input1");

    if (!instanceId || !playerName) {
      await interaction.editReply({
        content: "An error has occurred. Contact an administrator for more information.",
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

    const result: RewardResponseMessages | null = await rewardResponseMessagesSchema.findOne({
      token: client.token,
      guildId: interaction.guildId,
    });

    const collectedDefault = { content: "You have claimed your reward!" };
    const alreadyCollectedDefault = { content: "You have already claimed your reward!" };
    const offlineDefault = { content: "The provided player is offline." };

    const collected = result ? (result.collected ? result.collected : collectedDefault) : collectedDefault;
    const alreadyCollected = result
      ? result.alreadyCollected
        ? result.alreadyCollected
        : alreadyCollectedDefault
      : alreadyCollectedDefault;
    const offline = result ? (result.offline ? result.offline : offlineDefault) : offlineDefault;

    if (response === ColllectRewardResponse.Collected) {
      await interaction.editReply(collected);

      return;
    }

    if (response === ColllectRewardResponse.AlreadyCollected) {
      await interaction.editReply(alreadyCollected);

      return;
    }

    if (response === ColllectRewardResponse.Offline) {
      await interaction.editReply(offline);

      return;
    }

    await interaction.editReply({
      content: "An error has occurred. Contact an administrator for more information.",
    });
  },
});
