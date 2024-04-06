import {
  APIEmbed,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  GuildTextBasedChannel,
  JSONEncodable,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Command } from "../../structures/Command";
import boostRewardMessagesSchema, { BoostRewardMessages } from "../../models/boost-reward-messages";
import attachedInstancesSchema, { AttachedInstances } from "../../models/attached-instances";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("boost-reward")
    .setDescription("Manages boost rewards.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("send-message")
        .setDescription("Sends boost reward manager embed.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to send the message to.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Custom message in JSON format. Use discohook.org to generate.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add bytecore instance.")
        .addStringOption((option) =>
          option
            .setName("instance-id")
            .setDescription("ByteCore instance id (earlier verified).")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("style")
            .setDescription("Reward button style.")
            .setChoices(
              { name: "Primary", value: "Primary" },
              { name: "Secondary", value: "Secondary" },
              { name: "Success", value: "Success" },
              { name: "Danger", value: "Danger" }
            )
            .setRequired(true)
        )
        .addStringOption((option) => option.setName("label").setDescription("Reward button label.").setRequired(true))
        .addStringOption((option) => option.setName("emoji").setDescription("Reward button emoji.").setRequired(false))
        .addStringOption((option) =>
          option
            .setName("modal-title")
            .setDescription("Discord reward modal title.")
            .setMaxLength(45)
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("modal-label")
            .setDescription("Discord reward modal label.")
            .setMaxLength(45)
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("modal-placeholder")
            .setDescription("Discord reward modal placeholder.")
            .setMaxLength(100)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove bytecore instance.")
        .addStringOption((option) =>
          option.setName("instance-id").setDescription("ByteCore instance id.").setRequired(true).setAutocomplete(true)
        )
    ),

  execute: async ({ interaction, args, client }) => {
    if (!interaction.guild) {
      return await interaction.reply({ content: "Ta komenda jest dostępna tylko na serwerze." });
    }

    await interaction.deferReply({ ephemeral: true });

    const subcommand = args.getSubcommand();

    if (subcommand === "send-message") {
      const channel = args.getChannel("channel") as GuildTextBasedChannel;
      let jsonMessage = args.getString("message");

      let sentMessage;

      try {
        interface IJSONMessage {
          content?: string;
          embeds?: (APIEmbed | JSONEncodable<APIEmbed>)[];
        }

        if (!jsonMessage) {
          sentMessage = await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("ByteCore - Nagroda za boost")
                .setDescription(
                  "- Aby odebrać nagrodę za boost, wybierz serwer poniżej i wypełnij formularz. \n- Upewnij się, że jesteś obecny na serwerze."
                )
                .setColor(0x5512ff)
                .setFooter({
                  text: "ByteCore@2024",
                  iconURL: "https://cdn.discordapp.com/icons/1112725777855819849/c659c424e678179688a452d39c9ae77d",
                })
                .toJSON(),
            ],
          });
        } else {
          sentMessage = await channel.send({
            content: (JSON.parse(jsonMessage) as IJSONMessage).content,
            embeds: (JSON.parse(jsonMessage) as IJSONMessage).embeds,
          });
        }
      } catch {
        return await interaction.editReply({
          content: "Niepoprawny format wiadomości. Użyj [discohook.org](https://discohook.org/) do generowania JSON.",
        });
      }

      await boostRewardMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        { $set: { channelId: channel.id, messageId: sentMessage.id } },
        { new: true, upsert: true }
      );

      return await interaction.editReply({
        content: "Wiadomość wysłana pomyślnie.",
      });
    }

    const instanceId = args.getString("instance-id") as string;

    if (subcommand === "add") {
      const style = args.getString("style") as "Primary" | "Secondary" | "Success" | "Danger";
      const label = args.getString("label") as string;
      const emoji = args.getString("emoji");
      const modalTitle = args.getString("modal-title") || "ByteCore - Nagroda za boost";
      const modalLabel = args.getString("modal-label") || "Nick na serwerze";
      const modalPlaceholder = args.getString("modal-placeholder") || "Wpisz swój nick na serwerze";

      const rewardMessage = await boostRewardMessagesSchema.findOne({
        token: client.token,
        guildId: interaction.guildId,
      });

      if (!rewardMessage) {
        return await interaction.editReply({ content: "Nie znaleziono wiadomości z nagrodą." });
      }

      const attachedByteCoreInstances = (rewardMessage as BoostRewardMessages).attachedByteCoreInstances;

      if (attachedByteCoreInstances.length == 25) {
        return await interaction.editReply({ content: "Możesz dołączyć tylko 25 instancji." });
      }

      const attachedInstances = await attachedInstancesSchema.findOne({ guild: interaction.guildId });

      if (!attachedInstances) {
        return await interaction.editReply({ content: "Instancja niezweryfikowana." });
      }

      if (!(attachedInstances as AttachedInstances).attachedInstances?.includes(instanceId)) {
        return await interaction.editReply({ content: "Instancja niezweryfikowana." });
      }

      if (attachedByteCoreInstances.find((instance) => instance.instanceId === instanceId)) {
        return await interaction.editReply({ content: "Instancja jest już dołączona." });
      }

      attachedByteCoreInstances.push({
        instanceId,
        style,
        label,
        emoji,
        modal: {
          title: modalTitle,
          inputLabel: modalLabel,
          inputPlaceholder: modalPlaceholder,
        },
      });

      const channel = await interaction.guild.channels.fetch(rewardMessage.channelId);

      if (!channel) {
        return await interaction.editReply({ content: "Kanał nie został znaleziony." });
      }

      const message = await (channel as GuildTextBasedChannel).messages.fetch(rewardMessage.messageId);

      if (!message) {
        return await interaction.editReply({ content: "Wiadomość nie została znaleziona." });
      }

      const components = [];
      let row = new ActionRowBuilder<ButtonBuilder>();

      for (let i = 0; i < attachedByteCoreInstances.length; i++) {
        if (i > 0 && i % 5 === 0) {
          components.push(row);
          row = new ActionRowBuilder<ButtonBuilder>();
        }

        const button = new ButtonBuilder()
          .setCustomId(`bytecore-boostreward_${attachedByteCoreInstances[i].instanceId}`)
          .setStyle(ButtonStyle[attachedByteCoreInstances[i].style])
          .setLabel(attachedByteCoreInstances[i].label);

        if (attachedByteCoreInstances[i].emoji) button.setEmoji(attachedByteCoreInstances[i].emoji as string);

        row.addComponents(button);
      }

      if (row.components.length > 0) {
        components.push(row);
      }

      await message.edit({
        embeds: message.embeds,
        components: components,
      });

      await boostRewardMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        { attachedByteCoreInstances }
      );

      return await interaction.editReply({ content: "Instancja została pomyślnie dołączona." });
    }

    if (subcommand === "remove") {
      const rewardMessage = await boostRewardMessagesSchema.findOne({
        token: client.token,
        guildId: interaction.guildId,
      });

      if (!rewardMessage) {
        return await interaction.editReply({ content: "Nie znaleziono wiadomości z nagrodą." });
      }

      const attachedByteCoreInstances = (rewardMessage as BoostRewardMessages).attachedByteCoreInstances;

      if (!attachedByteCoreInstances.find((instance) => instance.instanceId === instanceId)) {
        return await interaction.editReply({ content: "Instancja nie jest dołączona." });
      }

      const filtered = attachedByteCoreInstances.filter((instance) => instance.instanceId !== instanceId);

      const channel = await interaction.guild.channels.fetch(rewardMessage.channelId);

      if (!channel) {
        return await interaction.editReply({ content: "Kanał nie został znaleziony." });
      }

      const message = await (channel as GuildTextBasedChannel).messages.fetch(rewardMessage.messageId);

      if (!message) {
        return await interaction.editReply({ content: "Wiadomość nie została znaleziona." });
      }

      const components = [];
      let row = new ActionRowBuilder<ButtonBuilder>();

      for (let i = 0; i < filtered.length; i++) {
        if (i > 0 && i % 5 === 0) {
          components.push(row);
          row = new ActionRowBuilder<ButtonBuilder>();
        }

        const button = new ButtonBuilder()
          .setCustomId(`bytecore-boostreward_${filtered[i].instanceId}`)
          .setStyle(ButtonStyle[filtered[i].style])
          .setLabel(filtered[i].label);

        if (filtered[i].emoji) button.setEmoji(filtered[i].emoji as string);

        row.addComponents(button);
      }

      if (row.components.length > 0) {
        components.push(row);
      }

      await message.edit({
        embeds: message.embeds,
        components: components,
      });

      await boostRewardMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        {
          $set: { attachedByteCoreInstances: filtered },
        }
      );

      return await interaction.editReply({ content: "Instancja została pomyślnie usunięta." });
    }
  },

  autocomplete: async ({ interaction, client }) => {
    const focusedOption = interaction.options.getFocused(true);
    const subCommand = interaction.options.getSubcommand();

    let choices: string[] = [];

    const rewardMessage: BoostRewardMessages | null = await boostRewardMessagesSchema.findOne({
      token: client.token,
      guildId: interaction.guildId,
    });

    const attachedInstances: AttachedInstances | null = await attachedInstancesSchema.findOne({
      guild: interaction.guildId,
    });

    if (!rewardMessage) return await interaction.respond([]);
    if (!attachedInstances) return await interaction.respond([]);

    const attachedByteCoreInstances = (rewardMessage as BoostRewardMessages).attachedByteCoreInstances;

    if (subCommand === "add" && focusedOption.name === "instance-id") {
      choices = choices.concat(
        attachedInstances.attachedInstances?.filter(
          (instance) => !attachedByteCoreInstances.map((instance) => instance.instanceId).includes(instance)
        ) || []
      );
    }

    if (subCommand === "remove" && focusedOption.name === "instance-id") {
      choices = choices.concat(rewardMessage.attachedByteCoreInstances.map((instance) => instance.instanceId));
    }

    const filtered = choices.filter((choice) => choice.startsWith(focusedOption.value));

    await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
  },
});
