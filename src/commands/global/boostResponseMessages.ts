import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { Command } from "../../structures/Command";
import boostResponseMessagesSchema from "../../models/boost-response-messages";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("boost-response-messages")
    .setDescription("Manages boost response messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set a custom message.")
        .addStringOption((option) =>
          option
            .setName("message-type")
            .setDescription("The message you want to change.")
            .setChoices(
              { name: "Collected", value: "collected" },
              { name: "Cooldown", value: "cooldown" },
              { name: "Offline", value: "offline" },
              { name: "Disabled", value: "disabled" }
            )
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Custom message in JSON format. Use discohook.org to generate.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription("Reset a custom message to it's default value.")
        .addStringOption((option) =>
          option
            .setName("message-type")
            .setDescription("The message you want to reset.")
            .setChoices(
              { name: "Collected", value: "collected" },
              { name: "Cooldown", value: "cooldown" },
              { name: "Offline", value: "offline" },
              { name: "Disabled", value: "disabled" }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Reset all custom messages to their default value.")
    ),

  execute: async ({ interaction, args, client }) => {
    const subCommand = args.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    if (subCommand === "set") {
      const message = args.getString("message") as string;
      const messageType = args.getString("message-type") as string;

      try {
        JSON.parse(message);
      } catch (err) {
        return await interaction.editReply({
          content: "Incorrect message format. Use [discohook.org](https://discohook.org/) to generate JSON.",
        });
      }

      await boostResponseMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        { token: client.token, guildId: interaction.guildId, [messageType]: message },
        { upsert: true, new: true }
      );

      return await interaction.editReply({
        content: `Successfully set the ${args.getString("message-type")} message.`,
      });
    }

    if (subCommand === "reset") {
      const messageType = args.getString("message-type") as string;

      await boostResponseMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        { token: client.token, guildId: interaction.guildId, [messageType]: null },
        { upsert: true, new: true }
      );

      return await interaction.editReply({
        content: `Successfully reset the ${args.getString("message-type")} message.`,
      });
    }

    if (subCommand === "clear") {
      await boostResponseMessagesSchema.deleteOne({ token: client.token, guildId: interaction.guildId });

      return await interaction.editReply({
        content: `Successfully reset all custom messages.`,
      });
    }
  },
});
