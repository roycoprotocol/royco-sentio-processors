import { scaleDown } from "@sentio/sdk";
import {
  APOfferFilledEvent,
  IPOfferFilledEvent,
  RecipeMarketHubContext,
} from "./types/eth/recipemarkethub.js";
import { CHAIN, CONTRACT, SUBGRAPH_URL } from "./constants.js";
import {
  OfferRecipe,
  PositionRecipe,
  UserEventRecipe,
} from "./schema/store.js";
import { getPriceByType, token } from "@sentio/sdk/utils";
import { RawOfferRecipe } from "./utils.js";
import { generateId } from "./generators.js";

export const depositUserEventRecipe = async ({
  event,
  ctx,
  offerIdentifier,
  offerSide,
  userAddress,
  takerAddress,
}: {
  event: IPOfferFilledEvent | APOfferFilledEvent;
  ctx: RecipeMarketHubContext;
  offerIdentifier: string;
  offerSide: number;
  userAddress: string;
  takerAddress: string | null;
}) => {
  const offerId = `${CHAIN}_0_${offerSide}_${offerIdentifier}`;

  const offer = await ctx.store.get(OfferRecipe, offerId);

  if (!offer) {
    return;
  }

  const rawOfferRecipe = offer;

  const underlyingTokenAddress = rawOfferRecipe.underlyingTokenAddress;
  const underlyingTokenAmount = event.args.fillAmount;
  const underlyingTokenInfo = await token.getERC20TokenInfo(
    CHAIN,
    underlyingTokenAddress
  );
  const underlyingTokenPrice =
    (await getPriceByType(CHAIN, underlyingTokenAddress, ctx.timestamp)) || 0;

  const userEvent = new UserEventRecipe({
    id: generateId(event.transactionHash, event.transactionIndex),
    chainId: parseInt(CHAIN),
    marketType: 0,
    marketId: rawOfferRecipe.marketId,
    eventType: "deposit",
    userAddress: userAddress,
    takerAddress: takerAddress ?? rawOfferRecipe.accountAddress,
    poolAddress: CONTRACT[CHAIN].recipemarkethub.address,
    underlyingTokenAddress: underlyingTokenAddress,
    amount: scaleDown(underlyingTokenAmount, underlyingTokenInfo.decimal),
    amountUsd: scaleDown(
      underlyingTokenAmount,
      underlyingTokenInfo.decimal
    ).multipliedBy(underlyingTokenPrice),
    blockNumber: BigInt(event.blockNumber),
    blockTimestamp: BigInt(Math.floor(Number(ctx.timestamp ?? 0) / 1000)),
    transactionHash: event.transactionHash.toLowerCase(),
    logIndex: BigInt(event.transactionIndex),
  });

  await ctx.store.upsert(userEvent);

  const position = new PositionRecipe({
    id: `${CHAIN}_${event.args.weirollWallet.toLowerCase()}`,
    chainId: parseInt(CHAIN),
    marketType: 0,
    marketId: rawOfferRecipe.marketId,
    accountAddress: takerAddress ?? rawOfferRecipe.accountAddress,
    underlyingTokenAddress: underlyingTokenAddress,
    underlyingTokenAmount: underlyingTokenAmount,
    incentiveTokenAddresses: rawOfferRecipe.incentiveTokenAddresses,
    incentiveTokenAmounts: event.args.incentiveAmounts,
    blockNumber: BigInt(event.blockNumber),
    blockTimestamp: BigInt(Math.floor(Number(ctx.timestamp ?? 0) / 1000)),
    transactionHash: event.transactionHash.toLowerCase(),
    logIndex: BigInt(event.transactionIndex),
  });

  await ctx.store.upsert(position);
};
