import { EthChainId } from "@sentio/sdk/eth";

export const SUBGRAPH_URL = {
  [EthChainId.ETHEREUM]: {
    recipe:
      "https://api.goldsky.com/api/public/project_cm07c8u214nt801v1b45zb60i/subgraphs/royco-recipe-mainnet/2.0.22/gn",
    vault:
      "https://api.goldsky.com/api/public/project_cm07c8u214nt801v1b45zb60i/subgraphs/royco-vault-mainnet/2.0.15/gn",
  },
  [EthChainId.SONIC_MAINNET]: {
    recipe:
      "https://api.goldsky.com/api/public/project_cm07c8u214nt801v1b45zb60i/subgraphs/royco-recipe-sonic/2.0.22/gn",
    vault:
      "https://api.goldsky.com/api/public/project_cm07c8u214nt801v1b45zb60i/subgraphs/royco-vault-sonic/2.0.15/gn",
  },
};

// For Testing
// export const CHAIN = EthChainId.ETHEREUM;

// For Production
export const CHAIN = EthChainId.SONIC_MAINNET;

export const CONTRACT = {
  [EthChainId.ETHEREUM]: {
    recipemarkethub: {
      address: "0x783251f103555068c1e9d755f69458f39ed937c0",
      startBlock: 21303368,
    },
    wrappedvaultfactory: {
      address: "0x75e502644284edf34421f9c355d75db79e343bca",
      startBlock: 21244948,
    },
  },
  [EthChainId.SONIC_MAINNET]: {
    recipemarkethub: {
      address: "0xfcc593ad3705ebcd72ec961c63eb484be795bdbd",
      startBlock: 4353631,
    },
    wrappedvaultfactory: {
      address: "0x7212d98a88d44f714fd29dd980cb846be8e7491a",
      startBlock: 4353631,
    },
  },
  [EthChainId.BASE]: {
    recipemarkethub: {
      address: "0x783251f103555068c1e9d755f69458f39ed937c0",
      startBlock: 23108227,
    },
    wrappedvaultfactory: {
      address: "0x75e502644284edf34421f9c355d75db79e343bca",
      startBlock: 22754606,
    },
  },
  [EthChainId.ARBITRUM]: {
    recipemarkethub: {
      address: "0x783251f103555068c1e9d755f69458f39ed937c0",
      startBlock: 280018459,
    },
    wrappedvaultfactory: {
      address: "0x75e502644284edf34421f9c355d75db79e343bca",
      startBlock: 277208990,
    },
  },
  [EthChainId.HYPER_EVM]: {
    recipemarkethub: {
      address: "0x6af057b1c423d108ab710d6f4e3e46f3536787fd",
      startBlock: 650861,
    },
    wrappedvaultfactory: {
      address: "0xda0a91f0fcc2a7c1922165a28038d89babe8ccfa",
      startBlock: 206979,
    },
  },
  [EthChainId.CORN_MAIZENET]: {
    recipemarkethub: {
      address: "0x783251f103555068c1e9d755f69458f39ed937c0",
      startBlock: 9044,
    },
    wrappedvaultfactory: {
      address: "0x75e502644284edf34421f9c355d75db79e343bca",
      startBlock: 9044,
    },
  },
};
