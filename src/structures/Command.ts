import { CommandType } from "../typings/Command";

export class Command<coreOnly extends boolean> {
  constructor(commandOptions: CommandType<coreOnly>) {
    Object.assign(this, commandOptions);
  }
}
