import { BigDecimal, scaleDown } from "@sentio/sdk";
import { RecipeMarketHubProcessor } from "./types/eth/recipemarkethub.js";
import { WrappedVaultFactoryProcessor } from "./types/eth/wrappedvaultfactory.js";
import { CHAIN, CONTRACT, SUBGRAPH_URL } from "./constants.js";
import {
  IncentiveClaimRecipe,
  IncentiveClaimVault,
  PoolVault,
  UserEventVault,
  UserEventRecipe,
  LPTokenEventVault,
  PositionVault,
  HourlyPoolSnapshotVault,
  DailyPoolSnapshotVault,
  HourlyPositionSnapshotVault,
  DailyPositionSnapshotVault,
  PoolRecipe,
  DailyPoolSnapshotRecipe,
  HourlyPoolSnapshotRecipe,
  OfferRecipe,
  PositionRecipe,
} from "./schema/store.js";
import {
  getWrappedVaultContract,
  getWrappedVaultContractOnContext,
  WrappedVaultContractView,
  WrappedVaultProcessor,
  WrappedVaultProcessorTemplate,
} from "./types/eth/wrappedvault.js";
import { getPriceByType, token } from "@sentio/sdk/utils";
import { RawPositionRecipe } from "./utils.js";
import { generateId } from "./generators.js";
import { depositUserEventRecipe } from "./recipe-handler.js";
import { GLOBAL_CONFIG } from "@sentio/runtime";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

export const wrappedVaultTemplate = new WrappedVaultProcessorTemplate()
  .onEventTransfer(async (event, ctx) => {
    const pool = await ctx.store.get(
      PoolVault,
      `${CHAIN}_1_${event.address.toLowerCase()}`
    );

    if (!pool) {
      return;
    }

    let eventType = "transfer";

    const lpTokenEventVault = new LPTokenEventVault({
      id: generateId(event.transactionHash, event.transactionIndex),
      chainId: parseInt(CHAIN),
      marketType: 1,
      marketId: event.address.toLowerCase(),
      fromAddress: event.args.from.toLowerCase(),
      toAddress: event.args.to.toLowerCase(),
      poolAddress: event.address.toLowerCase(),
      underlyingTokenAddress: pool.underlyingTokenAddress,
      amount: scaleDown(event.args.amount, 18),
      eventType: eventType,
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(lpTokenEventVault);

    if (event.args.from !== "0x0000000000000000000000000000000000000000") {
      const positionVault = new PositionVault({
        id: generateId(event.transactionHash, event.transactionIndex),
        chainId: parseInt(CHAIN),
        marketType: 1,
        marketId: event.address.toLowerCase(),
        strategyVaultContractAddress: event.address.toLowerCase(),
        userAddress: event.args.from.toLowerCase(),
        liquidityPoolAddress: pool.underlyingPoolAddress,
        underlyingTokenIndex: 0,
        underlyingTokenAddress: pool.underlyingTokenAddress,
        underlyingTokenDecimals: pool.underlyingTokenDecimals,
        blockNumber: BigInt(event.blockNumber),
        blockTimestamp: BigInt(
          Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
        ),
        transactionHash: event.transactionHash.toLowerCase(),
        logIndex: BigInt(event.transactionIndex),
      });

      await ctx.store.upsert(positionVault);
    }

    if (event.args.to !== "0x0000000000000000000000000000000000000000") {
      const positionVault = new PositionVault({
        id: generateId(event.transactionHash, event.transactionIndex),
        chainId: parseInt(CHAIN),
        marketType: 1,
        marketId: event.address.toLowerCase(),
        strategyVaultContractAddress: event.address.toLowerCase(),
        userAddress: event.args.to.toLowerCase(),
        liquidityPoolAddress: pool.underlyingPoolAddress,
        underlyingTokenIndex: 0,
        underlyingTokenAddress: pool.underlyingTokenAddress,
        underlyingTokenDecimals: pool.underlyingTokenDecimals,
        blockNumber: BigInt(event.blockNumber),
        blockTimestamp: BigInt(
          Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
        ),
        transactionHash: event.transactionHash.toLowerCase(),
        logIndex: BigInt(event.transactionIndex),
      });

      await ctx.store.upsert(positionVault);
    }
  })
  .onEventDeposit(async (event, ctx) => {
    const pool = await ctx.store.get(
      PoolVault,
      `${CHAIN}_1_${event.address.toLowerCase()}`
    );

    if (!pool) {
      return;
    }

    const underlyingTokenAddress = pool.underlyingTokenAddress.toLowerCase();
    const underlyingTokenInfo = await token.getERC20TokenInfo(
      CHAIN,
      underlyingTokenAddress
    );
    const underlyingTokenAmount = event.args.assets;
    const underlyingTokenPrice =
      (await getPriceByType(CHAIN, underlyingTokenAddress, ctx.timestamp)) || 0;

    const userEvent = new UserEventVault({
      id: generateId(event.transactionHash, event.transactionIndex),
      chainId: parseInt(CHAIN),
      marketType: 1,
      marketId: event.address.toLowerCase(),
      userAddress: event.args.owner.toLowerCase(),
      poolAddress: event.address.toLowerCase(),
      underlyingTokenAddress: underlyingTokenAddress,
      amount: scaleDown(underlyingTokenAmount, underlyingTokenInfo.decimal),
      amountUsd: scaleDown(
        underlyingTokenAmount,
        underlyingTokenInfo.decimal
      ).multipliedBy(underlyingTokenPrice),
      eventType: "deposit",
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(userEvent);
  })
  .onEventWithdraw(async (event, ctx) => {
    const pool = await ctx.store.get(
      PoolVault,
      `${CHAIN}_1_${event.address.toLowerCase()}`
    );

    if (!pool) {
      return;
    }

    const underlyingTokenAddress = pool.underlyingTokenAddress.toLowerCase();
    const underlyingTokenInfo = await token.getERC20TokenInfo(
      CHAIN,
      underlyingTokenAddress
    );
    const underlyingTokenAmount = event.args.assets;
    const underlyingTokenPrice =
      (await getPriceByType(CHAIN, underlyingTokenAddress, ctx.timestamp)) || 0;

    const userEvent = new UserEventVault({
      id: generateId(event.transactionHash, event.transactionIndex),
      chainId: parseInt(CHAIN),
      marketType: 1,
      marketId: event.address.toLowerCase(),
      userAddress: event.args.owner.toLowerCase(),
      poolAddress: event.address.toLowerCase(),
      underlyingTokenAddress: underlyingTokenAddress,
      amount: scaleDown(underlyingTokenAmount, underlyingTokenInfo.decimal),
      amountUsd: scaleDown(
        underlyingTokenAmount,
        underlyingTokenInfo.decimal
      ).multipliedBy(underlyingTokenPrice),
      eventType: "withdrawal",
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(Math.floor(Number(ctx.timestamp ?? 0) / 1000)),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(userEvent);
  })
  .onEventClaimed(async (event, ctx) => {
    const pool = await ctx.store.get(
      PoolVault,
      `${CHAIN}_1_${event.address.toLowerCase()}`
    );

    if (!pool) {
      return;
    }

    const claimedTokenAddress = event.args.reward.toLowerCase();
    const claimedTokenInfo = await token.getERC20TokenInfo(
      CHAIN,
      claimedTokenAddress
    );
    const claimedTokenAmount = event.args.claimed;
    const claimedTokenPrice =
      (await getPriceByType(CHAIN, claimedTokenAddress, ctx.timestamp)) || 0;

    const incentiveClaim = new IncentiveClaimVault({
      id: generateId(event.transactionHash, event.transactionIndex),
      chainId: parseInt(CHAIN),
      marketType: 1,
      marketId: event.address.toLowerCase(),
      transactionSigner: event.args.user.toLowerCase(),
      userAddress: event.args.receiver.toLowerCase(),
      claimedTokenAddress: claimedTokenAddress,
      amount: scaleDown(claimedTokenAmount, claimedTokenInfo.decimal),
      amountUsd: scaleDown(
        claimedTokenAmount,
        claimedTokenInfo.decimal
      ).multipliedBy(claimedTokenPrice),
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(incentiveClaim);
  });

WrappedVaultFactoryProcessor.bind({
  network: CHAIN,
  address: CONTRACT[CHAIN].wrappedvaultfactory.address.toLowerCase(),
  startBlock: CONTRACT[CHAIN].wrappedvaultfactory.startBlock,
})
  .onEventWrappedVaultCreated(async (event, ctx) => {
    const underlyingTokenAddress = event.args.inputToken.toLowerCase();
    const underlyingTokenInfo = await token.getERC20TokenInfo(
      CHAIN,
      underlyingTokenAddress
    );

    const pool = new PoolVault({
      id: `${CHAIN}_1_${event.args.incentivizedVaultAddress.toLowerCase()}`,
      chainId: parseInt(CHAIN),
      marketType: 1,
      marketId: event.args.incentivizedVaultAddress.toLowerCase(),
      strategyVaultContractAddress:
        event.args.incentivizedVaultAddress.toLowerCase(),
      underlyingPoolAddress: event.args.underlyingVaultAddress.toLowerCase(),
      underlyingTokenAddress: underlyingTokenAddress,
      underlyingTokenDecimals: underlyingTokenInfo.decimal,
      receiptTokenAddress: event.args.incentivizedVaultAddress.toLowerCase(),
      receiptTokenDecimals: 18,
      receiptTokenSymbol: event.args.vaultSymbol,
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(pool);

    wrappedVaultTemplate.bind(
      {
        address: event.args.incentivizedVaultAddress.toLowerCase(),
        startBlock: BigInt(event.blockNumber),
      },
      ctx
    );
  }) // Pool Snapshot
  .onTimeInterval(
    async (block, ctx) => {
      const currentDate = new Date(Number(ctx.timestamp));
      const dailyTimestampId = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}`;
      const hourlyTimestampId = `${dailyTimestampId}_${currentDate.getUTCHours()}`;

      const pools = await ctx.store.list(PoolVault);

      for (const pool of pools) {
        const contract = getWrappedVaultContract(
          CHAIN,
          pool.strategyVaultContractAddress
        );

        const totalAssets = await contract.totalAssets();
        const underlyingTokenAddress = pool.underlyingTokenAddress;
        const undelyingTokenDecimals = pool.underlyingTokenDecimals;
        const underlyingTokenAmount = totalAssets;
        const underlyingTokenPrice =
          (await getPriceByType(
            CHAIN,
            underlyingTokenAddress,
            ctx.timestamp
          )) || 0;

        // Common snapshot data
        const snapshotData = {
          chainId: parseInt(CHAIN),
          marketType: 1,
          marketId: pool.marketId,
          strategyVaultContractAddress: pool.strategyVaultContractAddress,
          liquidityPoolAddress: pool.underlyingPoolAddress,
          underlyingTokenIndex: 0,
          underlyingTokenAddress: underlyingTokenAddress,
          underlyingTokenAmount: scaleDown(
            underlyingTokenAmount,
            undelyingTokenDecimals
          ),
          underlyingTokenAmountUsd: scaleDown(
            underlyingTokenAmount,
            undelyingTokenDecimals
          ).multipliedBy(underlyingTokenPrice),
          totalFeesUsd: BigDecimal(0),
          blockNumber: BigInt(block.number),
          blockTimestamp: BigInt(
            Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
          ),
        };

        // Create daily snapshot
        const dailySnapshot = new DailyPoolSnapshotVault({
          id: `${CHAIN}_1_${pool.marketId}_${dailyTimestampId}`,
          ...snapshotData,
        });
        await ctx.store.upsert(dailySnapshot);

        // Create hourly snapshot
        const hourlySnapshot = new HourlyPoolSnapshotVault({
          id: `${CHAIN}_1_${pool.marketId}_${hourlyTimestampId}`,
          ...snapshotData,
        });
        await ctx.store.upsert(hourlySnapshot);
      }
    },
    60, // Process new data every hour
    60 * 24 * 30 // Backfill last 30 days
  )
  // Position Snapshot
  .onTimeInterval(
    async (block, ctx) => {
      const currentDate = new Date(Number(ctx.timestamp));
      const dailyTimestampId = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}`;
      const hourlyTimestampId = `${dailyTimestampId}_${currentDate.getUTCHours()}`;

      const positions = await ctx.store.list(PositionVault);

      for (const position of positions) {
        const underlyingTokenAddress = position.underlyingTokenAddress;
        const underlyingTokenPrice =
          (await getPriceByType(
            CHAIN,
            underlyingTokenAddress,
            ctx.timestamp
          )) || 0;
        const underlyingTokenDecimals = position.underlyingTokenDecimals;

        const contract = getWrappedVaultContract(
          CHAIN,
          position.strategyVaultContractAddress
        );

        const underlyingTokenAmount = await contract.maxWithdraw(
          position.userAddress
        );

        const snapshotData = {
          chainId: parseInt(CHAIN),
          marketType: 1,
          marketId: position.marketId,
          strategyVaultContractAddress: position.strategyVaultContractAddress,
          userAddress: position.userAddress,
          liquidityPoolAddress: position.liquidityPoolAddress,
          underlyingTokenIndex: position.underlyingTokenIndex,
          underlyingTokenAddress: underlyingTokenAddress,
          underlyingTokenAmount: scaleDown(
            underlyingTokenAmount,
            underlyingTokenDecimals
          ),
          underlyingTokenAmountUsd: scaleDown(
            underlyingTokenAmount,
            underlyingTokenDecimals
          ).multipliedBy(underlyingTokenPrice),
          totalFeesUsd: BigDecimal(0),
          blockNumber: BigInt(block.number),
          blockTimestamp: BigInt(
            Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
          ),
        };

        // Create daily snapshot
        const dailySnapshot = new DailyPositionSnapshotVault({
          id: `${CHAIN}_1_${position.marketId}_${position.userAddress}_${dailyTimestampId}`,
          ...snapshotData,
        });
        await ctx.store.upsert(dailySnapshot);

        // Create hourly snapshot
        const hourlySnapshot = new HourlyPositionSnapshotVault({
          id: `${CHAIN}_1_${position.marketId}_${position.userAddress}_${hourlyTimestampId}`,
          ...snapshotData,
        });
        await ctx.store.upsert(hourlySnapshot);
      }
    },
    60, // Process new data every hour
    60 * 24 * 30 // Backfill last 30 days
  );

RecipeMarketHubProcessor.bind({
  network: CHAIN,
  address: CONTRACT[CHAIN].recipemarkethub.address.toLowerCase(),
  startBlock: CONTRACT[CHAIN].recipemarkethub.startBlock,
})
  .onEventMarketCreated(async (event, ctx) => {
    const pool = new PoolRecipe({
      id: `${CHAIN}_0_${event.args.marketHash.toLowerCase()}`,
      chainId: parseInt(CHAIN),
      marketType: 0,
      marketId: event.args.marketHash.toLowerCase(),
      poolAddress: `${event.address.toLowerCase()}-${event.args.marketHash.toLowerCase()}`,
      poolSymbol: "",
      underlyingTokenIndex: 0,
      underlyingTokenAddress: event.args.inputToken.toLowerCase(),
      underlyingTokenSymbol: "",
      underlyingTokenDecimals: 0,
      receiptTokenAddress: "",
      receiptTokenSymbol: "",
      receiptTokenDecimals: 0,
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(pool);
  })
  .onEventAPOfferCreated(async (event, ctx) => {
    const pool = await ctx.store.get(
      PoolRecipe,
      `${CHAIN}_0_${event.args.marketHash.toLowerCase()}`
    );

    if (!pool) {
      return;
    }

    const offer = new OfferRecipe({
      id: `${CHAIN}_0_0_${event.args.offerID.toString()}`,
      chainId: parseInt(CHAIN),
      marketType: 0,
      offerSide: 0,
      offerId: event.args.offerID.toString(),
      marketId: event.args.marketHash.toLowerCase(),
      accountAddress: event.args.ap.toLowerCase(),
      underlyingTokenAddress: pool.underlyingTokenAddress,
      incentiveTokenAddresses: event.args.incentiveAddresses.map((token) =>
        token.toLowerCase()
      ),
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(offer);
  })
  .onEventIPOfferCreated(async (event, ctx) => {
    const pool = await ctx.store.get(
      PoolRecipe,
      `${CHAIN}_0_${event.args.marketHash.toLowerCase()}`
    );

    if (!pool) {
      return;
    }

    const offer = new OfferRecipe({
      id: `${CHAIN}_0_1_${event.args.offerHash.toString()}`,
      chainId: parseInt(CHAIN),
      marketType: 0,
      offerSide: 1,
      offerId: event.args.offerHash.toString(),
      marketId: event.args.marketHash.toLowerCase(),
      accountAddress: event.args.ip.toLowerCase(),
      underlyingTokenAddress: pool.underlyingTokenAddress,
      incentiveTokenAddresses: event.args.incentivesOffered.map((token) =>
        token.toLowerCase()
      ),
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(offer);
  })
  .onEventIPOfferFilled(async (event, ctx) => {
    await depositUserEventRecipe({
      event,
      ctx,
      offerIdentifier: event.args.offerHash.toLowerCase(),
      offerSide: 1,
      userAddress: event.args.ap.toLowerCase(),
      takerAddress: event.args.ap.toLowerCase(),
    });
  })
  .onEventAPOfferFilled(async (event, ctx) => {
    await depositUserEventRecipe({
      event,
      ctx,
      offerIdentifier: event.args.offerID.toString(),
      offerSide: 0,
      userAddress: event.args.ip.toLowerCase(),
      takerAddress: null,
    });
  })
  .onEventWeirollWalletExecutedWithdrawal(async (event, ctx) => {
    const positionId = `${CHAIN}_${event.args.weirollWallet.toLowerCase()}`;

    const position = await ctx.store.get(PositionRecipe, positionId);

    if (!position) {
      return;
    }

    const rawPositionRecipe = position;

    const underlyingTokenAddress = rawPositionRecipe.underlyingTokenAddress;
    const underlyingTokenAmount = rawPositionRecipe.underlyingTokenAmount;
    const underlyingTokenInfo = await token.getERC20TokenInfo(
      CHAIN,
      underlyingTokenAddress
    );
    const underlyingTokenPrice =
      (await getPriceByType(CHAIN, underlyingTokenAddress, ctx.timestamp)) || 0;

    const userEvent = new UserEventRecipe({
      id: `${CHAIN}_${event.transactionHash.toLowerCase()}_${event.transactionIndex}`,
      chainId: parseInt(CHAIN),
      marketType: 0,
      marketId: rawPositionRecipe.marketId,
      eventType: "withdraw",
      userAddress: rawPositionRecipe.accountAddress,
      takerAddress: rawPositionRecipe.accountAddress,
      poolAddress: CONTRACT[CHAIN].recipemarkethub.address,
      underlyingTokenAddress: underlyingTokenAddress,
      amount: scaleDown(underlyingTokenAmount, underlyingTokenInfo.decimal),
      amountUsd: scaleDown(
        underlyingTokenAmount,
        underlyingTokenInfo.decimal
      ).multipliedBy(underlyingTokenPrice),
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(userEvent);
  })
  .onEventWeirollWalletClaimedIncentive(async (event, ctx) => {
    const positionId = `${CHAIN}_${event.args.weirollWallet.toLowerCase()}`;

    const position = await ctx.store.get(PositionRecipe, positionId);

    if (!position) {
      return;
    }

    const rawPositionRecipe = position;

    const claimedTokenIndex = rawPositionRecipe.incentiveTokenAddresses.indexOf(
      `${event.args.incentive.toLowerCase()}`
    );

    if (claimedTokenIndex === -1) {
      return;
    }

    const claimedTokenAddress = event.args.incentive.toLowerCase();
    const claimedTokenAmount =
      rawPositionRecipe.incentiveTokenAmounts[claimedTokenIndex];
    const claimedTokenInfo = await token.getERC20TokenInfo(
      CHAIN,
      claimedTokenAddress
    );
    const claimedTokenPrice =
      (await getPriceByType(CHAIN, claimedTokenAddress, ctx.timestamp)) || 0;

    const incentiveClaim = new IncentiveClaimRecipe({
      id: `${CHAIN}_${event.transactionHash.toLowerCase()}_${event.transactionIndex}`,
      chainId: parseInt(CHAIN),
      marketType: 0,
      marketId: rawPositionRecipe.marketId,
      transactionSigner: rawPositionRecipe.accountAddress,
      userAddress: event.args.recipient.toLowerCase(),
      claimedTokenAddress: claimedTokenAddress,
      amount: scaleDown(claimedTokenAmount, claimedTokenInfo.decimal),
      amountUsd: scaleDown(
        claimedTokenAmount,
        claimedTokenInfo.decimal
      ).multipliedBy(claimedTokenPrice),
      blockNumber: BigInt(event.blockNumber),
      blockTimestamp: BigInt(
        Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
      ),
      transactionHash: event.transactionHash.toLowerCase(),
      logIndex: BigInt(event.transactionIndex),
    });

    await ctx.store.upsert(incentiveClaim);
  })
  // Pool Snapshot
  .onTimeInterval(
    async (block, ctx) => {
      const currentDate = new Date(Number(ctx.timestamp));
      const dailyTimestampId = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}`;
      const hourlyTimestampId = `${dailyTimestampId}_${currentDate.getUTCHours()}`;

      const pools = await ctx.store.list(PoolRecipe);

      for (const pool of pools) {
        // get all user events for the pool
        const userEvents = await ctx.store.list(UserEventRecipe, [
          {
            field: "marketId",
            op: "=",
            value: pool.marketId,
          },
        ]);

        const underlyingTokenIndex = pool.underlyingTokenIndex;
        const underlyingTokenAddress = pool.underlyingTokenAddress;
        const underlyingTokenAmount = userEvents.reduce((acc, event) => {
          if (event.eventType === "deposit") {
            return acc.plus(event.amount);
          } else if (event.eventType === "withdraw") {
            return acc.minus(event.amount);
          }
          return acc;
        }, new BigDecimal(0));
        const underlyingTokenAmountUsd = userEvents.reduce((acc, event) => {
          if (event.eventType === "deposit") {
            return acc.plus(event.amountUsd);
          } else if (event.eventType === "withdraw") {
            return acc.minus(event.amountUsd);
          }
          return acc;
        }, new BigDecimal(0));

        const snapshotData = {
          chainId: parseInt(CHAIN),
          marketType: 0,
          marketId: pool.marketId,
          poolAddress: pool.poolAddress,
          underlyingTokenIndex: underlyingTokenIndex,
          underlyingTokenAddress: underlyingTokenAddress,
          underlyingTokenAmount: underlyingTokenAmount,
          underlyingTokenAmountUsd: underlyingTokenAmountUsd,
          totalFeesUsd: BigDecimal(0),
          blockNumber: BigInt(block.number),
          blockTimestamp: BigInt(
            Math.floor((ctx.timestamp ?? new Date()).getTime() / 1000)
          ),
        };

        // Create daily snapshot
        const dailySnapshot = new DailyPoolSnapshotRecipe({
          id: `${CHAIN}_0_${pool.marketId}_${dailyTimestampId}`,
          ...snapshotData,
        });
        await ctx.store.upsert(dailySnapshot);

        // Create hourly snapshot
        const hourlySnapshot = new HourlyPoolSnapshotRecipe({
          id: `${CHAIN}_0_${pool.marketId}_${hourlyTimestampId}`,
          ...snapshotData,
        });
        await ctx.store.upsert(hourlySnapshot);
      }
    },
    60,
    60 * 24 * 30
  );
