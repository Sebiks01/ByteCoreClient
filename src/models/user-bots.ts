import { Schema, model, models } from "mongoose";

const reqString = {
  type: String,
  required: true,
};

const userBotsSchema = new Schema({
  name: reqString,
  token: reqString,
});

export type UserBots = {
  name: string;
  token: string;
};

const name = "user-bots";

export default models[name] || model(name, userBotsSchema, name);
