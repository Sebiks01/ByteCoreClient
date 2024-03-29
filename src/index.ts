import { GatewayIntentBits } from "discord.js";
import "dotenv/config";

import { ByteCoreClient } from "./structures/ByteCoreClient";

const { Guilds, GuildMembers, GuildMessages, MessageContent } = GatewayIntentBits;

const client = new ByteCoreClient({
  intents: [Guilds, GuildMembers, GuildMessages, MessageContent],
});

client.start();
