import { Events } from "discord.js";

import { Event } from "../../../structures/Event";
import userBotsSchema from "../../../models/user-bots";

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("bytecore-linkInstance_")) return;

    await interaction.deferReply({ ephemeral: true });

    const split = interaction.customId.split("_");

    const linkCode = split.pop();
    const instanceId = split.pop();
    const inputtedCode = interaction.fields.getTextInputValue("input1");

    if (!instanceId || !linkCode || !inputtedCode) {
      await interaction.editReply({
        content: "An error has occurred. Contact an administrator for more information.",
      });

      return;
    }

    if (inputtedCode !== linkCode) {
      await interaction.editReply({
        content: "Invalid link code.",
      });

      return;
    }

    await userBotsSchema.updateOne({ token: client.token }, { $push: { attachedInstances: instanceId } });

    await interaction.editReply({ content: "Instance attached successfully." });
  },
});
