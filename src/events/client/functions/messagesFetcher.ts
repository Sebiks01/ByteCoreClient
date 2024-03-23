import { ChannelType, Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { ByteCoreClient } from "../../../structures/ByteCoreClient";
import { Response } from "../../../typings/api";
import api from "../../../api";
import userBotsSchema from "../../../models/user-bots";

export default new Event({
  name: Events.ClientReady,
  once: true,

  execute: async (client) => {
    if (!(client instanceof ByteCoreClient)) return;

    const run = async () => {
      const messages = await api.system.messagesToSend();

      if (messages != Response.InvalidRequest) {
        for (const message of messages) {
          const coreId = message["core-id"];
          const channelId = message["channel-id"];
          const messageJson = JSON.parse(message["message-json"]);

          const userBot = await userBotsSchema.findOne({ attachedInstances: coreId });

          if (!userBot) continue;

          const customClient = client.customClients.find((c) => c.token === userBot.token);

          if (!customClient) continue;

          const channel = await customClient.channels.fetch(channelId);

          if (!channel || channel.type !== ChannelType.GuildText) continue;

          await channel.send(messageJson);
        }
      }

      setTimeout(run, 1000 * 10);
    };

    run();
  },
});
