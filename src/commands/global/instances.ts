import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { Command } from "../../structures/Command";
import attachedInstancesSchema, { AttachedInstances } from "../../models/attached-instances";
import api from "../../api";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("instances")
    .setDescription("Manages attached instances.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("attach")
        .setDescription("Attach a bytecore instance to this bot.")
        .addStringOption((option) =>
          option.setName("instance-id").setDescription("ByteCore instance id.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("detach")
        .setDescription("Detach a bytecore instance from this bot.")
        .addStringOption((option) =>
          option.setName("instance-id").setDescription("ByteCore instance id.").setAutocomplete(true).setRequired(true)
        )
    ),

  execute: async ({ interaction, args, client }) => {
    if (!interaction.guild) {
      return await interaction.reply({ content: "To komenda może być używana tylko na serwerze." });
    }

    const subcommand = args.getSubcommand();

    const instanceId = args.getString("instance-id") as string;

    const attachedInstances: AttachedInstances | null = await attachedInstancesSchema.findOne({
      guild: interaction.guildId,
      token: client.token,
    });

    if (!attachedInstances) {
      await attachedInstancesSchema.create({ guild: interaction.guildId, token: client.token, attachedInstances: [] });
    }

    if (subcommand === "attach") {
      if (attachedInstances?.attachedInstances?.includes(instanceId)) {
        return await interaction.reply({ content: "Instancja jest już dołączona.", ephemeral: true });
      }

      const linkCode = await api.system.linkInstance(instanceId, client.user?.username || " ");

      const linkModal = new ModalBuilder()
        .setCustomId(`bytecore-linkInstance_${instanceId}_${linkCode}`)
        .setTitle("Weryfikacja Instancji")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("input1")
              .setStyle(TextInputStyle.Short)
              .setLabel("Kod")
              .setPlaceholder("Wklej tutaj kod weryfikacji")
              .setRequired(true)
          )
        );

      return await interaction.showModal(linkModal);
    }

    if (subcommand === "detach") {
      if (!attachedInstances?.attachedInstances?.includes(instanceId)) {
        return await interaction.reply({ content: "Instancja nie jest dołączona.", ephemeral: true });
      }

      await attachedInstancesSchema.updateOne(
        { guild: interaction.guildId, token: client.token },
        { $pull: { attachedInstances: instanceId } }
      );

      return await interaction.reply({ content: "Instancja została pomyślnie odłączona.", ephemeral: true });
    }
  },

  autocomplete: async ({ client, interaction }) => {
    const focusedOption = interaction.options.getFocused(true);
    const subCommand = interaction.options.getSubcommand();

    let choices: string[] = [];

    if (subCommand === "detach" && focusedOption.name === "instance-id") {
      const attachedInstances: AttachedInstances | null = await attachedInstancesSchema.findOne({
        guild: interaction.guildId,
        token: client.token,
      });

      if (!attachedInstances) return await interaction.respond([]);

      choices = choices.concat(attachedInstances.attachedInstances || []);
    }

    const filtered = choices.filter((choice) => choice.startsWith(focusedOption.value));

    await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
  },
});
