import { Events } from "discord.js";

import { Event } from "../../structures/Event";
import discordRewardMessagesSchema from "../../models/discord-reward-messages";
import boostRewardMessagesSchema from "../../models/boost-reward-messages";

export default new Event({
  name: Events.MessageDelete,

  execute: async (client, message) => {
    await discordRewardMessagesSchema.deleteOne({
      token: client.token,
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
    });

    await boostRewardMessagesSchema.deleteOne({
      token: client.token,
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
    });
  },
});
