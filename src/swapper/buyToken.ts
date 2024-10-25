// Import necessary modules from Solana web3 library
import { Connection, Keypair } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import "dotenv/config";
import { SOLANA_ADDRESS } from "../config/consts";
import {
  convertToInteger,
  getQuote,
  getSwapTransaction,
  finalizeTransaction,
} from "./swapperHelper";
import { logger } from "../utils/logger";
import { getBalanceOfToken } from "../utils/utils";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const buyToken = async (
  primaryWallet: Keypair,
  addressOfTokenIn: string,
  amountOfTokenOut: number,
  waitForConfirmation: boolean,
  wantAmountOfTokenIn: boolean
): Promise<number | string> => {
  try {
    const rpcUrl = process.env.RPC_URL;
    const wsEndpoint = process.env.RPC_WEBSOCKET_ENDPOINT;

    if (!rpcUrl || !wsEndpoint) {
      throw new Error("RPC_URL or RPC_WEBSOCKET_ENDPOINT environment variable is not set.");
    }

    const connection = new Connection(rpcUrl, { wsEndpoint: wsEndpoint });
    const wallet = new Wallet(primaryWallet);
    const walletPublicKey = wallet.publicKey.toString();
    logger.info(`Trying to buy token using ${amountOfTokenOut} SOL...🚀`);

    const initialTokenBalance = await getBalanceOfToken(walletPublicKey, addressOfTokenIn);

    const decimals = 9;
    const slippage = 100;
    const convertedAmountOfTokenOut = convertToInteger(amountOfTokenOut, decimals);

    const quoteResponse = await getQuote(SOLANA_ADDRESS, addressOfTokenIn, convertedAmountOfTokenOut, slippage);
    const amountOfTokenIn = quoteResponse.routePlan[quoteResponse.routePlan.length - 1].swapInfo.outAmount;

    const swapTransaction = await getSwapTransaction(quoteResponse, walletPublicKey);
    const txid = await finalizeTransaction(swapTransaction, wallet, connection) as string;

    if (!txid) {
      throw new Error("Transaction ID is undefined. Transaction may have failed.");
    }

    if (waitForConfirmation) {
      logger.info("Waiting for confirmation... 🕒");

      const latestBlockhash = await connection.getLatestBlockhash();
      let confirmed = false;
      const retries = 5;
      const baseDelay = 1000;

      for (let i = 0; i < retries; i++) {
        try {
          // Try to confirm the transaction first
          await connection.confirmTransaction(
            {
              signature: txid,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            "finalized"
          );
          confirmed = true; // Confirmation succeeded
          break; // Exit the loop if confirmation is successful
        } catch (error) {
          // If confirmation fails, check the balance
          const latestBalance = await getBalanceOfToken(walletPublicKey, addressOfTokenIn);

          // Check if the balance has increased, indicating successful buy
          if (latestBalance > initialTokenBalance) {
            confirmed = true; // Successful balance check
            break; // Exit the loop
          }

          const delay = baseDelay * Math.pow(2, i); // Exponential backoff
          logger.warn(`Confirmation failed. Retrying in ${delay / 1000} seconds...`);
          await sleep(delay); // Wait before retrying
        }
      }

      if (!confirmed) {
        throw new Error("Transaction confirmation failed, or token balance didn't update.");
      }
    }

    logger.info(`Transaction successful. Signature: https://solscan.io/tx/${txid}`);
    return wantAmountOfTokenIn ? amountOfTokenIn : txid;
  } catch (error: any) {
    logger.error(`Error in buyToken: ${error.message}`);
    throw new Error(error.message);
  }
};
