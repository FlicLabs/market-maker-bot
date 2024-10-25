import mongoose from "mongoose";

const SimulationResultSchema = new mongoose.Schema({
  strategy: { type: String, required: true }, // e.g., "Moving Average"
  tokenSymbol: { type: String, required: true },
  buyPrice: { type: Number, required: true },
  sellPrice: { type: Number, required: true },
  profit: { type: Number, required: true },
  shortPeriod: { type: Number, required: true },
  longPeriod: { type: Number, required: true },
  walletAddress: { type: String, required: true },
  buyTokenVolume : { type: Number, required: true },
  sellTokenVolume : { type: Number, required: true },
  tradeTimestamps: {
    buyTime: { type: Date, required: true },
    sellTime: { type: Date, required: true },
  },
  createdAt: { type: Date, default: Date.now }
});

const SimulationResult = mongoose.model("SimulationResult", SimulationResultSchema);
export default SimulationResult;
