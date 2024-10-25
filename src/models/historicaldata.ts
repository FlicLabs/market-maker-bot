import mongoose from "mongoose";

// Utility function to format timestamps to a human-readable 24-hour format
const formatTimestamp = (timestamp: number): string | null => {
    if (!timestamp) return null; // Handle null or undefined timestamps
    const date = new Date(timestamp); // Convert timestamp to Date object

    // Define options with correct string literal types
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',   // Correctly defined as 'numeric'
        month: '2-digit',  // Correctly defined as '2-digit'
        day: '2-digit',    // Correctly defined as '2-digit'
        hour: '2-digit',   // Correctly defined as '2-digit'
        minute: '2-digit', // Correctly defined as '2-digit'
        second: '2-digit', // Correctly defined as '2-digit'
        hour12: false,     // 24-hour format
        timeZone: 'Asia/Kolkata', // Set timezone to IST
    };

    // Return the formatted date as a string
    return date.toLocaleString('en-IN', options); // Using 'en-IN' for Indian format
};

const historicalDataSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
    },
    tokenSymbol: {
        type: String,
        required: true,
    },
    AmountspentforBuy: {
        type: Number,
        required: true,
    },
    buyTokenVolume: {
        type: Number,
        required: true,
    },
    AmountspentforSell: {
        type: Number,
        default: null, // Will be updated during SELL
    },
    priceAtBuy: {
        type: Number,
        required: true,
    },
    sellTokenVolume: {
        type: Number,
        default: null,
    },
    priceAtSell: {
        type: Number,
        default: null, // Will be updated during SELL
    },
    buysignature: {
        type: String,
        required: true, // Will be updated during SELL
    },
    sellsignature: {
        type: String,
        default: null, // Will be updated during SELL
    },
    openTradeTime: {
        type: Number,
        required: true,
    },
    finishedTradeTime: {
        type: Number,
        default: null, // Will be updated during SELL
    },
    classification: {
        type: String,
        default: null, // Will be updated during SELL
    },
    TradeTime: {
        type: Number,
        default: null, // Will be updated during SELL
    },
});

// Method to format timestamps when fetching data
historicalDataSchema.methods.toHumanReadableFormat = function() {
    return {
        walletAddress: this.walletAddress,
        tokenSymbol: this.tokenSymbol,
        AmountspentforBuy: this.AmountspentforBuy,
        buyTokenVolume: this.buyTokenVolume,
        AmountspentforSell: this.AmountspentforSell,
        priceAtBuy: this.priceAtBuy,
        sellTokenVolume: this.sellTokenVolume,
        priceAtSell: this.priceAtSell,
        buysignature: this.buysignature,
        sellsignature: this.sellsignature,
        openTradeTime: formatTimestamp(this.openTradeTime),
        finishedTradeTime: formatTimestamp(this.finishedTradeTime), // Format finishedTradeTime
        classification: this.classification,
        TradeTime: formatTimestamp(this.TradeTime), // Format TradeTime
    };
};

const HistoricalData = mongoose.model('HistoricalData', historicalDataSchema);

export default HistoricalData;
