import { Schema, model, models } from "mongoose";

const reqString = {
  type: String,
  required: true,
};

const rewardResponseMessagesSchema = new Schema({
  token: reqString,
  guildId: reqString,
  collected: String,
  alreadyCollected: String,
  offline: String,
});

export type RewardResponseMessages = {
  token: string;
  guildId: string;
  collected: string | null;
  alreadyCollected: string | null;
  offline: string | null;
};

const name = "reward-response-messages";

export default models[name] || model(name, rewardResponseMessagesSchema, name);
