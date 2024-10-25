import mongoose from 'mongoose';

// Define the schema for the trade entry
const simulationResultSchema = new mongoose.Schema({
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
  walletAddress: {
    type: String,
    required: true,
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
});

// Create the model from the schema
const SimulationResult = mongoose.model('MomentumStrategy', simulationResultSchema);

export default SimulationResult;
