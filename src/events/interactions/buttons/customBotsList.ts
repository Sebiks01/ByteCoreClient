import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { ByteCoreClient } from "../../../structures/ByteCoreClient";

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    if (
      !interaction.isButton() ||
      !interaction.customId.startsWith("bytecore-custombots-list-") ||
      !(client instanceof ByteCoreClient)
    )
      return;

    await interaction.deferUpdate();

    const page = parseInt(interaction.customId.split("-").pop() as string);

    if (isNaN(page)) return;

    const { customClients } = client;

    const runningCustomClients = customClients.filter((customClient) => customClient.running);

    let description = `**Loaded:** ${customClients.size} |  **Running:** ${runningCustomClients.size}\n`;

    for (let i = (page - 1) * 5; i < page * 5 && i < customClients.size; i++) {
      description += `\`\`\`\nName: ${customClients.at(i)?.name}\nToken: ${customClients.at(i)?.token}\nRunning: ${
        customClients.at(i)?.running
      }\n\`\`\``;
    }

    const embed = new EmbedBuilder()
      .setTitle("Custom Bots List")
      .setDescription(description)
      .setColor(16121600)
      .setFooter({
        text: `ByteCore@2023`,
        iconURL: client.user?.displayAvatarURL(),
      });

    const components = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(`bytecore-custombots-list-${page - 1}`)
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page == 1 ? true : false),
      new ButtonBuilder()
        .setCustomId(`bytecore-custombots-list-${page + 1}`)
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page == Math.ceil(customClients.size / 5) ? true : false)
    );

    await interaction.message.edit({
      embeds: [embed],
      components: [components],
    });

    return;
  },
});
