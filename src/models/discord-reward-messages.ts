import { Schema, model, models } from "mongoose";

const reqString = {
  type: String,
  required: true,
};

const discordRewardMessagesSchema = new Schema({
  token: reqString,
  guildId: reqString,
  channelId: reqString,
  messageId: reqString,
  attachedByteCoreInstances: [
    {
      instanceId: reqString,
      style: {
        type: String,
        enum: ["Primary", "Secondary", "Success", "Danger"],
        required: true,
      },
      label: reqString,
      emoji: String,
      modal: {
        title: reqString,
        inputLabel: reqString,
        inputPlaceholder: reqString,
      },
    },
  ],
});

export type DiscordRewardMessages = {
  token: string;
  guildId: string;
  channelId: string;
  messageId: string;
  attachedByteCoreInstances: {
    instanceId: string;
    style: "Primary" | "Secondary" | "Success" | "Danger";
    label: string;
    emoji: string | null;
    modal: {
      title: string;
      inputLabel: string;
      inputPlaceholder: string;
    };
  }[];
};

const name = "discord-reward-messages";

export default models[name] || model(name, discordRewardMessagesSchema, name);
