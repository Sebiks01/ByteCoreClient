import { blue, green, yellow, red, magenta } from "chalk";
import { vice } from "gradient-string";

import { debug as debugEnabled } from "../config.json";
import { CommandsTable } from "../typings/Command";
import { EventsTable } from "../typings/Event";

// Starter log
export const byteCore = () => {
  console.log(
    vice(
      "     ____        __          ______              " +
        "\n" +
        "    / __ )__  __/ /____     / ____/___  ________ " +
        "\n" +
        "   / __  / / / / __/ _ \\   / /   / __ \\/ ___/ _ \\ " +
        "\n" +
        "  / /_/ / /_/ / /_/  __/  / /___/ /_/ / /  /  __/" +
        "\n" +
        " /_____/\\__, /\\__/\\___/   \\____/\\____/_/   \\___/ " +
        "\n" +
        "       /____/                                    \n"
    )
  );

  info("Starting the client...");
};

// Default logger
export const log = (msg: string) => console.log(msg);

// Custom loggers
export const info = (msg: string) => log(blue(`[INFO] ${msg}`));

export const success = (msg: string) => log(green(`[INFO] ${msg}`));

export const warn = (msg: string) => log(yellow(`[WARN] ${msg}`));

export const error = (msg: string) => log(red(`[ERROR] ${msg}`));

export const debug = (msg: string) => {
  if (debugEnabled) log(magenta(`[DEBUG] ${msg}`));
};

// Timers
const { time, timeEnd } = console;

export const timerStart = (msg: string) => time(green(`[INFO] ${msg}`));

export const timerEnd = (msg: string) => timeEnd(green(`[INFO] ${msg}`));

// Tables
export const table = (data: CommandsTable | EventsTable) => console.table(data);
