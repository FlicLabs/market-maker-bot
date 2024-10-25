// transactionSchema.ts
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    holderAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    tokenType: { type: String, required: true }, // e.g., 'fish', 'shrimp', 'dolphin', etc.
    timestamp: { type: Date, default: Date.now },
    // Add more features based on your use case
    feature1: { type: Number, required: true }, // Example feature
    feature2: { type: Number, required: true }, // Example feature
    // Add other features as necessary
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
