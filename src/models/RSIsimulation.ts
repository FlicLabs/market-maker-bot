import mongoose from 'mongoose';

const SimulationResultSchema = new mongoose.Schema({
  strategy: {
    type: String,
    required: true,
  },
  tokenSymbol: {
    type: String,
    required: true,
  },
  buyPrice: {
    type: Number,
    required: true,
  },
  sellPrice: {
    type: Number,
    required: true,
  },
  profit: {
    type: Number,
    required: true,
  },
  rsiPeriod: {
    type: Number,
    required: true,
  },
  walletAddress: {  // Primary wallet address
    type: String,
    required: false,
  },
  buyTokenVolume: {
    type: Number,
    required: true,
  },
  sellTokenVolume: {
    type: Number,
    required: true,
  },
  tradeTimestamps: {
    buyTime: {
      type: Date,
      required: true,
    },
    sellTime: {
      type: Date,
      required: true,
    },
  },
  balance: {
    type: Number,
    required: true,
  },
  totalDollarsSpent: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt timestamps
});

// Export the model
const SimulationResult_RSI = mongoose.model('SimulationResult_RSI', SimulationResultSchema);
export default SimulationResult_RSI;
