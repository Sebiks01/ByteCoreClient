import { Schema, model, models } from "mongoose";

const reqString = {
  type: String,
  required: true,
};

const attachedInstancesSchema = new Schema({
  guild: reqString,
  token: reqString,
  attachedInstances: [String],
});

export type AttachedInstances = {
  guild: string;
  token: string;
  attachedInstances: string[] | null;
};

const name = "attached-instances";

export default models[name] || model(name, attachedInstancesSchema, name);
