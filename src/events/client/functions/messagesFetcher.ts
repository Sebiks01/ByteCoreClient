import { ChannelType, Events } from "discord.js";

import { Event } from "../../../structures/Event";
import { ByteCoreClient } from "../../../structures/ByteCoreClient";
import { Response } from "../../../typings/api";
import api from "../../../api";
import attachedInstancesSchema, { AttachedInstances } from "../../../models/attached-instances";

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

          const attachedInstances: AttachedInstances[] = await attachedInstancesSchema.find({
            attachedInstances: coreId,
          });

          if (!attachedInstances) continue;

          for (const instance of attachedInstances) {
            const customClient =
              instance.token == client.token ? client : client.customClients.find((c) => c.token === instance.token);

            if (!customClient) continue;

            const guild = await client.guilds.fetch(instance.guild);

            if (!guild) continue;

            const channel = await guild.channels.fetch(channelId);

            if (!channel || channel.type !== ChannelType.GuildText) continue;

            await channel.send(messageJson);
          }
        }
      }

      setTimeout(run, 1000 * 10);
    };

    run();
  },
});
