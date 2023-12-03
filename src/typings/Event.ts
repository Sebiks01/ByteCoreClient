import { ClientEvents, Awaitable } from "discord.js";

import { ByteCoreClient } from "../structures/ByteCoreClient";
import { CustomClient } from "../structures/CustomClient";

export enum EventStatus {
  Enabled = "✅",
  Disabled = "🛑",
}

interface EventsTableElement {
  Event: string;
  Type: keyof ClientEvents | "✖";
  Status: EventStatus;
}

export type EventsTable = EventsTableElement[];

type ExecuteFunction<ClientEvent extends keyof ClientEvents> = (
  client: ByteCoreClient | CustomClient,
  ...args: ClientEvents[ClientEvent]
) => Awaitable<void>;

export type EventType<ClientEvent extends keyof ClientEvents> = {
  name: ClientEvent;
  once?: boolean;
  execute: ExecuteFunction<ClientEvent>;
};
