import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true
    },
    tokenSymbol: {
        type: String,
        required: true
    },
    amountSpentForBuy: {
        type: Number,
        required: true
    },
    buyTokenVolume: {
        type: Number,
        required: true
    },
    amountSpentForSell: {
        type: Number,
        default: null
    },
    priceAtBuy: {
        type: Number,
        required: true
    },
    sellTokenVolume: {
        type: Number,
        default: null
    },
    priceAtSell: {
        type: Number,
        default: null
    },
    buySignature: {
        type: String,
        required: true
    },
    sellSignature: {
        type: String,
        default: null
    },
    openTradeTime: {
        type: Date,
        required: true
    },
    finishedTradeTime: {
        type: Date,
        default: null
    },
    classification: {
        type: String,
        default: null
    },
    tradeTime: {
        type: Date,
        default: null
    },
    profit: {
        type: Number,
        default: null
    },
    walletBalance: {
        type: Number,
        required: true // Track balance after each trade
    }
});

export const Trade = mongoose.model('Trade', tradeSchema);
