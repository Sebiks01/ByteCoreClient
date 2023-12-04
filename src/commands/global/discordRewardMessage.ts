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
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../../models/discord-reward-messages";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("discord-reward")
    .setDescription("Manages discord rewards.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("send-message")
        .setDescription("Sends discord reward manager embed.")
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
          option.setName("instance-id").setDescription("ByteCore instance id.").setRequired(true)
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
          option.setName("instance-id").setDescription("ByteCore instance id.").setRequired(true)
        )
    ),

  execute: async ({ interaction, args, client }) => {
    if (!interaction.guild) {
      return await interaction.reply({ content: "This command can only be used in a server." });
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
                .setTitle("ByteCore - Discord Reward")
                .setDescription(
                  "- To claim your reward choose a server below and fill out the form. \n- Make sure to be present on the server."
                )
                .setColor(0x5512ff)
                .setFooter({
                  text: "ByteCore@2023",
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
          content: "Incorrect message format. Use [discohook.org](https://discohook.org/) to generate JSON.",
        });
      }

      await discordRewardMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        { $set: { channelId: channel.id, messageId: sentMessage.id } },
        { new: true, upsert: true }
      );

      return await interaction.editReply({
        content: "Message sent successfully.",
      });
    }

    const instanceId = args.getString("instance-id") as string;

    if (subcommand === "add") {
      const style = args.getString("style") as "Primary" | "Secondary" | "Success" | "Danger";
      const label = args.getString("label") as string;
      const emoji = args.getString("emoji");
      const modalTitle = args.getString("modal-title") || "ByteCore - Discord Reward";
      const modalLabel = args.getString("modal-label") || "Player name";
      const modalPlaceholder = args.getString("modal-placeholder") || "Type your name here...";

      const rewardMessage = await discordRewardMessagesSchema.findOne({
        token: client.token,
        guildId: interaction.guildId,
      });

      if (!rewardMessage) {
        return await interaction.editReply({ content: "No reward message found." });
      }

      const attachedByteCoreInstances = (rewardMessage as DiscordRewardMessages).attachedByteCoreInstances;

      if (attachedByteCoreInstances.length == 25) {
        return await interaction.editReply({ content: "You can only attach 25 instances." });
      }

      if (attachedByteCoreInstances.find((instance) => instance.instanceId === instanceId)) {
        return await interaction.editReply({ content: "Instance already attached." });
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
        return await interaction.editReply({ content: "Channel not found." });
      }

      const message = await (channel as GuildTextBasedChannel).messages.fetch(rewardMessage.messageId);

      if (!message) {
        return await interaction.editReply({ content: "Message not found." });
      }

      const components = [];
      let row = new ActionRowBuilder<ButtonBuilder>();

      for (let i = 0; i < attachedByteCoreInstances.length; i++) {
        if (i > 0 && i % 5 === 0) {
          components.push(row);
          row = new ActionRowBuilder<ButtonBuilder>();
        }

        const button = new ButtonBuilder()
          .setCustomId(`bytecore-discordreward_${attachedByteCoreInstances[i].instanceId}`)
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

      await discordRewardMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        { attachedByteCoreInstances }
      );

      return await interaction.editReply({ content: "Instance attached successfully." });
    }

    if (subcommand === "remove") {
      const rewardMessage = await discordRewardMessagesSchema.findOne({
        token: client.token,
        guildId: interaction.guildId,
      });

      if (!rewardMessage) {
        return await interaction.editReply({ content: "No reward message found." });
      }

      const attachedByteCoreInstances = (rewardMessage as DiscordRewardMessages).attachedByteCoreInstances;

      if (!attachedByteCoreInstances.find((instance) => instance.instanceId === instanceId)) {
        return await interaction.editReply({ content: "Instance not attached." });
      }

      const filtered = attachedByteCoreInstances.filter((instance) => instance.instanceId !== instanceId);

      const channel = await interaction.guild.channels.fetch(rewardMessage.channelId);

      if (!channel) {
        return await interaction.editReply({ content: "Channel not found." });
      }

      const message = await (channel as GuildTextBasedChannel).messages.fetch(rewardMessage.messageId);

      if (!message) {
        return await interaction.editReply({ content: "Message not found." });
      }

      const components = [];
      let row = new ActionRowBuilder<ButtonBuilder>();

      for (let i = 0; i < filtered.length; i++) {
        if (i > 0 && i % 5 === 0) {
          components.push(row);
          row = new ActionRowBuilder<ButtonBuilder>();
        }

        const button = new ButtonBuilder()
          .setCustomId(`bytecore-discordreward_${filtered[i].instanceId}`)
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

      await discordRewardMessagesSchema.updateOne(
        { token: client.token, guildId: interaction.guildId },
        {
          $set: { attachedByteCoreInstances: filtered },
        }
      );

      return await interaction.editReply({ content: "Instance removed successfully." });
    }
  },
});
