import { Keypair } from "@solana/web3.js";
import { SMALL_AMOUNT, TOKEN_SYMBOL, TOKEN_MINT, TIME_INTERVAL } from "../config/strategicSellingConfig";
import bs58 from "bs58";
import 'dotenv/config';
import { sellToken } from "../swapper/sellToken";
import { fetchMarketData } from "../utils/utils"; // Import market data fetching utility
import { getDynamicSellPercentage } from "../utils/utils";
import { result } from "lodash";

const primaryWallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY || ''));

const timelySell = async () => {
    try {
        // Set an interval for timed selling
        setInterval(async () => {
            try {
                // Fetch the latest market data to inform selling decisions
                const marketData = await fetchMarketData();

                // Example: Adjust the sell amount based on market conditions
                const sellAmount = getDynamicSellPercentage(marketData);

                // Log the selling process
                console.log(`Attempting to sell ${sellAmount} ${TOKEN_SYMBOL}...`);

                // Execute the sell transaction
                //const result = await sellToken(primaryWallet, false, TOKEN_MINT, false, sellAmount);

                // Log the result of the sell transaction
                console.log(`Sold ${sellAmount} ${TOKEN_SYMBOL}:`, result);
            } catch (error) {
                console.error("Error during sell transaction:", error);
            }
        }, TIME_INTERVAL);
    } catch (error) {
        console.error("Error setting up timely selling:", error);
    }
}

timelySell()