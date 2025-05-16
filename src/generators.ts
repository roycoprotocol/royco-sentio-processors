import { EthChainId } from "@sentio/sdk/eth";

export const generateId = (
  transactionHash: string,
  logIndex: number,
  chainId: EthChainId
) => {
  return `${chainId}_${transactionHash.toLowerCase()}_${logIndex}`;
};
