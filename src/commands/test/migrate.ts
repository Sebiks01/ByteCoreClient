import { SlashCommandBuilder } from "discord.js";

import { Command } from "../../structures/Command";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../../models/discord-reward-messages";
import attachedInstancesSchema, { AttachedInstances } from "../../models/attached-instances";
import { info, success } from "../../util/logger";

export default new Command({
  testOnly: true,
  data: new SlashCommandBuilder().setName("migrate").setDescription("Migrate dev command."),

  execute: async ({ interaction }) => {
    const toMigarte: DiscordRewardMessages[] = await discordRewardMessagesSchema.find();

    for (const data of toMigarte) {
      const { token, guildId, attachedByteCoreInstances } = data;

      await interaction.deferReply({ ephemeral: true });

      info(`Migrating data for token: ${token}.`);

      let alreadyAttached: string[] = [];

      const attachedInstances: AttachedInstances | null = await attachedInstancesSchema.findOne({
        guild: guildId,
        token,
      });

      if (!attachedInstances) {
        await attachedInstancesSchema.create({ guild: guildId, token, attachedInstances: [] });
      } else {
        alreadyAttached = attachedInstances.attachedInstances || [];
      }

      const instancesToMigrate = attachedByteCoreInstances.map((instance) => instance.instanceId);

      const migrated = (alreadyAttached || []).concat(
        instancesToMigrate.filter((instance) => !alreadyAttached.includes(instance))
      );

      await attachedInstancesSchema.updateOne({ guild: guildId, token }, { attachedInstances: migrated });

      success(`Migration successful for token: ${token}.`);

      await interaction.editReply({ content: "Migration successful." });
    }
  },
});
