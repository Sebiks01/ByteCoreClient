import { SlashCommandBuilder } from "discord.js";

import { Command } from "../../structures/Command";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../../models/discord-reward-messages";
import userBotsSchema, { UserBots } from "../../models/user-bots";
import { warn, info, success } from "../../util/logger";

export default new Command({
  testOnly: true,
  data: new SlashCommandBuilder().setName("migrate").setDescription("Check bot latency."),

  execute: async () => {
    const toMigarte: DiscordRewardMessages[] = await discordRewardMessagesSchema.find();

    for (const data of toMigarte) {
      const { token } = data;

      info(`Migrating data for token: ${token}.`);

      const userBots: UserBots | null = await userBotsSchema.findOne({ token });

      if (!userBots) {
        warn(`UserBots not found for token: ${token}.`);
        warn(`Skipping migration for token: ${token}.`);
        continue;
      }

      const instancesToMigrate = data.attachedByteCoreInstances.map((instance) => instance.instanceId);

      const migrated = (userBots.attachedInstances || []).concat(
        instancesToMigrate.filter((instance) => !userBots.attachedInstances?.includes(instance))
      );

      await userBotsSchema.updateOne({ token }, { attachedInstances: migrated });

      success(`Migration successful for token: ${token}.`);
    }
  },
});
