import {
  Client,
  Collection,
  ApplicationCommandDataResolvable,
  ClientEvents,
  ClientOptions,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";

import { coreGuildId, testGuildId } from "../../config.json";
import { loadFiles, importFile } from "../util/files-loader";
import { mongoConnect } from "../util/storage-connector";
import { EventStatus, EventType, EventsTable } from "../typings/Event";
import { CommandScope, CommandStatus, CommandType, CommandsTable } from "../typings/Command";
import { byteCore, info, warn, error, debug, timerStart, timerEnd, table } from "../util/logger";
import { CustomClient } from "./CustomClient";
import userBotsSchema, { UserBots } from "../models/user-bots";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../models/discord-reward-messages";
import rewardResponseMessagesSchema, { RewardResponseMessages } from "../models/reward-response-messages";
import boostRewardMessagesSchema, { BoostRewardMessages } from "../models/boost-reward-messages";
import boostResponseMessagesSchema, { BoostResponseMessages } from "../models/boost-response-messages";
import attachedInstancesSchema, { AttachedInstances } from "../models/attached-instances";
import api from "../api";

const { Guilds, GuildMembers } = GatewayIntentBits;

export class ByteCoreClient extends Client {
  private _commands: Collection<string, CommandType<boolean>> = new Collection();
  private _events: EventType<keyof ClientEvents>[] = new Array();
  private _customClients: Collection<string, CustomClient> = new Collection();
  private _api = api;

  constructor(options: ClientOptions) {
    super(options);
  }

  public async start() {
    byteCore();

    if (!process.env.TOKEN) {
      error("No token provided.");
      process.exit(1);
    }

    this.login(process.env.TOKEN as string).catch((err) => {
      debug(`Token: ${process.env.TOKEN}`);
      error("Invalid token provided.");
      console.log(err);

      process.exit(1);
    });

    await mongoConnect();

    await this.loadEvents();
  }

  public async loadEvents() {
    info("Loading events...");
    timerStart("Loaded events in");

    const eventFilePaths = await loadFiles("events");

    const eventsTable: EventsTable = new Array();

    for (const eventFilePath of eventFilePaths) {
      const eventFileName = eventFilePath.split("/").pop() || "Unknown";

      try {
        const event: EventType<keyof ClientEvents> = await importFile(eventFilePath);

        this._events.push(event);

        eventsTable.push({
          Event: eventFileName,
          Type: event.name,
          Status: EventStatus.Enabled,
        });
      } catch (err) {
        eventsTable.push({
          Event: eventFileName,
          Type: "✖",
          Status: EventStatus.Disabled,
        });

        warn(`Unable to load event file "${eventFileName}".`);
        console.log(err);

        debug(`Event file path: ${eventFilePath}`);
      }
    }

    table(eventsTable);
    timerEnd("Loaded events in");

    debug(`Loaded ${this._events.length} event(s).`);

    info("Registering events...");
    timerStart("Registered events in");

    const clientGuilds = await this.guilds.fetch();

    for (const event of this._events) {
      if (event.once) {
        this.once(event.name, (...args) => event.execute(this, ...args));
        debug(`Registered "${event.name}" once event with index: ${this._events.indexOf(event)}.`);
      } else {
        this.on(event.name, (...args) => event.execute(this, ...args));
        debug(`Registered "${event.name}" event with index: ${this._events.indexOf(event)}.`);
      }
    }

    timerEnd("Registered events in");

    debug(`Listening in ${clientGuilds.size} guild(s).`);
  }

  public async loadCommands() {
    info("Loading commands...");
    timerStart("Loaded commands in");

    const commandFilePaths = await loadFiles("commands");

    const commandsTable: CommandsTable = new Array();
    const coreOnlyCommands: ApplicationCommandDataResolvable[] = new Array();
    const testOnlyCommands: ApplicationCommandDataResolvable[] = new Array();
    const globalCommands: ApplicationCommandDataResolvable[] = new Array();

    for (const commandFilePath of commandFilePaths) {
      try {
        const command: CommandType<boolean> = await importFile(commandFilePath);

        if (command.testOnly) testOnlyCommands.push(command.data.toJSON());
        else if (command.coreOnly) coreOnlyCommands.push(command.data.toJSON());
        else globalCommands.push(command.data.toJSON());

        this._commands.set(command.data.name, command);

        commandsTable.push({
          Command: command.data.name,
          Scope: command.testOnly ? CommandScope.Test : command.coreOnly ? CommandScope.Core : CommandScope.Global,
          Status: CommandStatus.Enabled,
        });
      } catch (err) {
        const commandFileName = commandFilePath.split("/").pop() || "Unknown";

        commandsTable.push({
          Command: commandFileName,
          Scope: CommandScope.Unregistered,
          Status: CommandStatus.Disabled,
        });

        warn(`Unable to load command file "${commandFileName}".`);
        console.log(err);

        debug(`Command file path: ${commandFilePath}`);
      }
    }

    table(commandsTable);
    timerEnd("Loaded commands in");

    debug(`Loaded ${coreOnlyCommands.length} core command(s).`);
    debug(`Loaded ${testOnlyCommands.length} test command(s).`);
    debug(`Loaded ${globalCommands.length} global command(s).`);

    info("Registering commands...");
    timerStart("Registered commands in");

    const clientGuilds = await this.guilds.fetch();

    let testGuildCounter = 0;
    let coreGuildCounter = 0;

    for (const clientGuild of clientGuilds.values()) {
      const guild = await clientGuild.fetch();

      if (guild.id === coreGuildId) {
        if (guild.id === testGuildId) {
          await guild.commands.set(coreOnlyCommands.concat(testOnlyCommands));
          debug(`Registered test/core command(s) in guild "${guild.id}".`);
          testGuildCounter++;
          coreGuildCounter++;
          continue;
        }

        await guild.commands.set(coreOnlyCommands);
        debug(`Registered core command(s) in guild "${guild.id}".`);
        coreGuildCounter++;
        continue;
      }

      if (guild.id === testGuildId) {
        await guild.commands.set(testOnlyCommands);
        debug(`Registered test command(s) in guild "${guild.id}".`);
        testGuildCounter++;
        continue;
      }

      await guild.commands.set(globalCommands);
      debug(`Registered global command(s) in guild "${guild.id}".`);
    }

    timerEnd("Registered commands in");

    debug(`Registered test command(s) in ${testGuildCounter} guild(s).`);
    debug(`Registered core command(s) in ${coreGuildCounter} guild(s).`);
    debug(`Registered global command(s) in ${clientGuilds.size} guild(s).`);
  }

  public async loadCustomClients() {
    info("Loading custom clients...");
    timerStart("Loaded custom clients in");

    const customClientTokens: UserBots[] = await userBotsSchema.find();

    info(`Found ${customClientTokens.length} custom client(s).`);

    let customClientCounter = 0;

    for (const customClientToken of customClientTokens) {
      const customClient = new CustomClient({
        intents: [Guilds, GuildMembers],
      });

      const clientStarted = await customClient.start(customClientToken.token, customClientToken.name);

      if (clientStarted) {
        customClientCounter++;
        debug(`Started custom client with token "${customClientToken.token}".`);
      }

      this._customClients.set(customClientToken.name, customClient);
    }

    info(`Started ${customClientCounter} custom client(s).`);
    timerEnd("Loaded custom clients in");
  }

  public async validateDatabase() {
    info("Validating database...");
    timerStart("Validated database in");

    const discordRewardMessages: DiscordRewardMessages[] = await discordRewardMessagesSchema.find({
      token: this.token,
    });

    debug(`Found ${discordRewardMessages.length} discord reward message(s).`);

    let discordRewardMessageCounter = 0;

    for (const discordRewardMessage of discordRewardMessages) {
      const guild = await this.guilds.fetch(discordRewardMessage.guildId);

      if (!guild) {
        await discordRewardMessagesSchema.deleteOne({ guildId: discordRewardMessage.guildId });
        debug(`Deleted discord reward message with guild ID "${discordRewardMessage.guildId}".`);
        continue;
      }

      const channel = await guild.channels.fetch(discordRewardMessage.channelId);

      if (!channel) {
        await discordRewardMessagesSchema.deleteOne({ channelId: discordRewardMessage.channelId });
        debug(`Deleted discord reward message with channel ID "${discordRewardMessage.channelId}".`);
        continue;
      }

      let message;

      try {
        message = await (channel as TextChannel).messages.fetch(discordRewardMessage.messageId);
      } catch {}

      if (!message) {
        await discordRewardMessagesSchema.deleteOne({ messageId: discordRewardMessage.messageId });
        debug(`Deleted discord reward message with message ID "${discordRewardMessage.messageId}".`);
        continue;
      }

      discordRewardMessageCounter++;
    }

    debug(`Validated ${discordRewardMessageCounter} discord reward message(s).`);

    const rewardResponseMessages: RewardResponseMessages[] = await rewardResponseMessagesSchema.find({
      token: this.token,
    });

    debug(`Found ${rewardResponseMessages.length} reward response message(s).`);

    let rewardResponseMessagesCounter = 0;

    for (const rewardResponseMessage of rewardResponseMessages) {
      const guild = await this.guilds.fetch(rewardResponseMessage.guildId);

      const { alreadyCollected, collected, offline } = rewardResponseMessage;

      if (!guild || (!alreadyCollected && !collected && !offline)) {
        await rewardResponseMessagesSchema.deleteOne({ guildId: rewardResponseMessage.guildId });
        debug(`Deleted reward response messages for guild with ID "${rewardResponseMessage.guildId}".`);
        continue;
      }

      rewardResponseMessagesCounter++;
    }

    debug(`Validated ${rewardResponseMessagesCounter} reward response message(s).`);

    const boostRewardMessages: BoostRewardMessages[] = await boostRewardMessagesSchema.find({
      token: this.token,
    });

    debug(`Found ${boostRewardMessages.length} boost reward message(s).`);

    let boostRewardMessageCounter = 0;

    for (const boostRewardMessage of boostRewardMessages) {
      const guild = await this.guilds.fetch(boostRewardMessage.guildId);

      if (!guild) {
        await boostRewardMessagesSchema.deleteOne({ guildId: boostRewardMessage.guildId });
        debug(`Deleted boost reward message with guild ID "${boostRewardMessage.guildId}".`);
        continue;
      }

      const channel = await guild.channels.fetch(boostRewardMessage.channelId);

      if (!channel) {
        await boostRewardMessagesSchema.deleteOne({ channelId: boostRewardMessage.channelId });
        debug(`Deleted boost reward message with channel ID "${boostRewardMessage.channelId}".`);
        continue;
      }

      let message;

      try {
        message = await (channel as TextChannel).messages.fetch(boostRewardMessage.messageId);
      } catch {}

      if (!message) {
        await boostRewardMessagesSchema.deleteOne({ messageId: boostRewardMessage.messageId });
        debug(`Deleted boost reward message with message ID "${boostRewardMessage.messageId}".`);
        continue;
      }

      boostRewardMessageCounter++;
    }

    debug(`Validated ${boostRewardMessageCounter} boost reward message(s).`);

    const boostResponseMessages: BoostResponseMessages[] = await boostResponseMessagesSchema.find({
      token: this.token,
    });

    debug(`Found ${boostResponseMessages.length} boost response message(s).`);

    let boostResponseMessagesCounter = 0;

    for (const boostResponseMessage of boostResponseMessages) {
      const guild = await this.guilds.fetch(boostResponseMessage.guildId);

      const { cooldown, collected, offline, disabled } = boostResponseMessage;

      if (!guild || (!cooldown && !collected && !offline && !disabled)) {
        await boostResponseMessagesSchema.deleteOne({ guildId: boostResponseMessage.guildId });
        debug(`Deleted boost response messages for guild with ID "${boostResponseMessage.guildId}".`);
        continue;
      }

      boostResponseMessagesCounter++;
    }

    debug(`Validated ${boostResponseMessagesCounter} boost response message(s).`);

    const attachedInstances: AttachedInstances[] = await attachedInstancesSchema.find({
      token: this.token,
    });

    debug(`Found ${attachedInstances.length} guild(s) attached to ByteCore.`);

    let attachedInstancesCounter = 0;

    for (const attachedInstance of attachedInstances) {
      const guild = await this.guilds.fetch(attachedInstance.guild);

      if (!guild) {
        await attachedInstancesSchema.deleteOne({ token: this.token, guild: attachedInstance.guild });
        debug(`Deleted attached instance to ByteCore with guildID: "${attachedInstance.guild}".`);
        continue;
      }

      attachedInstancesCounter++;
    }

    debug(`Validated ${attachedInstancesCounter} attached instances to ByteCore.`);

    timerEnd("Validated database in");
  }

  public get commands() {
    return this._commands;
  }

  public get events() {
    return this._events;
  }

  public get customClients() {
    return this._customClients;
  }

  public get api() {
    return this._api;
  }
}
