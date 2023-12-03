import { ChannelType, Events } from "discord.js";

import { Event } from "../../structures/Event";
import discordRewardMessagesSchema from "../../models/discord-reward-messages";

export default new Event({
  name: Events.ChannelDelete,
  
  execute: async (client, channel) => {
    if (channel.type !== ChannelType.GuildText) return;

    await discordRewardMessagesSchema.deleteOne({
      token: client.token,
      guildId: channel.guildId,
      channelId: channel.id,
    });
  },
});
