import { GatewayIntentBits } from "discord.js";
import { writeFile } from "fs/promises";
import * as path from "path";
import "dotenv/config";

import { ByteCoreClient } from "./structures/ByteCoreClient";

const { Guilds, GuildMembers, GuildMessages, MessageContent } = GatewayIntentBits;

const client = new ByteCoreClient({
  intents: [Guilds, GuildMembers, GuildMessages, MessageContent],
});

process.on("uncaughtException", (error) => {
  const jsonError = JSON.stringify({
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
  });

  writeFile(path.join(__dirname, "last-error-log.json"), jsonError, "utf-8");
});

client.start();
