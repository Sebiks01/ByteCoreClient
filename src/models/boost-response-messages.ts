import { Schema, model, models } from "mongoose";

const reqString = {
  type: String,
  required: true,
};

const boostResponseMessagesSchema = new Schema({
  token: reqString,
  guildId: reqString,
  collected: String,
  cooldown: String,
  offline: String,
  disabled: String,
});

export type BoostResponseMessages = {
  token: string;
  guildId: string;
  collected: string | null;
  cooldown: string | null;
  offline: string | null;
  disabled: string | null;
};

const name = "boost-response-messages";

export default models[name] || model(name, boostResponseMessagesSchema, name);
