import { PermissionFlagsBits, SlashCommandBuilder, GatewayIntentBits } from "discord.js";

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
    .addStringOption((option) =>
      option.setName("bot-name").setDescription("The name of the bot you want to create.").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("bot-token").setDescription("The token of the bot you want to create.").setRequired(true)
    ),

  execute: async ({ interaction, args }) => {
    await interaction.deferReply({ ephemeral: true });

    const token = args.getString("bot-token") as string;
    const name = args.getString("bot-name") as string;

    const client = new CustomClient({
      intents: [Guilds, GuildMembers],
    });

    const clientStarted = await client.start(token, name, interaction);

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

    await interaction.editReply({
      content: "Created bot instance.",
    });
  },
});
