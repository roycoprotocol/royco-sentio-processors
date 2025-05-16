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
  PoolRecipe,
  OfferRecipe,
  PositionRecipe,
  Metric,
} from "./schema/store.js";
import {
  getWrappedVaultContract,
  getWrappedVaultContractOnContext,
  WrappedVaultContractView,
  WrappedVaultProcessor,
  WrappedVaultProcessorTemplate,
} from "./types/eth/wrappedvault.js";
import { getPriceByType, token } from "@sentio/sdk/utils";
import { findTokenFromDirectory, RawPositionRecipe } from "./utils.js";
import { generateId } from "./generators.js";
import { depositUserEventRecipe } from "./recipe-handler.js";
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthChainId } from "@sentio/sdk/eth";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

for (const CHAIN of Object.keys(CONTRACT)) {
  const chainId = CHAIN as EthChainId;
  const contractConfig = CONTRACT[chainId as keyof typeof CONTRACT];
  RecipeMarketHubProcessor.bind({
    network: chainId,
    address: contractConfig.recipemarkethub.address.toLowerCase(),
    startBlock: contractConfig.recipemarkethub.startBlock,
  })
    .onEventMarketCreated(async (event, ctx) => {
      const pool = new PoolRecipe({
        id: `${chainId}_0_${event.args.marketHash.toLowerCase()}`,
        chainId: parseInt(chainId),
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
        `${chainId}_0_${event.args.marketHash.toLowerCase()}`
      );

      if (!pool) {
        return;
      }

      const offer = new OfferRecipe({
        id: `${chainId}_0_0_${event.args.offerID.toString()}`,
        chainId: parseInt(chainId),
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
        `${chainId}_0_${event.args.marketHash.toLowerCase()}`
      );

      if (!pool) {
        return;
      }

      const offer = new OfferRecipe({
        id: `${chainId}_0_1_${event.args.offerHash.toString()}`,
        chainId: parseInt(chainId),
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
        chainId,
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
        chainId,
      });
    })
    .onEventWeirollWalletExecutedWithdrawal(async (event, ctx) => {
      const positionId = `${chainId}_${event.args.weirollWallet.toLowerCase()}`;

      let position = await ctx.store.get(PositionRecipe, positionId);

      if (!position) {
        return;
      }
      //make position inactive
      position.active = false;
      await ctx.store.upsert(position);

      const rawPositionRecipe = position;

      const underlyingTokenAddress = rawPositionRecipe.underlyingTokenAddress;
      const underlyingTokenAmount = rawPositionRecipe.underlyingTokenAmount;
      const underlyingTokenInfo = await token.getERC20TokenInfo(
        chainId,
        underlyingTokenAddress
      );
      const underlyingTokenPrice =
        (await getPriceByType(
          chainId,
          underlyingTokenAddress,
          ctx.timestamp
        )) || 0;

      const userEvent = new UserEventRecipe({
        id: `${chainId}_${event.transactionHash.toLowerCase()}_${event.transactionIndex}`,
        chainId: parseInt(chainId),
        marketType: 0,
        marketId: rawPositionRecipe.marketId,
        eventType: "withdraw",
        userAddress: rawPositionRecipe.accountAddress,
        takerAddress: rawPositionRecipe.accountAddress,
        poolAddress: contractConfig.recipemarkethub.address,
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
    .onEventWeirollWalletForfeited(async (event, ctx) => {
      const positionId = `${chainId}_${event.args.weirollWallet.toLowerCase()}`;

      let position = await ctx.store.get(PositionRecipe, positionId);

      if (!position) {
        return;
      }
      //make position inactive
      position.active = false;
      await ctx.store.upsert(position);

      const rawPositionRecipe = position;

      const underlyingTokenAddress = rawPositionRecipe.underlyingTokenAddress;
      const underlyingTokenAmount = rawPositionRecipe.underlyingTokenAmount;
      const underlyingTokenInfo = await token.getERC20TokenInfo(
        chainId,
        underlyingTokenAddress
      );
      const underlyingTokenPrice =
        (await getPriceByType(
          chainId,
          underlyingTokenAddress,
          ctx.timestamp
        )) || 0;

      const userEvent = new UserEventRecipe({
        id: `${chainId}_${event.transactionHash.toLowerCase()}_${event.transactionIndex}`,
        chainId: parseInt(chainId),
        marketType: 0,
        marketId: rawPositionRecipe.marketId,
        eventType: "withdraw",
        userAddress: rawPositionRecipe.accountAddress,
        takerAddress: rawPositionRecipe.accountAddress,
        poolAddress: contractConfig.recipemarkethub.address,
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
      const positionId = `${chainId}_${event.args.weirollWallet.toLowerCase()}`;

      const position = await ctx.store.get(PositionRecipe, positionId);

      if (!position) {
        return;
      }

      const rawPositionRecipe = position;

      const claimedTokenIndex =
        rawPositionRecipe.incentiveTokenAddresses.indexOf(
          `${event.args.incentive.toLowerCase()}`
        );

      if (claimedTokenIndex === -1) {
        return;
      }

      const claimedTokenAddress = event.args.incentive.toLowerCase();
      const claimedTokenAmount =
        rawPositionRecipe.incentiveTokenAmounts[claimedTokenIndex];
      const claimedTokenInfo = await token.getERC20TokenInfo(
        chainId,
        claimedTokenAddress
      );
      const claimedTokenPrice =
        (await getPriceByType(chainId, claimedTokenAddress, ctx.timestamp)) ||
        0;

      const incentiveClaim = new IncentiveClaimRecipe({
        id: `${chainId}_${event.transactionHash.toLowerCase()}_${event.transactionIndex}`,
        chainId: parseInt(chainId),
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

        const activePositions = await ctx.store.list(PositionRecipe, [
          {
            field: "active",
            op: "=",
            value: true,
          },
        ]);

        const positionSnapshots = [];
        const boycoMarketIds = [
          "0x4dd921e829db80e73c56d888eeaf46a7934a3c4a2f7f78231dd4502f8eaa2558",
          "0xff917303af9337534eece4b88948d609980b66ca0b41875da782aec4858cade5",
          "0xff0182973d5f1e9a64392c413caaa75f364f24632a7de0fdd1a31fe30517fdd2",
          "0xfef8ead03d79cf7cbe6f73c8d1136f8c84f6cf6ed9bc208719e7fcee807cb336",
          "0xfe95d44ab171140b66fb5180e9de765578d9d2bfbdbb66307abb86ba05a59e93",
          "0xfcc0c3703168bf5d4a25d5213f2a79ea00b0f2e4e9f48a0bdcbeb4c254775179",
          "0xfa4917a871f9cf06d3d00be6678993888b3aac41c3da21edf32c3c9cf3978d70",
          "0xf8f745f188ddb10c16724faee95583521191c3c69e15490fa53c1136b73c17d7",
          "0xf8663b3c0f78b4efae0422b163e86e79afa1ce90778885d93d53c9d4f6d5c3d8",
          "0xece925dbccbb21333dbe99679fef655ad2dc2cb185e0963711c944e302595b28",
          "0xe92ebafbee7aa7a636ff62e04aa2ab9353f60ef72dcdcfdfcf48b67a7ad8ffc7",
          "0xe48262be7fd7d738763545e81a781fc62e58abf9e0a5f0be228fca5bc01ee1f8",
          "0xde894ab596c084e65d0123ab6fa66f95b0571091cd8ec7efbeabe4942e7c40cd",
          "0xdd3f0e11d59726f2e63fc1b180abc94034dd3e0f4018b51371b73348d82b3769",
          "0xd830e95e4a9a5bddf1e9dea286445f4613ff316c07d5e9b11844e2e8e243ad95",
          "0xd77d3e3e075394a6c94a8c83dab114bb7266b96c5234e4a98476f41339029c30",
          "0xd70673b98af7096f575717d70fbf2fa935dd719926b55c0e011480678cdac563",
          "0xd6e9ff1fa0c9c6bb25cafcb76c61c0d398a479ba073509e10209271f40a01712",
          "0xd10bdc88272e0958baa62a4ae2bfce1d8feed639a93e03c0aa5cec7adfbdf2c3",
          "0xcdd60ed30d20f9edc3fac624bb623db32103658b6da678949ef53df16139b488",
          "0xcdb30c06ea11f3f5408bce5eefdb392dfe0008ef81af3a486bcfed891f9cc112",
          "0xc90525132d909f992363102ebd6298d95b1f312acdb9421fd1f7ac0c0dd78d3f",
          "0xc72fd1a3128f9898ab1bd589119bc9240add1af48d1c39ff23c4028163c8dca8",
          "0xc6887dddd833a3d585c7941cd31b0f8ff3ec5903d49cd5e7ac450b46532d3e79",
          "0xc5165360e2e8b195cb55e21cf259ce6a5ee996b055057d8705851d9b01fc8620",
          "0xc182b0267a6ca015c2d2a144ca19e1f6b36479675754914002e0613320ed8d9a",
          "0xbf379151853f6a5c1509ce6708861c0178ee3c17917dabf996fc47cdf87a6d4a",
          "0xbe5cd829fcb3cdfe8224ad72fc3379198d38da26131c5b7ab6664c8f56a9730d",
          "0xbd3ef685577bdca03225bb2cd2158f0772cdfd694ba03b9eb4856b59a7288081",
          "0xb9f307d83c78d09a134aac7713821aab8e1da2404b895db66f0975135dd5006e",
          "0xb7b78119806fcb9bbc499131da16b52ce52cf4a1ceabfc59e4f2f6e6ef7046c0",
          "0xb36f14fd392b9a1d6c3fabedb9a62a63d2067ca0ebeb63bbc2c93b11cc8eb3a2",
          "0xb32d047eb63b5c2af537c2e4df6a09c40a50b75aefd83a928600241a4666b087",
          "0xb27f671bc0dd8773a25136253acd72150dd59e50e44dc8439e9dc5c84c2b19f6",
          "0xb1d5ccc4388fe639f8d949061bc2de95ecb1efb11c5ceb93bdb71caab58c8aa3",
          "0xaf2a845c9d6007128b7aec375a4fcdee2b12bbaeb78caf928d3bd08e104417d6",
          "0xae7886c751ec92e1b87e8361b2a4c6ce745cab3ddcaf2f539c612a2dc4ed4e62",
          "0xad9ee12ea8b3dccf85934c2918bd4ad38ccf7bc8b43d5fcb6f298858aa4c9ca4",
          "0xabf4b2f17bc32faf4c3295b1347f36d21ec5629128d465b5569e600bf8d46c4f",
          "0xab77a72ca3114da7dfd830033540da34e9045ed96415654893918931f7537bf0",
          "0xab689b5eac7541b8cc774f0ca3705a91b21660e8221fc7bd8e93c391fb5d690d",
          "0xab37ea8895eed81c4aa76d5dba64441756904b15e78f6ffa5183b0fc1563c1c5",
          "0xab32e1695b84b148140cb78c044d247e307b26cb043dc5538657f3a5634dee6e",
          "0xab27dc8061f66791bb94a536546b08ba15e06344dabad2cc6267cf44f0070574",
          "0xaa636d73f39ea0de0e04ed9270eac5d943707e7f8fb9c3480c0d80eb015ccfc8",
          "0xaa449e0679bd82798c7896c6a031f2da55299e64c0b4bddd57ad440921c04628",
          "0xa74b61544834483b093531cff533d01788a5dea12d8a83902646111025303bfb",
          "0xa6905c68ad66ea9ce966aa1662e1417df08be333ab8ec04507e0f0301d3a78e9",
          "0xa655556eb64a0fd18b9a3c80794ab370743bc431a4b2a6116fa97dcc7f741a2b",
          "0xa588ad19850cf2a111c3c727033da8e557abc94de70fce2d2b2f2f78140f15e5",
          "0xa31a8bb230f77a5d286985b92fe8d0c7504a1892568d70685659f781aec78209",
          "0xa295c9d622bf2e562bcae859c46a9e95343982c3eab087b9ab098c256c1a32be",
          "0x9c7bd5b59ebcb9a9e6787b9b174a98a69e27fa5a4fe98270b461a1b9b1b1aa3e",
          "0x9b60d30f266858fa671bf268796aa503700310e31a8f46ebaa8f8281fbad89aa",
          "0x9a117f13c7d5d2b4b18e444f72e6e77c010a1fd90cf21135be75669d66ad9428",
          "0x9778047cb8f3740866882a97a186dff42743bebb3ad8010edbf637ab0e37751f",
          "0x96d19933bdae6454c01b08acc7b5cbc0a847743f65b6d5b80e1ca0b08a95f3a6",
          "0x8f94886f456b6c517c0f53ef7a8d0a66b1b18cab60f42f5d591a42b912eab415",
          "0x8f60f2fe646532e7b33154567c6f31eea9f96060da97d6d26bae538bd303bbed",
          "0x8e73cadb9f3eb2d3531a125dd2f0d746feb71d61aef585e130421eba58f00f4a",
          "0x897eec875e51d6c8b5339d6a9984a00acb0aa86f9d4ab4eddbb4a791bb0a88e9",
          "0x88ee202388086447b8dc8403c5aa2cfbcdb52e749fd16af5c6a3c7bb614b17c9",
          "0x87b88dacbd04f88fe9ddfd3fe8347f3793611d001016069d467d786e4896993c",
          "0x870b2827e7965bce20f621888fb882f1d7e8803b45f556c41330c93612042582",
          "0x86a5077c6a9190cde78ec75b8888c46ed0a3d1289054127a955a2af544633cf3",
          "0x84790e638ddd7a59e64b8c239e96e29c2c6c155a9882a0c834b9ced016b7c999",
          "0x7ecf55915abe3c24dc5d8365a8edabc8833f4efb8e7c027429c9528aed91ecb7",
          "0x7e804adb4c426b81fbe1f005f92d8dee99f98b0502c3946ac5ad436b453c6435",
          "0x7e6902266a4a1904cff69db91904323c29cf50e5a1e4046954c43d7446f03da0",
          "0x7dadff589e53d9813969d0be6de99c033d140ec1d304e57a754797736656dcd5",
          "0x7ccce28638cbb503d17e8d9290a97f18731199655ccde282da7b464f21361b79",
          "0x7be233caf60ad2ec5ee794aa0f1962c94c32378a597b8739e5c0cb3a4958b79e",
          "0x79e0436d7a8563f4beeb66ac9cfd3c40e43ed3b1fa07c57ac91e301da0469c4c",
          "0x72bec627884d7bdf538f174bedd551e9eccf3995adc880f40972e2bab87df3b9",
          "0x72679855f582a6d908bf39d40cb5a299b6a98a82bf1bfd9055f1853fc5160f54",
          "0x71cee3cf3329e9a2803d578cdd6c823d7a16aa39adea3a7053395299bd258800",
          "0x6b3dfac03cea102e59d2d5711088f3001782e07239dcc90f274dd9762220c49a",
          "0x6306bfce6bff30ec4efcea193253c43e057f1474007d0d2a5a0c2938bd6a9b81",
          "0x62bb6fb784e059f338340a9724b35ef2ef8fde5e65613e9fcaacd097d81dc67e",
          "0x6262ac035c2284f5b5249a690a6fd81c35f1ecef501da089f25741a4492cf5f3",
          "0x60b1db95ec90325949de6ca83ed584a00e17f3967c66ee975ac53c5e45969485",
          "0x606d48942091b72a09337280c32d473e0a4f82729974357124ceed9ddbf6969f",
          "0x5f7935e257b94aee6caf9bbe917d4cfad75e8bc3b231806769ca0935af8371e8",
          "0x5f3eb887e8c46508efa707774636dbfab09eaf109d2c8d699917b273da8bcc04",
          "0x5bac1cacdd36b3d95a7f9880a264f8481ab56d3d1a53993de084c6fa5febcc15",
          "0x568f3bb6ba4c6afe37899fda35bc315ae8167274685ea295e03cf20d471afd8b",
          "0x568d2509ec17c27426a9d55e58673160c937aeaedc0a3fcc7c63c5b7df495ec7",
          "0x567d727e1596cdc3db970abe62ee3c43b05ecaa745e55dd3e818a3d7dd69e62b",
          "0x55241e7b57b44ee68d875a1f0618c31f9ab82c46e6eaf2d5acb7605e23cd866b",
          "0x54b4b37c355868591a91baed36a3c8083f6480ccb11145106d0dad912d7dffd2",
          "0x5043bfe3f6bab5fa4c8f19fb2f6856de2d2e717a541e0d7126b308926be04e2e",
          "0x4fa4a76aa8b93ccdddba0c20c336056803b7410fb375c9c9541e9c54fbfb2f9a",
          "0x49104b3cadbb31470e5b949c6892a33954ee9ce35041df4a04a88eb694b645c0",
          "0x460ec133419318efe4e05b4c3b6db421503fd6fcefbb20a43f50e3fc50f2ee39",
          "0x45a3a982031a8fe1b35f53c6db51bd1dbcb588c56abcaf1ca83ebc6fcf5cc4ef",
          "0x431f01f338ff3ec6348f14ffd5702ace4cb33c2106aca184a4cacc4ebd406b34",
          "0x42a09eccabf1080c40a24522e9e8adbee5a0ad907188c9b6e50ba26ba332eac3",
          "0x415f935bbb9bf1bdc1f49f2ca763d5b2406efbf9cc949836880dd5bbd054db95",
          "0x3ef317447bd10825f0a053565f8474a460cfb22cda414ea30b671e304f0691b6",
          "0x3d7cf2bd0a04fd3c66a5fa334a399b3926efe0fc0450b8da49a5da29f2c36d7f",
          "0x3a19f33c056aa1670d280caf9caa9f7125754f2ff5c25dfc6a186a2b7302006b",
          "0x378d4d32d89450978d01cfdf1ff1907d4419aa186c48abb94e612b76d75f3fae",
          "0x2fa37184f43783f5d6b23548c4a7a21bb86cd2f314bba9d5bb7d2415d61d11c8",
          "0x2dd74f8f8a8d7f27b2a82a6edce57b201f9b4a3c4780934caf99363115e48be6",
          "0x2dcd8ec59fe12b4cb802f5a26445f9684635c52139560f169a7c4d67da186c18",
          "0x2a3a73ba927ec6bbf0e2e12e21a32e274a295389ce9d6ae2b32435d12c597c2c",
          "0x290aad1fabd8d2557d28a3854a2433ddc11a35f0d12936dd99102067ac515d07",
          "0x28b337bd45eda5e2fc596bfe22320bef0af9da85d4c770d0fd03ddf72428c00a",
          "0x289dc2a22ebb4ef7404de9293b6718d9f81f0843e1af4cf9a9c51d2e757348d6",
          "0x25f7a422282a1f26d9d96b5d1c43fa5c6f8c355b0ed7a4755ac8d04a504817f5",
          "0x258ac521d801d5112a484ad1b82e6fd2efc24aba29e5cd3d56db83f4a173dc90",
          "0x2242fddcee8fab6c3f73730c7221e324893c72d9e2cc1d811f6f07df15338a50",
          "0x2240151f263be555a4ef61476a5c111373e0efe8cd539f179b4b5850977e9d4e",
          "0x21c6a0baa6f41b060937be5a4f1be096b63f426c50f763b4dabd1af46803fa2f",
          "0x219169d9e78064768cddd0397c2202dc9e5c2bc0e1dbc13465363b0458d33c34",
          "0x20ca89af1fd136d0ef9c4e3e74e8ab1943d28e6879206a3e180fd35e29fb2d7d",
          "0x1e0a98a276ba873cfa427e247c7d0e438f604a54fcb36481063e1220af021faf",
          "0x1997c604de34a71974228bca4a66f601427c48960b6e59ff7ebc8e34f43f3ecf",
          "0x17ffd16948c053cc184c005477548e559566879a0e2847e87ebd1111c602535c",
          "0x14028b015a5ed1e4340c16a8b6f582b49656dd20f2fc8c5af465de6a319c2504",
          "0x0dd68edb796a49667f96c8d7aed3a7375e3a7fb5151341401f3aff3d489d43c2",
          "0x0a7565b14941c6a3dde083fb7a857e27e12c55fa34f709c37586ec585dbe7f3f",
          "0x0964848864e96952ee2454ce58fc93b867f9b2d9a6b44216eec8b08726813d1b",
          "0x092c0c4d8d124fc29364e8cd8417198c4bbe335e3f6c4b1f79215a3457b4831a",
          "0x0484203315d701daff0d6dbdd55c49c3f220c3c7b917892bed1badb8fdc0182e",
          "0x036d9e250c6dafef1dd361199181548f9990a00452abf5231cebe7a15f9e19bd",
          "0x027987432679079fbbc990691d14dabe7f7780f51df6a1a53e7bd875b1f9581a",
          "0x0194c329e2b9712802c37d3f17502bcefce2e128933f24f4fe847dfc7e5e8965",
          "0xb773f2cfc26d17f56cdc1bf33d3a18c26eeddedea7c6562144e742da241d2ab6",
          "0x7593f77f5b2882dcc69ea94926e402a20338fc345b4e66616f86725dda608a32",
          "0x2226f288fb81a54c5f1ebd244313374c0d49ebea0953e0e7ac23d949d64ecbc1",
        ];
        //filter active positions that have a market id that is in boycoMarketIds

        let finishedPositions = activePositions.filter(
          (position) =>
            position.chainId !== 1 ||
            !boycoMarketIds.includes(position.marketId.toLowerCase())
        );
        for (const position of finishedPositions) {
          const underlyingTokenAddress = position.underlyingTokenAddress;
          const underlyingTokenAmount = position.underlyingTokenAmount;

          const tokenDirectory = await findTokenFromDirectory(
            ctx,
            underlyingTokenAddress,
            chainId
          );

          let underlyingTokenPrice = tokenDirectory?.price || null;
          let decimal = tokenDirectory?.decimals || null;
          if (!underlyingTokenPrice || decimal === null) {
            const underlyingTokenInfo = await token.getERC20TokenInfo(
              chainId,
              underlyingTokenAddress
            );

            decimal = underlyingTokenInfo?.decimal || 0;
            underlyingTokenPrice = new BigDecimal(
              (await getPriceByType(
                chainId,
                underlyingTokenAddress,
                ctx.timestamp
              )) || 0
            );
          }

          const scaledAmount = underlyingTokenAmount / BigInt(10 ** decimal);
          const underlyingTokenAmountUsd = new BigDecimal(
            scaledAmount.toString()
          ).multipliedBy(underlyingTokenPrice);

          // Create daily snapshot
          const timestamp = BigInt(Math.floor(Number(ctx.timestamp) / 1000));
          const category = "position_snapshot";
          const metric = new Metric({
            id: `${position.id}_${category}_${timestamp}`,
            name: `${position.id}`,
            accountAddress: position.accountAddress,
            product: "recipe",
            category: category,
            timestamp: timestamp,
            value: underlyingTokenAmountUsd,
            contractAddress: contractConfig.recipemarkethub.address,
            chainId: parseInt(chainId),
            entityId: position.marketId,
          });
          positionSnapshots.push(metric);
        }
        await ctx.store.upsert(positionSnapshots);
      },
      60,
      60 * 24
    );
}
