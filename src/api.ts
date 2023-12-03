import axios from "axios";

import { error, debug } from "./util/logger";
import { ColllectRewardResponse, RequestMethod, Response } from "./typings/api";

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
    collectReward: async (byteCoreId: string, playerName: string): Promise<ColllectRewardResponse | Response> => {
      const response = await request(RequestMethod.Get, `/user/collectReward/${byteCoreId}/${playerName}`);

      if (!response || response.status !== 200) return Response.InvalidRequest;

      return response.data as ColllectRewardResponse | Response;
    },
  },
};
