import { Schema, model, models } from "mongoose";

const reqString = {
  type: String,
  required: true,
};

const userBotsSchema = new Schema({
  name: reqString,
  token: reqString,
  attachedInstances: [String],
});

export type UserBots = {
  name: string;
  token: string;
  attachedInstances: string[] | null;
};

const name = "user-bots";

export default models[name] || model(name, userBotsSchema, name);
