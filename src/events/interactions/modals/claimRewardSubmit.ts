import { Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { warn, debug } from "../../../util/logger";
import { Response, CollectRewardResponse } from "../../../typings/api";
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
        content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
      });

      return;
    }

    if (!isValidMinecraftUsername(playerName)) {
      await interaction.editReply({
        content: "Nieprawidłowa nazwa użytkownika Minecraft.",
      });

      return;
    }

    const response = await client.api.user.collectReward(instanceId, interaction.user.id, playerName);

    if (response === Response.InvalidRequest) {
      await interaction.editReply({
        content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
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

    const collectedDefault = { content: "Odebrałeś swoją nagrodę!" };
    const alreadyCollectedDefault = { content: "Już odebrałeś swoją nagrodę!" };
    const offlineDefault = { content: "Podany gracz jest offline." };

    const collected = result ? (result.collected ? JSON.parse(result.collected) : collectedDefault) : collectedDefault;
    const alreadyCollected = result
      ? result.alreadyCollected
        ? JSON.parse(result.alreadyCollected)
        : alreadyCollectedDefault
      : alreadyCollectedDefault;
    const offline = result ? (result.offline ? JSON.parse(result.offline) : offlineDefault) : offlineDefault;

    if (response === CollectRewardResponse.Collected) {
      await interaction.editReply(collected);

      return;
    }

    if (response === CollectRewardResponse.AlreadyCollected) {
      await interaction.editReply(alreadyCollected);

      return;
    }

    if (response === CollectRewardResponse.Offline) {
      await interaction.editReply(offline);

      return;
    }

    await interaction.editReply({
      content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
    });
  },
});
