export enum RequestMethod {
  Get = "get",
  Post = "post",
}

export enum Response {
  InvalidRequest = -1,
}

export enum CollectRewardResponse {
  Collected = 0,
  Offline = 1,
  AlreadyCollected = 2,
}

export enum CollectBoostRewardResponse {
  Collected = 0,
  Offline = 1,
  Cooldown = 2,
  Disabled = 3,
}

export type MessagesToSend = [
  {
    "core-id": string;
    "channel-id": string;
    "message-json": string;
  }
];

export type LinkInstanceResponse = String;
