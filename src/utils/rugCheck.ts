import { TokenData } from '../types/types';
import { logger } from './logger';
import { fetchTokenData } from './utils';
import axios from 'axios';

// Global variables to store token data values
let totalSupply: number | null = null;
let maxSupply: number | null = null;
let circulatingSupply: number | null = null;
let developerData: TokenData['developer_data'] | undefined;
let sentimentVotesUpPercentage: number = 0;
let sentimentVotesDownPercentage: number = 0;
let marketCapFDVRatio: number | null = null;

// Utility function for logging with emojis
const logStatus = (message: string, status: boolean | null) => {
  if (status === null) {
    logger.info(`⚠️ ${message} - Data unavailable.`);
  } else if (status) {
    logger.info(`✅ ${message}`);
  } else {
    logger.info(`❌ ${message}`);
  }
};


// Check developer activity
async function checkDeveloperActivity(): Promise<boolean | null> {
  if (!developerData) return null;

  const { forks, stars, commit_count_4_weeks } = developerData;

  const lowActivityThreshold = 10; // Adjust threshold as needed
  const activityScore = (forks + stars + commit_count_4_weeks) / 3;

  return activityScore >= lowActivityThreshold;
}
// Check sentiment votes percentages
async function checkSentimentVotes(): Promise<boolean | null> {
  if (sentimentVotesUpPercentage === null || sentimentVotesDownPercentage === null) return null;
  return sentimentVotesUpPercentage > 50; // Return true if sentiment is positive
}

// Check market cap to FDV ratio
async function checkMarketCapFDVRatio(): Promise<boolean | null> {
  if (marketCapFDVRatio === null) return null;
  return marketCapFDVRatio < 1.2; // Return true if market cap to FDV ratio is healthy
}

// Check total, max, and circulating supply
async function checkSupply(): Promise<boolean | null> {
  if (totalSupply === null || maxSupply === null || circulatingSupply === null) return null;

  const highSupplyThreshold = 10000000000;
  return (
    totalSupply === maxSupply &&
    totalSupply < highSupplyThreshold &&
    circulatingSupply > 0
  ); // Return true if supply checks are met
}

// Main function to check for rug pulls
export async function checkRugPull(tokenAddress: string): Promise<void> {
  const tokenData = await fetchTokenData(tokenAddress);
  
  if (!tokenData || !tokenData.developer_data) {
    console.error("Required token data is missing.");
    return;
  }

  totalSupply = tokenData.total_supply || null;
  maxSupply = tokenData.max_supply || null;
  circulatingSupply = tokenData.circulating_supply || null;
  developerData = tokenData.developer_data;
  sentimentVotesUpPercentage = tokenData.sentiment_votes_up_percentage || 0;
  sentimentVotesDownPercentage = tokenData.sentiment_votes_down_percentage || 0;
  marketCapFDVRatio = tokenData.market_cap_fdv_ratio || null;

  // Check developer activity and log result
  const developerActivityCheck = await checkDeveloperActivity();
  logStatus("Developer activity is low", !developerActivityCheck); // Negate the result for clarity

  // Check sentiment votes and log result
  const sentimentCheck = await checkSentimentVotes();
  logStatus("Sentiment analysis is positive", sentimentCheck);

  // Check market cap to FDV ratio and log result
  const marketCapFDVCheck = await checkMarketCapFDVRatio();
  logStatus("Market Cap to FDV Ratio is healthy", marketCapFDVCheck);

  // Check supply and log result
  const supplyCheck = await checkSupply();
  logStatus("Supply check is valid", supplyCheck);
}
