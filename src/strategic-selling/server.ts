import express from 'express'
import bodyParser from 'body-parser'
import { getRandomNumberInRange, logTransaction, parseTransactionResult, parseTransactionHeliusSwap, parseTransactionShyft, readTransaction } from '../utils/controllers';
import { BASE_AMOUNT, SMALL_AMOUNT, TIME_INTERVAL, TOKEN_MINT , TOKEN_SYMBOL, SELLING_THRESHOLD} from '../config/strategicSellingConfig';
import { Keypair } from '@solana/web3.js';
import bs58 from "bs58";
import { sellToken } from '../swapper/sellToken';
import mongoose from "mongoose"
import { analyzeTransactions,  fetchMarketData,  getDynamicSellPercentage } from '../utils/utils'



const primaryWallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY ));
const app = express();
const port = 3001;
let totalBuy = 0;
let totalSell = 0;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.send("Hey");
});


app.post('/webhook', async (req, res) => {
    const transactions = req.body;

    for (const transaction of transactions) {
        let parsedTransaction: { result: any; };
        let result: { buyOrSell: any; tokenValue: any; feePayer?: any; tokenAddress?: any; tokenSymbol?: string; signature?: any; symbol?: string; };

        try {
            // Determine transaction type
            if (transaction?.type === 'SWAP' && transaction?.description) {
                result = await parseTransactionHeliusSwap(transaction);
            } else {
                parsedTransaction = await parseTransactionShyft(transaction?.signature);
                // result = parseTransactionResult(parsedTransaction?.result);
            }

            // Update totals based on transaction results
            if (result?.buyOrSell === 'BUY') {
                totalBuy += result?.tokenValue;
            } else {
                totalSell += result?.tokenValue;
            }

            const marketData = await fetchMarketData();            
            const sellPercentage = getDynamicSellPercentage( marketData); 
            
            // Execute selling strategy based on results
            if (result?.buyOrSell === 'BUY' && result?.tokenValue > BASE_AMOUNT) {
                const tokenToSell : number = (await sellPercentage / 100) * result.tokenValue;
                //await sellToken(primaryWallet, false, TOKEN_MINT, false, false, tokenToSell);
            }

            // Overall sell logic based on total buy and sell
            if ((totalBuy - totalSell) > BASE_AMOUNT) {
                const tokenToSell : number = (await sellPercentage / 100) * BASE_AMOUNT;
               // await sellToken(primaryWallet, false, TOKEN_MINT, false, false, tokenToSell);
            }

            // Threshold-based selling logic 
            if ((totalSell - totalBuy) >= SELLING_THRESHOLD) {
                const profitAmount = totalSell - totalBuy;
               // await sellToken(primaryWallet, false, TOKEN_MINT, false, false, profitAmount);
            }

            console.log("Total Buy:", totalBuy);
            console.log("Total Sell:", totalSell);
            console.log("\n");

        } catch (error) {
            console.error("Error processing transaction:", error);
            // Log error to the database for future analysis
        }
    }

    res.sendStatus(200);
});

// Periodic analysis (could be called at regular intervals using setInterval)
setInterval(analyzeTransactions, TIME_INTERVAL); //what is the role of analyzeTransactions here 

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

