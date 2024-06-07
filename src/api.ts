import axios from "axios";

import { error, debug } from "./util/logger";
import {
  CollectBoostRewardResponse,
  CollectRewardResponse,
  LinkInstanceResponse,
  MessagesToSend,
  RequestMethod,
  Response,
} from "./typings/api";

async function request(method: RequestMethod, url: string): Promise<any> {
  if (!process.env.API_URL) {
    error("API_URL is not set. Skipping request.");
    debug(`API_URL: ${process.env.API_URL}`);
    return null;
  }

  let response;

  try {
    response = await axios[method](`${process.env.API_URL}${url}`);
  } catch (err) {
    response = null;

    error(`Error while making request to ${url}.`);
  }

  return response;
}

export default {
  user: {
    collectReward: async (byteCoreId: string, playerName: string): Promise<CollectRewardResponse | Response> => {
      debug(`Collecting reward for ${playerName} with byteCoreId ${byteCoreId}.`);

      const response = await request(RequestMethod.Get, `/user/collectReward/${byteCoreId}/${playerName}`);

      if (!response || response.status !== 200) return Response.InvalidRequest;

      return response.data as CollectRewardResponse | Response;
    },

    collectBoostReward: async (
      byteCoreId: string,
      userId: string,
      playerName: string
    ): Promise<CollectBoostRewardResponse | Response> => {
      debug(`Collecting boost reward for ${playerName} with byteCoreId ${byteCoreId}.`);

      if (!process.env.API_TOKEN) {
        error("API_TOKEN is not set. Skipping request.");
        debug(`API_TOKEN: ${process.env.API_URL}`);
        return Response.InvalidRequest;
      }

      const response = await request(
        RequestMethod.Get,
        `/user/collectBoostReward/${process.env.API_TOKEN}/${byteCoreId}/${userId}/${playerName}`
      );

      if (!response || response.status !== 200) return Response.InvalidRequest;

      return response.data as CollectBoostRewardResponse | Response;
    },
  },

  system: {
    messagesToSend: async (): Promise<MessagesToSend | Response> => {
      debug("Fetching messages.");

      if (!process.env.API_TOKEN) {
        error("API_TOKEN is not set. Skipping request.");
        debug(`API_TOKEN: ${process.env.API_URL}`);
        return Response.InvalidRequest;
      }

      const response = await request(RequestMethod.Get, `/system/messagesToSend/${process.env.API_TOKEN}`);

      if (!response || response.status !== 200) return Response.InvalidRequest;

      return response.data as MessagesToSend | Response;
    },

    linkInstance: async (instanceId: string, botName: string): Promise<LinkInstanceResponse | Response> => {
      debug(`Linking instance with id ${instanceId}.`);

      if (!process.env.API_TOKEN) {
        error("API_TOKEN is not set. Skipping request.");
        debug(`API_TOKEN: ${process.env.API_URL}`);
        return Response.InvalidRequest;
      }

      const response = await request(
        RequestMethod.Get,
        `/system/linkInstance/${process.env.API_TOKEN}/${instanceId}/${botName}`
      );

      if (!response || response.status !== 200) return Response.InvalidRequest;

      return response.data as LinkInstanceResponse | Response;
    },
  },
};
