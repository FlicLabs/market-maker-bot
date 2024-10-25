// fishWalletsSchema.ts
import mongoose from 'mongoose';

const fishWalletsSchema = new mongoose.Schema({
    walletAddress: { type: String, required: true, unique: true },
    totalFishHeld: { type: Number, default: 0 },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }], // Reference to transactions
    // Additional fields relevant to fish holders
});

const FishWallet = mongoose.model('FishWallet', fishWalletsSchema);
export default FishWallet;
