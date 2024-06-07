import { Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { warn, debug } from "../../../util/logger";
import { Response, CollectBoostRewardResponse } from "../../../typings/api";
import boostResponseMessagesSchema, { BoostResponseMessages } from "../../../models/boost-response-messages";

const usernamePattern = /^[a-zA-Z0-9_]{3,16}$/;

function isValidMinecraftUsername(username: string) {
  return usernamePattern.test(username);
}

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("bytecore-boostreward_")) return;

    await interaction.deferReply({ ephemeral: true });

    const instanceId = interaction.customId.split("_").pop();
    const playerName = interaction.fields.getTextInputValue("input1");

    const member = await interaction.guild?.members.fetch(interaction.user.id);

    if (!member) {
      await interaction.editReply({
        content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
      });

      return;
    }

    if (!member.premiumSince) {
      await interaction.editReply({
        content: "Musisz być Nitro Boosterem, aby odebrać tę nagrodę.",
      });

      return;
    }

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

    const response = await client.api.user.collectBoostReward(instanceId, interaction.user.id, playerName);

    if (response === Response.InvalidRequest) {
      await interaction.editReply({
        content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
      });

      warn(`Invalid request when collecting reward.`);
      debug(`Instance ID: ${instanceId}`);
      debug(`User ID: ${interaction.user.id}`);
      debug(`Player name: ${playerName}`);

      return;
    }

    const result: BoostResponseMessages | null = await boostResponseMessagesSchema.findOne({
      token: client.token,
      guildId: interaction.guildId,
    });

    const collectedDefault = { content: "Odebrałeś swoją nagrodę!" };
    const cooldownDefault = { content: "Aktywny jest cooldown!" };
    const offlineDefault = { content: "Podany gracz jest offline." };
    const disabledDefault = { content: "Ta funkcja jest wyłączona." };

    const collected = result ? (result.collected ? JSON.parse(result.collected) : collectedDefault) : collectedDefault;
    const cooldown = result ? (result.cooldown ? JSON.parse(result.cooldown) : cooldownDefault) : cooldownDefault;
    const offline = result ? (result.offline ? JSON.parse(result.offline) : offlineDefault) : offlineDefault;
    const disabled = result ? (result.disabled ? JSON.parse(result.disabled) : disabledDefault) : disabledDefault;

    if (response === CollectBoostRewardResponse.Collected) {
      await interaction.editReply(collected);

      return;
    }

    if (response === CollectBoostRewardResponse.Cooldown) {
      await interaction.editReply(cooldown);

      return;
    }

    if (response === CollectBoostRewardResponse.Offline) {
      await interaction.editReply(offline);

      return;
    }

    if (response === CollectBoostRewardResponse.Disabled) {
      await interaction.editReply(disabled);

      return;
    }

    await interaction.editReply({
      content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
    });
  },
});
