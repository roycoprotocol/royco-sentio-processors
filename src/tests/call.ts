import { CHAIN } from "../constants.js";

import { SUBGRAPH_URL } from "../constants.js";

const main = async () => {
  const positionId = `${CHAIN}_0xc5333bebca464a5e0dca394df07bea23c1316086`;
  const positionsQuery = `
    query MyQuery {
      rawPositionRecipes(where: {id: "${positionId}"}) {
        accountAddress
        blockNumber
        blockTimestamp
        chainId
        id
        isClaimed
        isForfeited
        isWithdrawn
        logIndex
        marketId
        rewardStyle
        tag
        token0Amount
        token0Id
        token1Amounts
        token1Ids
        transactionHash
        unlockTimestamp
        weirollWallet
    }
  }
  `;

  const offerId = `1_0_0_0`;
  const offersQuery = `
  query MyQuery {
    rawOfferRecipes(where: {id: "${offerId}"}) {
      accountAddress
      blockNumber
      blockTimestamp
      chainId
      expiry
      fundingVault
      id
      logIndex
      marketType
      offerId
      offerSide
      transactionHash
      token1Ids
      token1AmountsRemaining
      token1Amounts
      token0Id
      token0Amount
      token0AmountRemaining
      marketId
      isCancelled
      rawMarketRefId {
        rewardStyle
      }
    }
  }
  `;

  const response = await fetch(SUBGRAPH_URL[CHAIN].recipe, {
    method: "POST",
    body: JSON.stringify({ query: offersQuery }),
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();

  console.log(data.data);
};

main();
