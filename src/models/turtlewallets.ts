import mongoose from 'mongoose';

const turtleWalletsSchema = new mongoose.Schema({
    walletAddress: { type: String, required: true, unique: true },   // Unique wallet address
    totalTurtleHeld: { type: Number, default: 0 },                   // Total Turtle tokens held
    transactionHistory: [{                                           // Transaction history array
        date: { type: Date, required: true },                        // Date of the transaction
        action: { type: String, enum: ['buy', 'sell', 'transfer'], required: true },  // Action type (buy, sell, transfer)
        amount: { type: Number, required: true },                    // Amount of token involved in the transaction
        tokenSymbol: { type: String, required: true },               // Symbol of the token (e.g., TURT)
        tokenAddress: { type: String },                              // Address of the token (optional)
        fromAccount: { type: String },                               // Sender's wallet address (for transfer transactions)
        toAccount: { type: String },                                 // Receiver's wallet address (for transfer transactions)
        signature: { type: String },                                 // Signature of the transaction
        feePayer: { type: String }                                   // Wallet address paying the transaction fee
    }]
});

const TurtleWallet = mongoose.model('TurtleWallet', turtleWalletsSchema);
export default TurtleWallet;
