import {
  Client,
  Collection,
  ApplicationCommandDataResolvable,
  ClientEvents,
  ClientOptions,
  ChatInputCommandInteraction,
} from "discord.js";

import { loadFiles, importFile } from "../util/files-loader";
import { EventType } from "../typings/Event";
import { CommandType } from "../typings/Command";
import { info, warn, debug } from "../util/logger";
import api from "../api";

export class CustomClient extends Client {
  private _name: string = "";
  private _commands: Collection<string, CommandType> = new Collection();
  private _events: EventType<keyof ClientEvents>[] = new Array();
  private _api = api;

  constructor(options: ClientOptions) {
    super(options);
  }

  public async start(token: string, name: string, interaction?: ChatInputCommandInteraction): Promise<boolean> {
    info(`Initializing cutom client "${name}". (${token})`);

    this._name = name;

    this.login(token).catch(async (err) => {
      debug(`Token: ${process.env.TOKEN}`);
      warn("Invalid intents or token for custom client. Enter debugging mode for more information.");
      debug(err);

      if (interaction) {
        await interaction.editReply({
          content: "Invalid token/intents provided for custom client.",
        });

        return false;
      }

      return false;
    });

    await this.loadEvents();

    return true;
  }

  public async loadEvents() {
    const eventFilePaths = await loadFiles("events");

    for (const eventFilePath of eventFilePaths) {
      try {
        const event: EventType<keyof ClientEvents> = await importFile(eventFilePath);

        this._events.push(event);
      } catch {}
    }

    for (const event of this._events) {
      if (event.once) {
        this.once(event.name, (...args) => event.execute(this, ...args));
      } else {
        this.on(event.name, (...args) => event.execute(this, ...args));
      }
    }
  }

  public async loadCommands() {
    const commandFilePaths = await loadFiles("commands");

    const globalCommands: ApplicationCommandDataResolvable[] = new Array();

    for (const commandFilePath of commandFilePaths) {
      try {
        const command: CommandType = await importFile(commandFilePath);

        if (command.coreOnly || command.testOnly) continue;

        globalCommands.push(command.data.toJSON());
        this._commands.set(command.data.name, command);
      } catch {}
    }

    const clientGuilds = await this.guilds.fetch();

    for (const clientGuild of clientGuilds.values()) {
      const guild = await clientGuild.fetch();

      await guild.commands.set(globalCommands);
      debug(`Registered global commands in guild "${guild.id}". (${this.token})`);
    }

    debug(`Registered global commands in ${clientGuilds.size} guild(s). (${this.token})`);
  }

  public get name() {
    return this._name;
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
