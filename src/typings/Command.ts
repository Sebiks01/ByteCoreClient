import {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  AutocompleteInteraction,
  SlashCommandBuilder,
  CacheType,
  GuildMember,
} from "discord.js";

import { ByteCoreClient } from "../structures/ByteCoreClient";
import { CustomClient } from "../structures/CustomClient";

export enum CommandScope {
  Test = "Test",
  Core = "Core",
  Global = "Global",
  Unregistered = "✖",
}

export enum CommandStatus {
  Enabled = "✅",
  Disabled = "🛑",
}

interface CommandsTableElement {
  Command: string;
  Scope: CommandScope;
  Status: CommandStatus;
}

export type CommandsTable = CommandsTableElement[];

export interface ExtendedChatInputCommandInteraction extends ChatInputCommandInteraction {
  member: GuildMember;
}

interface ExecuteOptions<coreOnly extends boolean> {
  client: coreOnly extends true ? ByteCoreClient : ByteCoreClient | CustomClient;
  interaction: ExtendedChatInputCommandInteraction;
  args: Omit<CommandInteractionOptionResolver<CacheType>, "getMessage" | "getFocused">;
}

interface AutocompleteOptions<coreOnly extends boolean> {
  client: coreOnly extends true ? ByteCoreClient : ByteCoreClient | CustomClient;
  interaction: AutocompleteInteraction;
}

type ExecuteFunction<coreOnly extends boolean> = (options: ExecuteOptions<coreOnly>) => unknown;

type AutocompleteFunction<coreOnly extends boolean> = (options: AutocompleteOptions<coreOnly>) => unknown;

export type CommandType<coreOnly extends boolean> = {
  coreOnly?: coreOnly;
  testOnly?: boolean;
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    | Omit<
        SlashCommandBuilder,
        | "addBooleanOption"
        | "addUserOption"
        | "addChannelOption"
        | "addRoleOption"
        | "addAttachmentOption"
        | "addMentionableOption"
        | "addStringOption"
        | "addIntegerOption"
        | "addNumberOption"
      >;
  execute: ExecuteFunction<coreOnly>;
  autocomplete?: AutocompleteFunction<coreOnly>;
};
