import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { Command } from "../../structures/Command";
import userBotsSchema, { UserBots } from "../../models/user-bots";
import api from "../../api";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("discord-reward")
    .setDescription("Manages discord rewards.")
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
      return await interaction.reply({ content: "This command can only be used in a server." });
    }

    const subcommand = args.getSubcommand();

    const instanceId = args.getString("instance-id") as string;

    const customClientSettings: UserBots | null = await userBotsSchema.findOne({ token: client.token });

    if (!customClientSettings) {
      return await interaction.reply({
        content: "Database error. Data missing. Contact an administrator.",
        ephemeral: true,
      });
    }

    if (subcommand === "attach") {
      if (customClientSettings?.attachedInstances?.includes(instanceId)) {
        return await interaction.reply({ content: "Instance already attached.", ephemeral: true });
      }

      const userBot = await userBotsSchema.findOne({ attachedInstances: instanceId });

      if (userBot) {
        return await interaction.reply({ content: "Instance already attached to another bot.", ephemeral: true });
      }

      const linkCode = await api.system.linkInstance(instanceId, client.user?.username || " ");

      const linkModal = new ModalBuilder()
        .setCustomId(`bytecore-linkInstance_${instanceId}_${linkCode}`)
        .setTitle("Linking Instance")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("input1")
              .setStyle(TextInputStyle.Short)
              .setLabel("Link Code")
              .setPlaceholder("Paste the link code here")
              .setRequired(true)
          )
        );

      return await interaction.showModal(linkModal);
    }

    if (subcommand === "detach") {
      if (!customClientSettings?.attachedInstances?.includes(instanceId)) {
        return await interaction.reply({ content: "Instance not attached.", ephemeral: true });
      }

      await userBotsSchema.updateOne({ token: client.token }, { $pull: { attachedInstances: instanceId } });

      return await interaction.reply({ content: "Instance detached successfully.", ephemeral: true });
    }
  },

  autocomplete: async ({ client, interaction }) => {
    const focusedOption = interaction.options.getFocused(true);
    const subCommand = interaction.options.getSubcommand();

    const choices: string[] = [];

    if (subCommand === "detach" && focusedOption.name === "instance-id") {
      const customClientSettings: UserBots | null = await userBotsSchema.findOne({ token: client.token });

      if (!customClientSettings) return await interaction.respond([]);

      choices.concat(customClientSettings.attachedInstances || []);
    }

    const filtered = choices.filter((choice) => choice.startsWith(focusedOption.value));

    await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
  },
});
