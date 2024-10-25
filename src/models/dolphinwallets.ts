import mongoose from 'mongoose';

const dolphinWalletsSchema = new mongoose.Schema({
    walletAddress: { type: String, required: true, unique: true },   // Unique wallet address
    totalDolphinHeld: { type: Number, default: 0 },                  // Total Dolphin tokens held
    transactionHistory: [{                                           // Transaction history array
        date: { type: Date, required: true },                        // Date of transaction
        action: { type: String, enum: ['buy', 'sell', 'transfer'], required: true },  // Action: buy, sell, or transfer
        amount: { type: Number, required: true },                    // Amount of token involved
        tokenSymbol: { type: String, required: true },               // Symbol of the token (e.g., SOL)
        tokenAddress: { type: String },                              // Token's address (optional)
        fromAccount: { type: String },                               // Sender's wallet address (for transfers)
        toAccount: { type: String },                                 // Receiver's wallet address (for transfers)
        signature: { type: String },                                 // Signature of the transaction
        feePayer: { type: String }                                   // Wallet address paying the transaction fee
    }]
});

const DolphinWallet = mongoose.model('DolphinWallet', dolphinWalletsSchema);
export default DolphinWallet;
