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
