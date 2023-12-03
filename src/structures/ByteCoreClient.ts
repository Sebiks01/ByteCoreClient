import {
  Client,
  Collection,
  ApplicationCommandDataResolvable,
  ClientEvents,
  ClientOptions,
  GatewayIntentBits,
} from "discord.js";

import { coreGuildId, testGuildId } from "../config.json";
import { loadFiles, importFile } from "../util/files-loader";
import { mongoConnect } from "../util/storage-connector";
import { EventStatus, EventType, EventsTable } from "../typings/Event";
import { CommandScope, CommandStatus, CommandType, CommandsTable } from "../typings/Command";
import { byteCore, info, warn, error, debug, timerStart, timerEnd, table } from "../util/logger";
import { CustomClient } from "./CustomClient";
import userBotsSchema, { UserBots } from "../models/user-bots";
import api from "../api";

const { Guilds, GuildMembers } = GatewayIntentBits;

export class ByteCoreClient extends Client {
  private _commands: Collection<string, CommandType> = new Collection();
  private _events: EventType<keyof ClientEvents>[] = new Array();
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
        const command: CommandType = await importFile(commandFilePath);

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
          await guild.commands.set(coreOnlyCommands.concat(testOnlyCommands.concat(globalCommands)));
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
        await guild.commands.set(testOnlyCommands.concat(globalCommands));
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
    }

    info(`Started ${customClientCounter} custom client(s).`);
    timerEnd("Loaded custom clients in");
  }

  public get commands() {
    return this._commands;
  }

  public get events() {
    return this._events;
  }

  public get api() {
    return this._api;
  }
}
