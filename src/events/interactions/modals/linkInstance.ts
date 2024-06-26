import { Events } from "discord.js";

import { Event } from "../../../structures/Event";
import attachedInstancesSchema, { AttachedInstances } from "../../../models/attached-instances";

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
        content: "Wystąpił błąd. Skontaktuj się z administratorem, aby uzyskać więcej informacji.",
      });

      return;
    }

    if (inputtedCode !== linkCode) {
      await interaction.editReply({
        content: "Nieprawdiłowy kod weryfikacji. Spróbuj ponownie.",
      });

      return;
    }

    const attachedInstances: AttachedInstances | null = await attachedInstancesSchema.findOne({
      guild: interaction.guildId,
      token: client.token,
    });

    if (!attachedInstances) {
      await attachedInstancesSchema.create({ guild: interaction.guildId, token: client.token, attachedInstances: [] });
    }

    if (attachedInstances?.attachedInstances?.includes(instanceId)) {
      await interaction.editReply({ content: "Instancja jest już dołączona." });

      return;
    }

    await attachedInstancesSchema.updateOne(
      { token: client.token, guild: interaction.guildId },
      { $push: { attachedInstances: instanceId } }
    );

    await interaction.editReply({ content: "Instancja została pomyślnie dołączona." });
  },
});
