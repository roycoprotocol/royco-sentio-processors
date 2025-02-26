import { CHAIN } from "./constants.js";

export const generateId = (transactionHash: string, logIndex: number) => {
  return `${CHAIN}_${transactionHash.toLowerCase()}_${logIndex}`;
};
