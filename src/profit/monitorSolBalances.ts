// Importing utility functions from a local module
import { 
    getSolanaBalance,  // Function to get the SOL balance of a wallet
    readExclusiveTokenHolders,  // Function to read exclusive token holders' details //what do you mean by exclusive token holders here
    getBalanceOfToken,  // Function to get the balance of a specific token in a wallet 
    getTokenDecimals,  // Function to get the number of decimals for a token
    delay,  // Function to introduce a delay (e.g., sleep for a specified time)
    getTokenPrice  // Function to get the price of a token
} from "../utils/utils";

// Importing environment variables
import 'dotenv/config';

import { buyToken } from "../swapper/buyToken";

import { Keypair } from "@solana/web3.js";


import bs58 from "bs58";

import { ExclusiveHolderDetails, SolBalanceObject } from "../types/types";


import OpenTrades from "../models/opentrades";


import { logger } from "../utils/logger";

import mongoose from "mongoose";

import ExclusiveHolders from "../models/exclusiveholders";


import { SolanaBalanceListener } from "../utils/SolanaBalanceListener";


import { MIN_SOL_DIFFERENCE_TO_UPDATE } from "../config/profitConfig";

// Define constants
const userWalletPublicKey = process.env.WALLET_PUBLIC_KEY || 'YOUR_PUBLIC_KEY'; 
const primaryWallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY || '')); 

// Connect to MongoDB
mongoose
.connect('mongodb://127.0.0.1:27017/market-maker-bot') // Connecting to MongoDB at the specified URL
.then(() => logger.info("Mongo Connected")) // Log success message if connected
.catch(err => logger.error("Mongo Error", err)); // Log error message if connection fails

// Fetch exclusive holder details
async function fetchExclusiveHolderDetails(): Promise<ExclusiveHolderDetails> {
    // Retrieve the list of exclusive token holders
    const exclusiveHolders = await readExclusiveTokenHolders();

    // If no exclusive holders are found, log info and return empty object
    if (exclusiveHolders.length === 0) {
        logger.info("No Exclusive Holder");
        await delay(1000); // Delay before next operation
        return {};
    }

    const exclusiveHolderDetails: ExclusiveHolderDetails = exclusiveHolders.reduce((acc, holder) => {
        acc[holder.walletAddress] = {
            sol: holder.solBalance,  
            tokenAddress: holder.tokenAddress 
        };
        return acc;
    }, {} as ExclusiveHolderDetails);

    return exclusiveHolderDetails;
}

// Process wallet balances
async function processWallet(walletAddresses: string[], exclusiveHolderDetails: ExclusiveHolderDetails, currentBalances: SolBalanceObject): Promise<void> {
    
    // Iterate over each wallet address
    for (const wallet of walletAddresses) {
        const currentBalance = currentBalances[wallet].sol; // Get the current balance of the wallet
        const previousBalance = exclusiveHolderDetails[wallet].sol; // Get the previous balance of the wallet
        const balanceDifference = currentBalance - previousBalance; // Calculate the difference in balance

        // If SOL was deducted, log and update the balance
        if (currentBalance < previousBalance) {
            logger.info(`SOL deducted from wallet ${wallet}: ${balanceDifference.toFixed(4)} SOL ⬇️`);
            await ExclusiveHolders.updateOne(
                { walletAddress: wallet },  // Filter to find the wallet
                { $set: { solBalance: currentBalance } }  // Update the SOL balance
            );
            continue;
        }

        // If balance difference is less than the minimum threshold, log and update the balance
        if (Math.floor(balanceDifference) < MIN_SOL_DIFFERENCE_TO_UPDATE) {
            logger.info(`Wallet ${wallet} balance change (${balanceDifference.toFixed(4)} SOL) doesn't meet the minimum threshold of 5 SOL ⚠️`);
            await ExclusiveHolders.updateOne(
                { walletAddress: wallet },  // Filter to find the wallet
                { $set: { solBalance: currentBalance } }  // Update the SOL balance
            );
            continue; 
        } 

        // If SOL was added, log the addition
        logger.info(`SOL added to wallet ${wallet}: ${balanceDifference.toFixed(4)} SOL ✅`);

        // Calculate the amount of SOL to buy with a random percentage
        const randomPercentage = Math.floor(Math.random() * 11) + 50;  
        const solanaToBuy = Math.floor((randomPercentage / 100) * currentBalance); 
        const userSolanaBalance = await getSolanaBalance(userWalletPublicKey);  

        // if (userSolanaBalance < solanaToBuy) {
        //     logger.warn(`User doesn't have enough SOL balance. Required: ${solanaToBuy}, Available: ${userSolanaBalance} ❌`);
        //     continue;  // Skip to the next wallet if insufficient balance
        // }

        try {
            // Retrieve token decimals and price
            const decimals = await getTokenDecimals(exclusiveHolderDetails[wallet].tokenAddress);
            const tokenPrice = await getTokenPrice(exclusiveHolderDetails[wallet].tokenAddress);

            logger.info(`Attempting to purchase token with ${solanaToBuy} SOL 🚀`);
            // Buy the token and calculate the amount to sell
            const tokenToSell = (await buyToken(primaryWallet, exclusiveHolderDetails[wallet].tokenAddress, solanaToBuy, false, true) as number) / 10 ** decimals;
            
            // Get the initial token balance
            const initialTokenBalance = await getBalanceOfToken(wallet, exclusiveHolderDetails[wallet].tokenAddress);

            // Create a record of the open trade
            await OpenTrades.create({
                walletAddress: wallet,  // Wallet address
                solBalance: currentBalance,  // Current SOL balance
                tokenBalance: initialTokenBalance,  // Initial token balance
                tokenAddress: exclusiveHolderDetails[wallet].tokenAddress,  // Token address
                openTradeType: 'SELL',  // Type of trade
                tokenAmount: tokenToSell,  // Amount of token to sell
                solAmount: solanaToBuy,  // Amount of SOL used
                tokenDecimal: decimals,  // Number of decimals for the token
                tokenPrice: tokenPrice,  // Price of the token
                timeStamp: new Date().getTime()  // Timestamp of the trade
            }).then(() => {
                logger.info(`Open Trade created for wallet ${wallet}`);
            }).catch((err) => {
                logger.error("Error in creating open trade", { message: err.message, stack: err.stack });
            });

            await ExclusiveHolders.updateOne(
                { walletAddress: wallet },
                { $set: { openTrade: true, solBalance: currentBalance } }
            ).then(() => {
                logger.info(`Updated ExclusiveHolder for ${wallet}: openTrade set to true, solBalance updated to ${currentBalance} ✅`);
            }).catch((err) => {
                logger.error(`Error updating ExclusiveHolder for ${wallet}`, { message: err.message, stack: err.stack });
            });

        } catch (err) {
            logger.error("Error in token purchase", { message: err.message, stack: err.stack });
            await ExclusiveHolders.updateOne(
                { walletAddress: wallet },
                { $set: { solBalance: currentBalance } }
            ).catch((updateErr) => {
                logger.error(`Error updating solBalance for ${wallet} after failed purchase`, { message: updateErr.message, stack: updateErr.stack });
            });
        }
    }
}

// Monitor wallets for SOL balance changes
export async function monitorWalletsForSolanaPurchase(): Promise<void> {

    const listener = new SolanaBalanceListener(process.env.RPC_URL || '');
    const monitoredWallets = new Set<string>();

    async function handleBalanceChange(walletAddress: string, newBalance: number) {
        const exclusiveHolderDetails = await fetchExclusiveHolderDetails();
        if (exclusiveHolderDetails[walletAddress]) {
            const currentBalances = { [walletAddress]: { sol: newBalance } };
            await processWallet([walletAddress], exclusiveHolderDetails, currentBalances);
        }
    }

    listener.on('balanceChanged', handleBalanceChange);
    
    while (true) {
        try {
            const exclusiveHolderDetails = await fetchExclusiveHolderDetails();

            if (Object.keys(exclusiveHolderDetails).length === 0) {
                continue;
            }

            logger.info('Checking if Exclusive holder SOL balance updated....');

            for (const [walletAddress] of Object.entries(exclusiveHolderDetails)) {
                if (!monitoredWallets.has(walletAddress)) {
                    listener.addHolder(walletAddress);
                    monitoredWallets.add(walletAddress);
                    logger.info(`Added listener for wallet: ${walletAddress}`);
                }
            }

            const exclusiveHolderWallets: string[] = Object.keys(exclusiveHolderDetails);

            for (const walletAddress of monitoredWallets) {
                if (!(exclusiveHolderWallets.includes(walletAddress))) {
                    listener.removeHolder(walletAddress);
                    monitoredWallets.delete(walletAddress);
                    logger.info(`Removed listener for wallet: ${walletAddress}`);
                }
            }

            if (global.gc) {
                global.gc();
            }

            await delay(1000);
        } catch (err) {
            logger.error("An error occurred:", { message: err.message, stack: err.stack });
            await delay(2000) ;
        }
    }
}

process.on('SIGINT', () => {
    logger.info('Gracefully shutting down...');
    process.exit(0);
});

monitorWalletsForSolanaPurchase().catch(console.error);
