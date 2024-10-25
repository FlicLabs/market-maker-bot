const mongoose = require('mongoose');

const buyBehaviorSchema = new mongoose.Schema({
    walletAddress: { type: String, required: true },
    tokenAddress: { type: String, required: true },
    tokenAmount: { type: Number, required: true },
    solAmount: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
    marketContext: {
        bestPrice: Number,
        worstPrice: Number,
        averagePrice: Number,
        spread: Number,
        liquidity: Number,
        volumes: Number,
        fees: Object,
        volatility: Number,
        trend: String,
        historicalPrices: Array,
        timestamp: { type: Date, default: Date.now }
    },
    timestamp: { type: Date, default: Date.now },
});

const BuyBehavior = mongoose.model('BuyBehavior', buyBehaviorSchema);
