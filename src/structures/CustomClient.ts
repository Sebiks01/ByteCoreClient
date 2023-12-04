import {
  Client,
  Collection,
  ApplicationCommandDataResolvable,
  ClientEvents,
  ClientOptions,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";

import { loadFiles, importFile } from "../util/files-loader";
import { EventType } from "../typings/Event";
import { CommandType } from "../typings/Command";
import { info, warn, debug } from "../util/logger";
import discordRewardMessagesSchema, { DiscordRewardMessages } from "../models/discord-reward-messages";
import rewardResponseMessagesSchema, { RewardResponseMessages } from "../models/reward-response-messages";
import api from "../api";

export class CustomClient extends Client {
  private _name: string = "";
  private _running: boolean = false;
  private _commands: Collection<string, CommandType<boolean>> = new Collection();
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

      this.token = token;

      if (interaction) {
        await interaction.editReply({
          content: "Invalid token/intents provided for custom client.",
        });

        return false;
      }

      return false;
    });

    await this.loadEvents();

    this._running = true;

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
        const command: CommandType<boolean> = await importFile(commandFilePath);

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

  public async validateDatabase() {
    const discordRewardMessages: DiscordRewardMessages[] = await discordRewardMessagesSchema.find({
      token: this.token,
    });

    debug(`Client: ${this._name} (${this.token})`);
    debug(`Found ${discordRewardMessages.length} discord reward message(s).`);

    let discordRewardMessageCounter = 0;

    for (const discordRewardMessage of discordRewardMessages) {
      const guild = await this.guilds.fetch(discordRewardMessage.guildId);

      if (!guild) {
        await discordRewardMessagesSchema.deleteOne({ guildId: discordRewardMessage.guildId });
        continue;
      }

      const channel = await guild.channels.fetch(discordRewardMessage.channelId);

      if (!channel) {
        await discordRewardMessagesSchema.deleteOne({ channelId: discordRewardMessage.channelId });
        continue;
      }

      const message = await (channel as TextChannel).messages.fetch(discordRewardMessage.messageId);

      if (!message) {
        await discordRewardMessagesSchema.deleteOne({ messageId: discordRewardMessage.messageId });
        continue;
      }

      discordRewardMessageCounter++;
    }

    debug(`Client: ${this._name} (${this.token})`);
    debug(`Validated ${discordRewardMessageCounter} discord reward message(s).`);

    const rewardResponseMessages: RewardResponseMessages[] = await rewardResponseMessagesSchema.find({
      token: this.token,
    });

    debug(`Client: ${this._name} (${this.token})`);
    debug(`Found ${rewardResponseMessages.length} reward response message(s).`);

    let rewardResponseMessagesCounter = 0;

    for (const rewardResponseMessage of rewardResponseMessages) {
      const guild = await this.guilds.fetch(rewardResponseMessage.guildId);

      const { alreadyCollected, collected, offline } = rewardResponseMessage;

      if (!guild || (!alreadyCollected && !collected && !offline)) {
        await rewardResponseMessagesSchema.deleteOne({ guildId: rewardResponseMessage.guildId });
        continue;
      }

      rewardResponseMessagesCounter++;
    }

    debug(`Client: ${this._name} (${this.token})`);
    debug(`Validated ${rewardResponseMessagesCounter} reward response message(s).`);
  }

  public get name() {
    return this._name;
  }

  public get running() {
    return this._running;
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
