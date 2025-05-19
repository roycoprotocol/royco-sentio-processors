import axios from "axios";

import { EthChainId } from "@sentio/sdk/eth";
import { TokenDirectory } from "./schema/store.js";
import { BigDecimal } from "@sentio/bigdecimal";

import dotenv from "dotenv";

dotenv.config();

export type RawPositionRecipe = {
  id: string; // <CHAIN_ID>_<WEIROLL_WALLET>
  chainId: string;
  weirollWallet: string;
  accountAddress: string;
  marketId: string;
  rewardStyle: number;
  token0Id: string;
  token0Amount: string;
  token1Ids: string[];
  token1Amounts: string[];
  unlockTimestamp: string;
  isClaimed: boolean[];
  isForfeited: boolean;
  isWithdrawn: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  logIndex: string;
};

export type RawOfferRecipe = {
  id: string; // <CHAIN_ID>_<MARKET_TYPE>_<OFFER_SIDE>_<OFFER_ID>
  chainId: string;
  marketType: number;
  offerSide: number;
  offerId: string;
  marketId: string;
  accountAddress: string;
  fundingVault: string;
  token0Id: string;
  token0Amount: string;
  token0AmountRemaining: string;
  token1Ids: string[];
  token1AmountsRemaining: string[];
  token1Amounts: string[];
  expiry: string;
  isCancelled: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  logIndex: string;
  rawMarketRefId: {
    rewardStyle: number;
  };
};

export const findTokenFromDirectory = async (
  ctx: any,
  tokenAddress: string,
  chainId: EthChainId
): Promise<TokenDirectory | null> => {
  //first, try to find the token in the cache
  const individualToken = await ctx.store.get(
    TokenDirectory,
    `${chainId.toString().toLowerCase()}-${tokenAddress.toLowerCase()}`
  );

  if (individualToken) {
    return individualToken;
  }

  const tokenDirectory = await getTokenDirectory(ctx);

  if (!tokenDirectory) {
    return null;
  }
  const token = tokenDirectory.find(
    (token: TokenDirectory) =>
      token.contractAddress.toLowerCase() === tokenAddress.toLowerCase() &&
      token.chainId === Number(chainId)
  );
  if (!token) {
    return null;
  }
  return token;
};

export const getTokenDirectory = async (ctx: any) => {
  // Return cached data if available
  const cachedTokenDirectory = await ctx.store.list(TokenDirectory);
  if (cachedTokenDirectory && cachedTokenDirectory.length > 0) {
    return cachedTokenDirectory;
  }

  const tokenDirectory = await axios.post(
    "https://api.royco.org/api/v1/token/directory",
    {
      page: {
        index: 1,
        size: 1000000000,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ROYCO_API_KEY,
      },
    }
  );

  // add each token to the cache
  const tokens = tokenDirectory.data.data.map((token: any) => {
    return new TokenDirectory({
      id: `${token.chainId.toString().toLowerCase()}-${token.contractAddress.toLowerCase()}`,
      chainId: token.chainId,
      contractAddress: token.contractAddress.toLowerCase(),
      symbol: token.symbol,
      decimals: token.decimals,
      price: new BigDecimal(token.price?.toString() || "0"),
      fdv: new BigDecimal(token.fdv?.toString() || "0"),
      totalSupply: token.totalSupply,
      source: token.source,
    });
  });

  await ctx.store.upsert(tokens);

  return tokens;
};
