import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { Command } from "../../structures/Command";
import { CustomClient } from "../../structures/CustomClient";
import userBotsSchema from "../../models/user-bots";

const { Guilds, GuildMembers } = GatewayIntentBits;

export default new Command({
  coreOnly: true,
  data: new SlashCommandBuilder()
    .setName("custom-bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDescription("Creates a custom bot to manage a bytecore instance.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Creates a custom bot instance.")
        .addStringOption((option) =>
          option.setName("bot-name").setDescription("The name of the bot you want to create.").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("bot-token").setDescription("The token of the bot you want to create.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Deletes a custom bot instance.")
        .addStringOption((option) =>
          option.setName("bot-name").setDescription("The name of the bot you want to delete.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("Lists custom bots.")),

  execute: async ({ interaction, args, client }) => {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = args.getSubcommand() as string;

    if (subcommand === "create") {
      const token = args.getString("bot-token") as string;
      const name = args.getString("bot-name") as string;

      const customClient = new CustomClient({
        intents: [Guilds, GuildMembers],
      });

      const clientStarted = await customClient.start(token, name, interaction);

      if (!clientStarted) return;

      await userBotsSchema.updateOne(
        {
          name,
        },
        { $set: { name, token } },
        {
          new: true,
          upsert: true,
        }
      );

      client.customClients.set(name, customClient);

      return await interaction.editReply({
        content: "Utworzono instancję bota.",
      });
    }

    if (subcommand === "delete") {
      const name = args.getString("bot-name") as string;

      const result = await userBotsSchema.findOneAndDelete({
        name,
      });

      if (!result) {
        return await interaction.editReply({
          content: "Instancja bota nie została znaleziona.",
        });
      }

      client.customClients.delete(name);

      return await interaction.editReply({
        content: "Usunięto instancję bota.",
      });
    }

    if (subcommand === "list") {
      const { customClients } = client;

      const runningCustomClients = customClients.filter((customClient) => customClient.running);

      let description = `**Załadowanych:** ${customClients.size} |  **Odpalonych:** ${runningCustomClients.size}\n`;

      for (let i = 0; i < 5 && i < customClients.size; i++) {
        description += `\`\`\`\nNazwa: ${customClients.at(i)?.name}\nToken: ${customClients.at(i)?.token}\nOdpalony: ${
          customClients.at(i)?.running
        }\n\`\`\``;
      }

      const embed = new EmbedBuilder()
        .setTitle("Lista Niestandardowych Botów")
        .setDescription(description)
        .setColor(16121600)
        .setFooter({
          text: `ByteCore@2024`,
          iconURL: client.user?.displayAvatarURL(),
        });

      if (customClients.size > 5) {
        const components = new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(`bytecore-custombots-list-0`)
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder().setCustomId(`bytecore-custombots-list-2`).setEmoji("➡️").setStyle(ButtonStyle.Secondary)
        );

        return await interaction.editReply({
          embeds: [embed],
          components: [components],
        });
      }

      return await interaction.editReply({
        embeds: [embed],
      });
    }
  },
});
