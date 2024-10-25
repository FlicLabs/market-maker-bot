import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import bs58 from "bs58";
import { getRandomNumberInRange, parseTransactionResult, parseTransactionShyft } from '../utils/controllers';
import { BASE_AMOUNT, TOKEN_MINT, TOKEN_SYMBOL } from '../config/minimizeVolatilityConfig';
import { sellToken } from '../swapper/sellToken';
import { buyToken } from '../swapper/buyToken';

const app = express();
const port = 4786;

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send("Hey");
});

app.post('/webhook', async (req, res) => {
    const transactions = req.body;

    let parsedTransaction : any;
    let result : any ;

    for (const transaction of transactions) {
        logTransaction(transaction, "nero-helius");



        if (transaction?.type === 'SWAP' && transaction?.description) {
            const result = await parseTransactionDescription(transaction, TOKEN_SYMBOL);

        } else{

            const parsedTransaction = await parseTransactionShyft(transaction?.signature);
            const result = parseTransactionResult(parsedTransaction?.result);

        }

       

        // Check liquidity before executing trade
        const liquidity = await getLiquidity(TOKEN_MINT); // Fetch current liquidity
        console.log("Current Liquidity:", liquidity);

        if (result?.buyOrSell === 'BUY' && result?.tokenValue > BASE_AMOUNT) {
            // Calculate sell amount based on liquidity
            const randomPercentage = getRandomNumberInRange(50, 70);
            const tokenToSell = (randomPercentage / 100) * result.tokenValue;

            // Limit sell amount based on liquidity
            const adjustedSellAmount = Math.min(tokenToSell, liquidity * 0.1); 
            console.log("Adjusted SELL TOKEN", adjustedSellAmount);

           
            // await sellToken(primaryWallet, false, TOKEN_MINT, false, adjustedSellAmount);
        }

        if (result?.buyOrSell === 'SELL' && result?.tokenValue > BASE_AMOUNT) {
            // Calculate buy amount based on liquidity
            const randomPercentage = getRandomNumberInRange(50, 70);
            const response = await fetch(`https://price.jup.ag/v6/price?ids=SOL&vsToken=${TOKEN_MINT}`, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate'
                }
            });
            const priceData = await response.json();
            const tokenToBuy = ((randomPercentage / 100) * result.tokenValue) / priceData?.data?.SOL?.price;

            // Limit buy amount based on liquidity
            const adjustedBuyAmount = Math.min(tokenToBuy, liquidity * 0.1); 
            console.log("Adjusted BUY TOKEN", adjustedBuyAmount);

          
            // await buyToken(primaryWallet, TOKEN_MINT, adjustedBuyAmount, false, false);
        }
    }

    res.sendStatus(200);
});

// Function to get current liquidity for a specific token mint
async function getLiquidity( TOKEN_MINT) {
    // Fetch current liquidity from the appropriate liquidity pool
    // This is a pseudo-code example; you need to implement actual API calls or SDK usage
    const response = await fetch(`https://api.raydium.io/pairs?mint=${TOKEN_MINT}`);
    const liquidityData = await response.json();
    //remains to study the api structure yet (this is a dummy code for the same to get the liquidity)
    return liquidityData?.liquidity; 
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

const logTransaction = (transaction, name) => {
    const logFilePath = path.join(__dirname, `${name}.json`);
    let transactions = [];
    if (fs.existsSync(logFilePath)) {
        const data = fs.readFileSync(logFilePath, 'utf8');
        transactions = JSON.parse(data);
    }
    transactions.push(transaction);
    fs.writeFileSync(logFilePath, JSON.stringify(transactions, null, 2), 'utf8');
};
function parseTransactionDescription(transaction: any, TOKEN_SYMBOL: string) {
    throw new Error('Function not implemented.');
}

