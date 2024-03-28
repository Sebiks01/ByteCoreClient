import { ChannelType, Events } from "discord.js";

import { Event } from "../../structures/Event";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../../models/discord-reward-messages";
import boostRewardMessagesSchema, { BoostRewardMessages } from "../../models/boost-reward-messages";

export default new Event({
  name: Events.MessageBulkDelete,

  execute: async (client, messages, channel) => {
    if (channel.type !== ChannelType.GuildText) return;
    if (messages.size === 0) return;

    const result1 = await discordRewardMessagesSchema.findOne({
      token: client.token,
      guildId: channel.guildId,
      channelId: channel.id,
    });

    const result2 = await boostRewardMessagesSchema.findOne({
      token: client.token,
      guildId: channel.guildId,
      channelId: channel.id,
    });

    if (!result1 && !result2) return;

    for (const message of messages.values()) {
      if ((result1 as DiscordRewardMessages).messageId === message.id) {
        await discordRewardMessagesSchema.deleteOne({
          token: client.token,
          guildId: channel.guildId,
          channelId: channel.id,
          messageId: message.id,
        });
      }

      if ((result2 as BoostRewardMessages).messageId !== message.id) continue;

      await boostRewardMessagesSchema.deleteOne({
        token: client.token,
        guildId: channel.guildId,
        channelId: channel.id,
        messageId: message.id,
      });
    }
  },
});
