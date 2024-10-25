// planktonWallets.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPlanktonWallet extends Document {
    walletAddress: string;  // Unique address of the wallet
    tokenBalance: number;    // Current balance of the token
    lastTradeDate: Date;     // Last trade date for the wallet
    transactionHistory: {
        date: Date;
        action: string;  // 'buy' or 'sell'
        amount: number;   // Amount traded
    }[];
}

const planktonWalletSchema: Schema = new Schema({
    walletAddress: { type: String, required: false, unique: true },  // Unique wallet address
    tokenBalance: { type: Number, required: true, default: 0 },     // Current token balance
    lastTradeDate: { type: Date },                                  // Last trade date (optional, updated during transactions)
    transactionHistory: [{                                         // Transaction history array
        date: { type: Date, required: true },                      // Date of transaction
        action: { type: String, enum: ['buy', 'sell', 'transfer'], required: true }, // Action: buy, sell, or transfer
        amount: { type: Number, required: true },                  // Amount of token involved
        tokenSymbol: { type: String, required: true },             // Symbol of the token (e.g., SOL)
        tokenAddress: { type: String },                            // Token's address (optional)
        fromAccount: { type: String },                             // Sender's wallet address (for transfers)
        toAccount: { type: String },                               // Receiver's wallet address (for transfers)
        signature: { type: String },                               // Signature of the transaction
        feePayer: { type: String }                                 // Wallet address paying the transaction fee
    }]
});

const PlanktonWallet = mongoose.model<IPlanktonWallet>('PlanktonWallet', planktonWalletSchema);
export default PlanktonWallet;
