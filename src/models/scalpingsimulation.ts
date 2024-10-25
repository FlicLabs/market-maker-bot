import mongoose from 'mongoose';

// Define the trade timestamps schema
const tradeTimestampsSchema = new mongoose.Schema({
  buyTime: { type: Date, required: true },
  sellTime: { type: Date, required: true }
});

// Define the SimulationResult schema
const simulationResultSchema = new mongoose.Schema({
  strategy: { type: String, required: true }, // e.g., "Scalping"
  tokenSymbol: { type: String, required: true }, // e.g., "BTC"
  buyPrice: { type: Number, required: true }, // Buy price at which the trade was executed
  sellPrice: { type: Number, required: true }, // Sell price at which the trade was executed
  profit: { type: Number, required: true }, // Profit or loss from the trade
  walletAddress: { type: String, required: true }, // Wallet address for historical reference
  buyTokenVolume: { type: Number, required: true }, // Volume of tokens bought
  sellTokenVolume: { type: Number, required: true }, // Volume of tokens sold
  tradeTimestamps: { type: tradeTimestampsSchema, required: true }, // Timestamps for buy and sell
  balance: { type: Number, required: true } // Balance after the trade
});

// Create the SimulationResult model
const SimulationResult = mongoose.model('SimulationResult_Scalping', simulationResultSchema);

export default SimulationResult;
