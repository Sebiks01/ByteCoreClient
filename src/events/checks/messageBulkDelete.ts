import { ChannelType, Events } from "discord.js";

import { Event } from "../../structures/Event";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../../models/discord-reward-messages";

export default new Event({
  name: Events.MessageBulkDelete,
  
  execute: async (client, messages, channel) => {
    if (channel.type !== ChannelType.GuildText) return;
    if (messages.size === 0) return;

    const result = await discordRewardMessagesSchema.findOne({
      token: client.token,
      guildId: channel.guildId,
      channelId: channel.id,
    });

    if (!result) return;

    for (const message of messages.values()) {
      if ((result as DiscordRewardMessages).messageId !== message.id) continue;

      await discordRewardMessagesSchema.deleteOne({
        token: client.token,
        guildId: channel.guildId,
        channelId: channel.id,
        messageId: message.id,
      });
    }
  },
});
