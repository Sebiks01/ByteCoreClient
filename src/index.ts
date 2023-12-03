import { GatewayIntentBits } from "discord.js";
import "dotenv/config";

import { ByteCoreClient } from "./structures/ByteCoreClient";

const { Guilds, GuildMembers } = GatewayIntentBits;

const client = new ByteCoreClient({
  intents: [Guilds, GuildMembers],
});

client.start();
