// Import required modules from Solana web3 library
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
// Import fetch for making HTTP requests
import fetch from "cross-fetch";
// Import types for Route and SwapResponse
import { Route, SwapResponse } from "../types/types";
// Import Wallet class from Anchor library for wallet management
import { Wallet } from "@project-serum/anchor";
// Import constant for swap execution flag
import { EXECUTE_SWAP } from "../config/swapperConfig";
// Import logger for logging messages
import { logger } from "../utils/logger";

// Function to get a quote for a swap transaction
export const getQuote = async (
  addressOfTokenOut: string, // Address of the token to be swapped out
  addressOfTokenIn: string, // Address of the token to be swapped in
  convertedAmountOfTokenOut: number, // Amount of the token to be swapped out in integer format
  slippage: number // Slippage percentage (in basis points)
) => {
  // Convert slippage to basis points
  slippage *= 100;
  // Construct the URL for fetching the quote from the API
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${addressOfTokenOut}&outputMint=${addressOfTokenIn}&amount=${convertedAmountOfTokenOut}&slippageBps=${slippage}`;
  // Fetch the quote from the API
  const resp = await fetch(url);
  // Parse the response JSON into a Route object
  const quoteResponse: Route = await resp.json();
  // Return the quote response
  return quoteResponse;
};

// Function to get the swap transaction
export const getSwapTransaction = async (
  quoteResponse: Route, // Quote response object containing swap details
  walletPublicKey: string, // Public key of the wallet initiating the swap
): Promise<string> => {
  try {
    // Record the start time of the swap request (for logging or metrics)
    const swapStartTime = new Date().getTime();
    let body: any;
    // Construct the body of the POST request for the swap transaction
    body = {
      quoteResponse,
      userPublicKey: walletPublicKey,
      wrapAndUnwrapSol: true, // Flag to wrap and unwrap SOL during swap
      restrictIntermediateTokens: false, // Flag to allow intermediate tokens in the swap
      prioritizationFeeLamports: 250000, // Fee for prioritization in lamports
    };
    // Send a POST request to the API to get the swap transaction
    const resp = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Set content type to JSON
      },
      body: JSON.stringify(body), // Convert the body to a JSON string
    });

    // Parse the response JSON into a SwapResponse object
    const swapResponse: SwapResponse = await resp.json();
    // Return the swap transaction in string format
    return swapResponse.swapTransaction;
  } catch (error: any) {
    // Throw an error if the request fails
    throw new Error(error);
  }
};

// Function to convert an amount to an integer based on token decimals
export const convertToInteger = (amount: number, decimals: number) => {
  // Convert the amount to an integer by multiplying with 10^decimals and flooring the result
  return Math.floor(amount * 10 ** decimals);
};

// Function to finalize and send the transaction
export const finalizeTransaction = async (
  swapTransaction: string, // Swap transaction in base64 string format
  wallet: Wallet, // Wallet used to sign the transaction
  connection: Connection // Solana blockchain connection
): Promise<string> => {
  try {
    // Deserialize the transaction from base64 string to buffer
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");

    // Deserialize the buffer into a VersionedTransaction object
    let transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    if(EXECUTE_SWAP){
      // If executing swap, sign the transaction with the wallet's payer keypair
      transaction.sign([wallet.payer]);
      // Serialize the transaction to raw format
      const rawTransaction = transaction.serialize();
      // Send the raw transaction to the blockchain and get the transaction ID
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false, // Ensure preflight checks are performed
        // preflightCommitment: "confirmed", // Optional commitment level for preflight check
      });

      // Return the transaction ID
      console.log(`txid is ${txid}`)
      
      return txid;
    }else{
      // If not executing swap, simulate the transaction
      logger.info("Simulating Transaction 🚀");
      await connection.simulateTransaction(transaction);
      logger.info("Simulated Transaction ✅");
    }
 
  } catch (error: any) {
    // Log an error if finalizing the transaction fails
    logger.error("Error finalizing transaction", error);
  }
};
