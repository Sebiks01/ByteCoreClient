import { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { Event } from "../../../structures/Event";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../../../models/discord-reward-messages";

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith("bytecore-discordreward_")) return;

    const instanceId = interaction.customId.split("_").pop();

    const result = await discordRewardMessagesSchema.findOne({
      token: client.token,
      guildId: interaction.guildId,
    });

    if (!result) {
      await interaction.reply({
        content: "An error has occurred. Contact an administrator for more information.",
        ephemeral: true,
      });

      await interaction.message.delete();

      return;
    }

    const instance = (result as DiscordRewardMessages).attachedByteCoreInstances.find(
      (i) => i.instanceId === instanceId
    );

    if (!result || !instanceId || !instance) {
      await interaction.reply({
        content: "An error has occurred. Contact an administrator for more information.",
        ephemeral: true,
      });

      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(interaction.customId)
      .setTitle(instance.modal.title)
      .setComponents(
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId("input1")
            .setStyle(TextInputStyle.Short)
            .setMinLength(3)
            .setMaxLength(16)
            .setRequired(true)
            .setLabel(instance.modal.inputLabel)
            .setPlaceholder(instance.modal.inputPlaceholder)
        )
      );

    await interaction.showModal(modal);
  },
});
