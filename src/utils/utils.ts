import { ExclusiveHolder, GetTokenAccountsParams, IOpenTrade, TokenData } from "../types/types";
import fs from "fs";
import path from "path";
import "dotenv/config";
import { SolBalanceObject } from "../types/types";
import { AccountInfo, Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { SOLANA_TOKENPROGRAM_ID } from "../config/consts";
import ExclusiveHolders from '../models/exclusiveholders'
import OpenTrades from "../models/opentrades";
import { logger } from "./logger";
import NotExclusiveHolders from "../models/notexclusiveholders";


import { MIN_SOL_BALANCE_EXCLUSIVE, MIN_TOKEN_AMOUNT_EXCLUSIVE  } from "../config/profitConfig";



// Initialize Helius API key
const apiKey = process.env.HELIUS_API_KEY;

// Function to get token accounts
export async function getTokenAccounts(tokenMintAddress: string) {
  let allOwners = new Set();
  let cursor;

  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  while (true) {
    let params: GetTokenAccountsParams = {
      limit: 1000,
      mint: tokenMintAddress,
    };

    if (cursor != undefined) {
      params.cursor = cursor;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccounts",
        params: params,
      }),
    });

    const data = (await response.json()) as any;

    if (!data.result || data.result.token_accounts.length === 0) {
      break;
    }

    data.result.token_accounts.forEach((
      account) => {
      allOwners.add(account.owner);
    });

    cursor = data.result.cursor;
  }

  fs.writeFileSync(
    "./files/tokenHolders.json",
    JSON.stringify(Array.from(allOwners), null, 2)
  );
}

// Function to get exclusive token holders
export async function getExclusiveTokenHolders(tokenMintAddress: string) {
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  await getTokenAccounts(tokenMintAddress);
  try {
    const allOwnersData = JSON.parse(
      fs.readFileSync("./files/tokenHolders.json", "utf8")
    );
    const exclusiveHolders: string[] = [];
    const now = new Date().getTime();

    let i = 0;
    const batchSize = 50;
    console.log("allOwnersData.length", allOwnersData.length);

    do {
      console.log("i", i);
      const slicedAllOwnersData = allOwnersData.slice(
        i,
        Math.min(allOwnersData.length , i + batchSize)
      );
      await Promise.all(
        slicedAllOwnersData.map(async (holder) => {
          const ownerResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "getTokenAccountsByOwner",
              id: 1,
              params: [
                holder,
                {
                  programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                },
                {
                  encoding: "jsonParsed",
                },
              ],
            }),
          });

          const ownerData = (await ownerResponse.json()) as any;
          if (ownerData.result) {
            const ownerTokenAccounts = ownerData.result.value;
            if (
              ownerTokenAccounts.length === 1 &&
              ownerTokenAccounts[0].account.data.parsed.info.mint.toLowerCase() ===
              tokenMintAddress.toLowerCase()
            ) {
              exclusiveHolders.push(holder);
            }
          }
        })
      );
      i += batchSize;
    } while (i < allOwnersData.length);
    fs.writeFileSync(
      "./files/exclusiveHolders.json",
      JSON.stringify(exclusiveHolders, null, 2)
    );
    console.log("Exclusive token holders saved to file.");
  } catch (error) {
    console.error("Error reading owner data from file:", error);
  }
}

// Function to check exclusive token holders
export async function checkExclusiveTokenHolders(tokenMintAddress: string, tokenAddresses: string[]) {
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  try {
    const newExclusiveHolders: string[] = [];
    let i = 0;
    const batchSize = 50;
    do {
      const slicedAllOwnersData = tokenAddresses.slice(
        i,
        Math.min(tokenAddresses.length, i + batchSize)
      );
      await Promise.all(
        slicedAllOwnersData.map(async (holder) => {
          const ownerResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "getTokenAccountsByOwner",
              id: 1,
              params: [
                holder,
                {
                  programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                },
                {
                  encoding: "jsonParsed",
                },
              ],
            }),
          });

          const ownerData = (await ownerResponse.json()) as any;
          if (ownerData.result) {
            const ownerTokenAccounts = ownerData.result.value;
            if (
              ownerTokenAccounts.length === 1 &&
              ownerTokenAccounts[0].account.data.parsed.info.mint.toLowerCase() ===
              tokenMintAddress.toLowerCase()
            ) {
              newExclusiveHolders.push(holder);
            }
          }
        })
      );
      i += batchSize;
    } while (i < tokenAddresses.length);

    const pathFile = path.join(__dirname, "..", "./files/exclusiveHolders.json");
    if (fs.existsSync(pathFile)) {
      try {
        const data = fs.readFileSync(pathFile, 'utf8');
        let jsonData;
        if (data.trim() === '') {
          jsonData = [];
        } else {
          jsonData = JSON.parse(data);
        }
        newExclusiveHolders.forEach( holder => {
          jsonData.push(holder);
        });        
        const updatedData = JSON.stringify(jsonData, null, 2);
        fs.writeFileSync(pathFile, updatedData, 'utf8');
        console.log('Exclusive Token Holder file has been updated');
      } catch (err) {
        console.error('Error reading or writing the Exclusive Token Holder File:', err);
      }
    } else {
      try {
        const exclusiveHolderData = JSON.stringify(newExclusiveHolders, null, 2);
        fs.writeFileSync(pathFile, exclusiveHolderData, 'utf8');
        console.log('Exclusive Token Holder file has been updated');
      } catch (err) {
        console.error('Error writing the Exclusive Token Holder File:', err);
      }
    }
  } catch (error) {
    console.error("Error updating Exclusive Token Holder File:", error);
  }

}

// Function to get SOL balance
// Function to get SOL balance
export async function getSolanaBalance(walletAddress) {
    const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    for (let attempts = 0; attempts < 5; attempts++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "getBalance",
                    id: 1,
                    params: [walletAddress],
                }),
            });

            const data = await response.json();
            

            if (data.result as unknown ) {
                const balanceInLamports = data.result.value; // This is in lamports
                const balanceInSOL = balanceInLamports / 1e9; // Convert to SOL
                return balanceInSOL; // Return balance in SOL
            } else if (data.error) {
                // Log the error code and message
                console.error("Error fetching balance:", data.error);
                break;
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
            break;
        }
    }
    return 0; // Return 0 if the balance couldn't be fetched
}



// Function to get multiple SOL balances
export async function getMultipleAccountsSolanaBalance(
  walletAddresses: string[]
): Promise<SolBalanceObject> {

  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;


  const solBalances: { [key: string]: { sol: number } } = {};
  const slicedWalletAddress = [];

  for (let i = 0; i < walletAddresses.length; i += 100) {
    slicedWalletAddress.push(walletAddresses.slice(i, Math.min(walletAddresses.length, i + 100)));
  }

  const connection = new Connection(url, 'confirmed');

  try {
    await Promise.all(slicedWalletAddress.map(async (walletAddresses) => {
      const walletPubkeys = walletAddresses.map((walletAddress) => new PublicKey(walletAddress))
      const accounts = await connection.getMultipleAccountsInfo(walletPubkeys)
      accounts.forEach((account, index) => {
        if (account !== null) {
          const lamports = account.lamports;
          const sol = lamports / 1e9;
          solBalances[walletAddresses[index]] = { sol: sol }
        } else {
          solBalances[walletAddresses[index]] = { sol: 0 }
        }
      });
    }))
    delay(1000)
  } catch (err) {
    console.log("ERROR FETHING SOLANA BALANCES", err)
  }

  return solBalances;
}

// Function to read exclusive token holders
export async function readExclusiveTokenHolders(): Promise<ExclusiveHolder[]> {
  try {
    const walletAddressArray = await ExclusiveHolders.find(
      { openTrade: false },
      'walletAddress solBalance tokenAddress'
    ).lean();

    return walletAddressArray;
  } catch (err) {
    console.error("An error occurred while retrieving wallet addresses:", err);
    return []; 
  }
}

export function readTokenHolders(): string[] {
  const filePath = path.join(__dirname, "..", "./files/tokenHolders.json");

  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    if (data.trim() === "") {
      return [];
    }
    return JSON.parse(data);
  }

  return [];
}

// Function to read open trades
export  async function readOpenTrades(): Promise<IOpenTrade[]> {
  try {
    const openTradesArray = await OpenTrades.find({}).lean();

    return openTradesArray;
  } catch (err) {
    console.error("An error occurred while retrieving open trades:", err);
    return []; 
  }
}

// Function to get token decimals
export async function getTokenDecimals(tokenAddress: string) {
  const connection = new Connection(process.env.RPC_URL);
  try {
      let mint = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));

      if (!mint || !mint.value || mint.value.data instanceof Buffer) {
          throw new Error("Could not find mint");
      }

      const decimals = mint.value.data.parsed.info.decimals;
      return decimals;
  } catch (error) {
      // Handle the error gracefully
      console.error(`Error getting decimals for token ${tokenAddress}:`, error.message);
      // You can return a default value, throw a custom error, or return null based on your logic
      return null; // or throw a new custom error if needed
  }
}


// Function to delay
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets amount of tokens in wallet for given addressToken
 * @param {string} addressOfToken
 * @returns {Promise<number> || Promise<boolean>} amountOfToken
 */
export const getBalanceOfToken = async (
  publicKeyOfWalletToQuery: string,
  addressOfToken: string,
): Promise<number> => {
  try {
    if (!publicKeyOfWalletToQuery) {
      throw new Error("No wallet to query");
    }
    const accounts = await getParsedProgramAccounts(
      publicKeyOfWalletToQuery,
    );

    const relevantAccount = accounts.find((account) => {
      const parsedAccountInfo = account.account.data;
      if (parsedAccountInfo instanceof Buffer) {
        console.log("parsedAccountInfo is a buffer");
        return false; // Skip this account
      }
      const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
      if (mintAddress === addressOfToken) {
        return true; // This account is relevant
      }
      return false; // Skip this account
    });
    if (!relevantAccount) {
      return 0;
    }
    if (relevantAccount.account.data instanceof Buffer) {
      throw new Error("relevantAccount is a buffer");
    }

    const tokenBalance =
      relevantAccount.account.data["parsed"]["info"]["tokenAmount"]["uiAmount"];

    return tokenBalance;
  } catch (error: any) {
    throw new Error(error);
  }
};

// Function to get parsed program accounts
export async function getParsedProgramAccounts(
  wallet: string,
): Promise<
  {
    pubkey: PublicKey;
    account: AccountInfo<ParsedAccountData | Buffer>;
  }[]
> {

  const connection = new Connection(process.env.RPC_URL)
  const filters = [
    {
      dataSize: 165, // size of account (bytes)
    },
    {
      memcmp: {
        offset: 32, // location of our query in the account (bytes)
        bytes: wallet, // our search criteria, a base58 encoded string
      },
    },
  ];
  const TOKEN_PROGRAM_ID = new PublicKey(SOLANA_TOKENPROGRAM_ID);
  const accounts = await connection.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID,
    { filters: filters }
  );
  return accounts;
}

// Function to check exclusive token holder
export async function checkExclusiveTokenHolder(tokenMintAddress: string, walletAddress: string) {
  // Check if the wallet is already in NotExclusiveHolders
  const existingNotExclusiveHolder = await NotExclusiveHolders.findOne({ walletAddress });
  if (existingNotExclusiveHolder) {
    // logger.info('Non-Exclusive holder already exists. Skipping addition.');
    return null;  
  }

  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  try {
    const ownerResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "getTokenAccountsByOwner",
        id: 1,
        params: [
          walletAddress,
          {
            programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          },
          {
            encoding: "jsonParsed",
          },
        ],
      }),
    });

    const ownerData = (await ownerResponse.json()) as any;

    if (ownerData.result) {
      const ownerTokenAccounts = ownerData.result.value;

      // Check if ownerTokenAccounts is not empty and has the expected structure
      if (
        Array.isArray(ownerTokenAccounts) &&
        ownerTokenAccounts.length === 1 &&
        ownerTokenAccounts[0]?.account?.data?.parsed?.info?.mint // Safe navigation operator to prevent TypeError
      ) {
        // Now we can safely access the mint property
        if (ownerTokenAccounts[0].account.data.parsed.info.mint.toLowerCase() === tokenMintAddress.toLowerCase()) {
          // logger.info("Exclusive Holder Found");
          const solBalance: number = await getSolanaBalance(walletAddress);
          console.log(solBalance);
          const tokenBalance: number = ownerTokenAccounts[0].account.data.parsed.info.tokenAmount.uiAmount;
          const minTokenBalance = await calculateTokenAmountForUSDC(tokenMintAddress, MIN_TOKEN_AMOUNT_EXCLUSIVE);
          console.log(minTokenBalance);
          
          // Check if the holder already exists in ExclusiveHolders
          const existingExclusiveHolder = await ExclusiveHolders.findOne({ walletAddress });
          if (!existingExclusiveHolder) {
            if (solBalance > MIN_SOL_BALANCE_EXCLUSIVE && tokenBalance > minTokenBalance) {
              await ExclusiveHolders.create({
                walletAddress: walletAddress,
                tokenAddress: tokenMintAddress,
                solBalance: solBalance,
                tokenBalance: tokenBalance,
                openTrade: false,
              }).then(() => {
                // logger.info('Exclusive holder added successfully');
              }).catch((err) => {
                // logger.error('Error adding Exclusive holder:', { message: err.message, stack: err.stack });
              });

              return {
                walletAddress,
                tokenMintAddress,
                solBalance,
                tokenBalance
              };
            }
          } else {
            // logger.info('Exclusive holder already exists. Skipping addition.');
          }
        } else {
          // Handle the case when the wallet is a NotExclusive holder
          const existingNotExclusiveHolder = await NotExclusiveHolders.findOne({ walletAddress });
          if (!existingNotExclusiveHolder) {
            await NotExclusiveHolders.create({
              walletAddress: walletAddress,
              tokenAddress: tokenMintAddress,
            }).then(() => {
              // logger.info('Non-Exclusive holder added successfully');
            }).catch((err) => {
              // logger.error('Error adding Not Exclusive holder:', { message: err.message, stack: err.stack });
            });
          } else {
            // logger.info('Non-Exclusive holder already exists. Skipping addition.');
          }
        }
      } else {
        // logger.warn("No token accounts found or unexpected structure in ownerTokenAccounts");
      }
    }
  } catch (error) {
    // logger.error("Error checking for exclusive holder = ", { message: error, stack: error.stack });
  }

  return null;
}


// Function to calculate token amount for USDC
export async function calculateTokenAmountForUSDC(tokenAddress: string, amountInUSDC: number): Promise<number> {
  const response = await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddress}`);
  const data = await response.json();
  
  const tokenPrice = data?.data[tokenAddress]?.price;
  const tokenAmount = Math.floor((1 / tokenPrice) * amountInUSDC);
  
  return tokenAmount;
}

//Function to convert usdc to sol 

// Queue to manage requests to calculateSOLAmountForUSDC
const solRequestQueue = [];
let isProcessingQueue = false;

// Function to process the request queue
async function processQueue() {
  while (solRequestQueue.length > 0) {
    const { resolve, reject, amountInUSDC } = solRequestQueue.shift();

    try {
      const solAmount = await fetchSOLPrice(amountInUSDC);
      resolve(solAmount);
    } catch (error) {
      reject(error);
    }
  }
  isProcessingQueue = false; // Mark the queue processing as complete
}

// Function to fetch SOL price and calculate SOL amount for USDC
async function fetchSOLPrice(amountInUSDC: number): Promise<number> {
  // Use CoinGecko API to get the price of SOL in USDC
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');

  console.log(response.status); // Log the status code

  if (!response.ok) {
    throw new Error(`Failed to fetch SOL price: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  const solPrice = data?.solana?.usd;  // Get the price of 1 SOL in USDC
  if (!solPrice) {
    throw new Error('SOL price data not available');
  }
  
  const solAmount = amountInUSDC / solPrice;  // Convert USDC amount to SOL equivalent
  return solAmount;
}

export async function calculateSOLAmountForUSDC(amountInUSDC: number): Promise<number> {
  // If there is no ongoing processing, start the queue processing
  if (!isProcessingQueue) {
    isProcessingQueue = true;
    processQueue();
  }

  // Return a promise to add this request to the queue
  return new Promise((resolve, reject) => {
    solRequestQueue.push({ resolve, reject, amountInUSDC });
  });
}






// Function to get token price
export async function getTokenPrice(tokenAddress: string): Promise<number> {
  const response = await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddress}`);
  const data = await response.json();
  return data?.data[tokenAddress]?.price || 0;
}

/**
 * Function to get the token balance for a specific wallet and token mint address
 * @param {string} walletAddress - The public address of the wallet
 * @param {string} tokenMintAddress - The mint address of the token
 * @returns {Promise<number>} - The balance of the specified token in the wallet
 */
export const getParsedTokenAccountsByOwner = async (
  walletAddress: string,
  tokenMintAddress: string
): Promise<number> => {
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          {
            programId: SOLANA_TOKENPROGRAM_ID,
          },
          {
            encoding: "jsonParsed",
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.result && data.result.value) {
      const tokenAccounts = data.result.value;
      const tokenAccount = tokenAccounts.find((account: any) => 
        account.account.data.parsed.info.mint.toLowerCase() === tokenMintAddress.toLowerCase()
      );

      if (tokenAccount) {
        return tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
      }
    }
    
    return 0; // Return 0 if no accounts found or if balance is not available
  } catch (error) {
    console.error("Error fetching token accounts:", error);
    return 0; // Return 0 on error
  }
};

//Functions to get prices from various dex's (i havent tested the api list listed in this function yet)

import axios from 'axios';
import transactionhistory from "../models/transactionhistory";

/**
 * Fetch prices of a specific token from multiple DEXs.
 * @param {string} tokenAddress - The address of the token to get prices for.
 * @returns {Promise<Array<number|null>>} - An array containing prices from different DEXs.
 */
export async function getPricesFromDEXs(tokenAddress) {
    const dexApis = {
        uniswap: `https://api.uniswap.org/v1/prices/${tokenAddress}`,
        sushiSwap: `https://api.sushi.com/v1/prices/${tokenAddress}`,
        quickSwap: `https://api.quickswap.com/v1/prices/${tokenAddress}`,
        balancer: `https://api.balancer.finance/v1/prices/${tokenAddress}`,
        // Add more DEX API URLs as needed
    };

    const pricePromises = Object.entries(dexApis).map(async ([dexName, url]) => {
        try {
            const response = await axios.get(url);
            // Assuming the API response contains price data in response.data.price
            return response.data.price; // Return only the price
        } catch (error) {
            console.error(`Error fetching price from ${dexName}:`, error.message);
            return null; // Return null for errors
        }
    });

    const prices = await Promise.all(pricePromises);
    return prices; // Return the array of prices directly
}

// Function to analyze transaction history
export const analyzeTransactions = async () => {
  try {
      // Fetch historical transactions from the database (MongoDB assumed here)
      const transactions = await fetchHistoricalTransactions();

      // Aggregate data for analysis
      const analysisData = {
          totalBuys: 0,
          totalSells: 0,
          totalProfit: 0,
          transactionCount: transactions.length,
          profitRatios: []
      };

      transactions.forEach(transactions => {
          if (transactions.type === 'BUY') {
              analysisData.totalBuys += transactions.tokenValue;
          } else if (transactions.type === 'SELL') {
              analysisData.totalSells += transactions.tokenValue;
              const profit = transactions.sellValue - transactions.buyValue;
              analysisData.totalProfit += profit;
              // Calculate profit ratio for this transaction
              const profitRatio = profit / transactions.buyValue;
              analysisData.profitRatios.push(profitRatio);
          }
      });

      // Calculate average profit ratio
      const averageProfitRatio = analysisData.profitRatios.reduce((acc, ratio) => acc + ratio, 0) / analysisData.profitRatios.length || 0;

      // Log the analysis results
      console.log("Transaction Analysis:");
      console.log(`Total Buys: ${analysisData.totalBuys}`);
      console.log(`Total Sells: ${analysisData.totalSells}`);
      console.log(`Total Profit: ${analysisData.totalProfit}`);
      console.log(`Average Profit Ratio: ${(averageProfitRatio * 100).toFixed(2)}%`);
      console.log(`Total Transactions: ${analysisData.transactionCount}`);

      // Here you can implement logic to adjust your selling strategy based on the analysis results
      // For example, if the average profit ratio is high, you may want to be more aggressive with selling...

  } catch (error) {
      console.error("Error analyzing transactions:", error);
  }
};

// Example function to fetch historical transactions from a MongoDB database
export const fetchHistoricalTransactions = async () => {
  // Assuming a Mongoose model named Transaction
  const transactions = await transactionhistory.find({}); // Modify the query as needed
  return transactions;
};


export const getDynamicSellPercentage = async (marketData: {
    id: any; // Example: 'solana'
    name: any; // Example: 'Solana'
    currentPrice: any; // Example: 147.28
    marketCap: any; // Example: 69096423046
    priceChangePercentage: any; // Example: 2.44729
    circulatingSupply: any; // Example: 469269835.061705
}) => {
  try {
      // Fetch market data from the API
      const marketData = await fetchMarketData();

      // Extract relevant parameters from market data
      const currentPrice = marketData.currentPrice; // Current price
      const marketCap = marketData.marketCap; // Market capitalization
      const priceChangePercentage = marketData.priceChangePercentage; // Price change percentage over the last 24 hours
      const circulatingSupply = marketData.circulatingSupply; // Circulating supply

      let sellPercentage: number;

      // Example logic to determine sell percentage based on market conditions
      if (priceChangePercentage > 5) { // If price has increased more than 5%
          sellPercentage = 70; // More aggressive selling
      } else if (currentPrice < (marketCap / circulatingSupply) * 0.9) { // If current price is significantly lower than fair value
          sellPercentage = 30; // Less aggressive selling
      } else if (priceChangePercentage < -5) { // If price has decreased more than 5%
          sellPercentage = 40; // Conservative selling
      } else {
          sellPercentage = 50; // Default percentage
      }

      return sellPercentage;

  } catch (error) {
      console.error("Error fetching market data:", error);
      return 50; // Default percentage in case of an error
  }
};


// Example function to fetch market data
export const fetchMarketData = async () => {
  const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets',{
    params: {
        vs_currency: 'usd',  // Specify the currency
        order: 'market_cap_desc',  // Sort by market cap
        per_page: 10,  // Number of results per page
        page: 1,  // Page number
    }
});

// Hypothetical response structure
return {
  id: response.data.id, // Example: 'solana'
  name: response.data.name, // Example: 'Solana'
  currentPrice: response.data.current_price, // Example: 147.28
  marketCap: response.data.market_cap, // Example: 69096423046
  priceChangePercentage: response.data.price_change_percentage_24h, // Example: 2.44729
  circulatingSupply: response.data.circulating_supply // Example: 469269835.061705
};

};

// Function to Fetch historical prices 


export async function fetchHistoricalPrices(tokenSymbol, period) {
  try {
      // Query the HistoricalData collection for the given tokenSymbol
      // Sort by timestamp in descending order (most recent first)
      const historicalData = await HistoricalData.find({ tokenSymbol })
          .sort({ timestamp: -1 })  // Sort by newest data first
          .limit(period)             // Limit to the number of periods (e.g., 50)
          .select('priceAtBuy')       // Only select the priceAtBuy field
          .exec();

      // Map the result to extract the priceAtBuy into an array
      const prices = historicalData.map(data => data.priceAtBuy);

      // Return the array of prices
      return prices;

  } catch (error) {
      console.error(`Error fetching historical prices for ${tokenSymbol}:`, error);
      throw new Error("Failed to fetch historical prices.");
  }
}

//function to store historical prices 

import { HistoricalPrice } from "../models/historicalprices";

export async function storeHistoricalPrices(tokenAddress, prices) {
    try {
        // Here, you would typically interact with your database to store the prices.
        // This is a mock implementation. Replace it with your actual database logic.
        const historicalData = {
            tokenAddress,
            prices,
            timestamp: new Date().toISOString(), // Add a timestamp for reference
        };

        // Example: storing the data in a database
        await HistoricalPrice.collection('historicalPrices').insertOne(historicalData); // Adjust based on your DB structure

        console.log(`Historical prices for ${tokenAddress} stored successfully.`);
    } catch (error) {
        console.error(`Error storing historical prices for ${tokenAddress}: ${error.message}`);
        throw error;
    }
}

//Function to fetch the market context at the time of the transaction 

import { TOKEN_DETAILS } from '../config/profitConfig';
// This function fetches current market prices and other details from multiple DEXs for the token pair.
export async function getMarketContext(tokenSymbol: string) {
  try {
    const tokenAddress = TOKEN_DETAILS[tokenSymbol];
    if (!tokenAddress) {
      throw new Error(`Token address for ${tokenSymbol} not found.`);
    }

    // Fetch current market data from CoinGecko
    const { price, liquidity, volumes, fees } = await getPricesAndMarketDataFromDEXs(tokenAddress);

    if (!price) {
      throw new Error(`No price found for ${tokenSymbol}`);
    }

    const period = 10;

    // Fetch historical price data for trend analysis (e.g., last 7 days)
    const historicalPrices = await fetchHistoricalPrices(tokenSymbol, period); // Function to fetch historical data
    const bestPrice = Math.max(...historicalPrices);
    const worstPrice = Math.min(...historicalPrices);
    const averagePrice = historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length;
    const volatility = (bestPrice - worstPrice) / bestPrice; // Volatility percentage
    const trend = price > averagePrice ? 'uptrend' : 'downtrend'; // Compare current price with average

    // Set thresholds for arbitrage based on price differences and fees
    const arbitrageOpportunity = price > worstPrice * 1.05 && fees < 0.03; // Arbitrage logic

    const timestamp = new Date().toISOString();

    logger.info(`Market context for ${tokenSymbol}: Current Price = ${price}, Best Price = ${bestPrice}, Worst Price = ${worstPrice}`);

    return {
      tokenAddress,
      currentPrice: price,
      bestPrice,
      worstPrice,
      averagePrice,
      spread: bestPrice - worstPrice,
      arbitrageOpportunity,
      liquidity,
      volumes,
      fees,
      volatility,
      trend,
      historicalPrices,
      timestamp,
    };
  } catch (error) {
    logger.error(`Error getting market context for ${tokenSymbol}: ${error.message}`);
    throw error;
  }
}


//Function to get prices from different DEXs and Token Data 

export async function getPricesAndMarketDataFromDEXs(tokenAddress) {
  try {
    const dexAPI = `https://api.coingecko.com/api/v3/coins/solana/contract/${tokenAddress}`;

    const response = await axios.get(dexAPI);
    const { market_data } = response.data;

    return {
      price: market_data.current_price.usd,
      liquidity: market_data.total_volume.usd, // Treating total volume as liquidity
      volumes: market_data.total_volume.usd,   // Using the same value for trading volume
      fees: 0.02, // Default fee placeholder (you may adjust this as needed)
    };
  } catch (error) {
    console.error("Error fetching market data from CoinGecko:", error);
    throw new Error("Failed to retrieve market data");
  }
}


//function to get relevant token data for rugchecks 

import fetch from 'node-fetch';// Import fetch for making API calls

export async function fetchTokenData(tokenAddress: string): Promise<TokenData | null> {
  try {
    const DEX_API_URL = `https://api.coingecko.com/api/v3/coins/solana/contract`;
    const url = `${DEX_API_URL}/${tokenAddress}`;

    const response = await axios.get(url); // Use axios for error handling features

    if (!response.data) {
      throw new Error(`Error fetching token data for ${tokenAddress}`);
    }

    const tokenData = response.data;

    if (!tokenData.id) {
      throw new Error(`Token data not found for ${tokenAddress}`);
    }

    return tokenData;
  } catch (error) {
    console.error(`Error fetching token data for ${tokenAddress}:`, error);
    return null;
  }
}

//Function to update classification "

// Importing necessary wallet schemas
import FishWallet from '../models/fishwallets';  // Import FishWallet schema
import WhaleWallet from '../models/whalewallets';  // Import WhaleWallet schema
import DolphinWallet from '../models/dolphinwallets';  // Import DolphinWallet schema
import ShrimpWallet from '../models/shrimpwallets';  // Import ShrimpWallet schema
import PlanktonWallet from '../models/planktonwallets';  // Import PlanktonWallet schema
import TurtleWallet from '../models/turtlewallets';  // Import TurtleWallet schema
import HistoricalData from "../models/historicaldata";

// Map of schemas for easy access
const walletSchemas = {
  Fish: FishWallet,
  Whale: WhaleWallet,
  Dolphin: DolphinWallet,
  Shrimp: ShrimpWallet,
  Plankton: PlanktonWallet,
  Turtle: TurtleWallet,
};


// Function to move a wallet to a new schema
export const moveWalletToNewSchema = async (existingWallet, newClassification) => {
    if (!existingWallet || !newClassification) {
        console.log('Invalid parameters for moving wallet schema.');
        return;
    }

    try {
        // Extract the wallet's classification
        const currentClassification = existingWallet.classification.split(' - ')[0];
        
        // Determine the model/schema for the current and new classifications
        const currentWalletModel = walletSchemas[currentClassification];
        const newWalletModel = walletSchemas[newClassification.split(' - ')[0]];

        if (!currentWalletModel || !newWalletModel) {
            console.log(`Unknown wallet schemas for classification types: ${currentClassification}, ${newClassification}`);
            return;
        }

        // Step 1: Delete the wallet from the current schema
        await currentWalletModel.destroy({ where: { walletAddress: existingWallet.walletAddress } });
        console.log(`Wallet ${existingWallet.walletAddress} removed from ${currentClassification} schema.`);

        // Step 2: Add the wallet to the new schema with all its existing data
        const newWalletData = {
            walletAddress: existingWallet.walletAddress,
            tokenBalance: existingWallet.tokenBalance,
            lastTradeDate: existingWallet.lastTradeDate,
            transactionHistory: existingWallet.transactionHistory,
        };

        await newWalletModel.create(newWalletData);
        console.log(`Wallet ${existingWallet.walletAddress} moved to ${newClassification} schema.`);

    } catch (error) {
        console.error(`Error moving wallet to new schema: ${error.message}`);
    }
};

//Function to record buyBehaviour of that wallet



export async function recordBuyBehavior(data) {
  const {
      walletAddress,
      tokenAddress,
      tokenValue, // This will be used as tokenAmount in the schema
      solAmount, // You need to pass the SOL amount separately to match the schema
      priceAtPurchase, // This needs to be passed to the function
      transactionSignature,
      marketContext,
  } = data;

  // Insert into the BuyBehavior schema
  await BuyBehavior.create({
      walletAddress,
      tokenAddress,
      tokenAmount: tokenValue,  // Rename tokenValue to tokenAmount
      solAmount,  // Include the SOL amount
      priceAtPurchase, // Include the price at purchase

      // Market context
      marketContext: {
          bestPrice: marketContext.bestPrice,
          worstPrice: marketContext.worstPrice,
          averagePrice: marketContext.averagePrice,
          spread: marketContext.spread,
          liquidity: marketContext.liquidity,
          volumes: marketContext.volumes,
          fees: marketContext.fees,
          volatility: marketContext.volatility,
          trend: marketContext.trend,
          historicalPrices: marketContext.historicalPrices, // Storing historical prices
          timestamp: new Date().toISOString(),
      },
      
      timestamp: new Date().toISOString(), // Store the transaction timestamp
  });
}

// Function to record sell behavior
export async function recordSellBehavior(data) {
  const {
      walletAddress,
      tokenAddress,
      tokenSymbol, // Added token symbol for clarity
      tokenValue, // This will be used as tokenAmount in the schema
      solAmount, // You need to pass the SOL amount separately to match the schema
      priceAtSale, // Include the price at sale
      transactionSignature,
      marketContext,
  } = data;

  // Insert into the sellBehavior schema
  await SellBehavior.create({
      walletAddress,
      tokenAddress,
      tokenSymbol,
      tokenAmount: tokenValue,  // Rename tokenValue to tokenAmount
      solAmount,  // Include the SOL amount
      priceAtSale, // Include the price at sale
      
      // Market context
      marketContext: {
          bestPrice: marketContext.bestPrice,
          worstPrice: marketContext.worstPrice,
          averagePrice: marketContext.averagePrice,
          spread: marketContext.spread,
          liquidity: marketContext.liquidity,
          volumes: marketContext.volumes,
          fees: marketContext.fees,
          volatility: marketContext.volatility,
          trend: marketContext.trend,
          historicalPrices: marketContext.historicalPrices, // Storing historical prices
          timestamp: new Date().toISOString(),
      },
      
      timestamp: new Date().toISOString(), // Store the transaction timestamp
  });
}


export async function calculateMovingAverage(tokenSymbol, period) {
  // Add logic to calculate the moving average from historical data
  const prices = await fetchHistoricalPrices(tokenSymbol, period);
  const sum = prices.reduce((acc, price) => acc + price, 0);
  return sum / prices.length;
}