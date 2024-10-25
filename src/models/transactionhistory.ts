import mongoose from 'mongoose';

// Define the Transaction Schema
const transactionHistorySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['BUY', 'SELL'], // Restricting the type to BUY or SELL
        required: true,
    },
    tokenValue: {
        type: Number,
        required: true,
    },
    sellValue: {
        type: Number, // Value at which the token was sold
        required: function() { return this.type === 'SELL'; } // Required only for SELL transactions
    },
    buyValue: {
        type: Number, // Value at which the token was bought
        required: function() { return this.type === 'BUY'; } // Required only for BUY transactions
    },
    transactionDate: {
        type: Date,
        default: Date.now, // Automatically set to the current date/time
    },
    signature: {
        type: String, // Optional: Store transaction signature if available
        required: false,
    },
    // Add any other fields as needed
});

// Create the model
const TransactionHistory = mongoose.model('TransactionHistory', transactionHistorySchema);

export default TransactionHistory;
