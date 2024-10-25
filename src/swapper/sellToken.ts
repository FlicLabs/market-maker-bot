// Import required modules from Solana web3 library
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
// Import Wallet class from Anchor library for wallet management
import { Wallet } from "@project-serum/anchor";
// Import base58 encoding/decoding utility
import bs58 from "bs58";
// Import utility functions for token balance and decimals
import { getBalanceOfToken, getTokenDecimals } from "../utils/utils";
// Import environment configuration
import "dotenv/config";
// Import functions for swap operations and transaction finalization
import {
  convertToInteger,
  finalizeTransaction,
  getQuote,
  getSwapTransaction,
} from "./swapperHelper";
// Import constant for Solana address
import { SOLANA_ADDRESS } from "../config/consts";
// Import logger for logging messages
import { logger } from "../utils/logger";

// Function to handle token selling
export const sellToken = async (
  primaryWallet: Keypair, // Primary wallet for transaction
  sellAll: boolean, // Flag to indicate if all tokens should be sold
  addressOfTokenOut: string, // Address of the token to be sold
  waitForConfirmation: boolean, // Flag to wait for transaction confirmation
  wantAmountOfSolIn: boolean, // Flag to return amount of SOL received
  amountOfTokenToSell?: number, // Optional amount of token to sell
): Promise<number | string> => {
  // Throw an error if not selling all tokens and no amount specified
  if (!sellAll && !amountOfTokenToSell) {
    throw new Error(
      "You need to specify AMOUNT_OF_TOKEN_TO_SELL if SELL_ALL is false"
    );
  }

  // Create a connection to the Solana blockchain using the RPC URL from environment variables
  const connection = new Connection(process.env.RPC_URL);
  // Create a wallet instance from the primary wallet keypair
  const wallet = new Wallet(primaryWallet);

  // Get the public key of the wallet to query for token balance
  const publicKeyOfWalletToQuery = wallet.publicKey.toString();
  // If selling all tokens, get the token balance to sell
  sellAll
    ? (amountOfTokenToSell = await getBalanceOfToken(
        publicKeyOfWalletToQuery,
        addressOfTokenOut
      ))
    : amountOfTokenToSell;

  // Throw an error if there are no tokens to sell
  if (!amountOfTokenToSell) {
    throw new Error("No tokens to sell");
  }

  // Log the amount of tokens being sold
  logger.info(`Selling ${amountOfTokenToSell} Tokens 🚀`);

  try {
    // Get the decimal places of the token
    const decimals = await getTokenDecimals(addressOfTokenOut);
    // Define slippage as 1% (100 basis points)
    const slippage = 100; // slippage is 1%
    // Convert the amount of tokens to an integer value based on decimals
    const convertedAmountOfTokenOut = convertToInteger(
      amountOfTokenToSell,
      decimals
    );

    // Get a quote for the swap transaction
    const quoteResponse = await getQuote(
      addressOfTokenOut,
      SOLANA_ADDRESS,
      convertedAmountOfTokenOut,
      slippage
    );

    // Extract the amount of SOL to be received from the quote response
    const amountOfSolIn: number =
      quoteResponse.routePlan[quoteResponse.routePlan.length - 1].swapInfo
        .outAmount;

    // Get the public key of the wallet for the swap transaction
    const walletPublicKey = wallet.publicKey.toString();

    // Create a swap transaction based on the quote
    const swapTransaction = await getSwapTransaction(
      quoteResponse,
      walletPublicKey
    );

    // Finalize the transaction and get the transaction ID
    const txid = await finalizeTransaction(swapTransaction, wallet, connection);

    // Get the latest blockhash for transaction confirmation
    const latestBlockhash = await connection.getLatestBlockhash()

    // If waiting for confirmation, confirm the transaction
    if (waitForConfirmation) {
      logger.info("Waiting for confirmation... 🕒");

      const confirmation = await connection.confirmTransaction(
        {
          signature: txid,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "finalized" // Optional commitment level
      );

      // Check if the confirmation was successful
      if (confirmation.value.err) {
        // If confirmation fails, check the wallet's SOL balance to verify if tokens were sold
        const solBalance = await connection.getBalance(new PublicKey(walletPublicKey));
        logger.warn("Confirmation error. Checking SOL balance as fallback...");

        // Compare balance with expected SOL from sale
        if (solBalance >= amountOfSolIn) {
          logger.info(`Transaction likely succeeded. Received ${solBalance} SOL ✅`);
          return wantAmountOfSolIn ? solBalance : txid;
        } else {
          throw new Error("Transaction confirmation failed and balance check suggests no tokens sold");
        }
      }
    }

    // Log the result of the transaction
    logger.info(`Sold ${amountOfTokenToSell} Token for ${amountOfSolIn} SOL ✅`);
    logger.info(`Signature = https://solscan.io/tx/${txid}`);

    // Return the amount of SOL received or the transaction ID based on the flag
    return wantAmountOfSolIn ? amountOfSolIn : txid;

  } catch (error: any) {
    // Log the error message
    logger.error(`Error in sellToken function: ${error.message}`);
    throw new Error(error);
  }
};
