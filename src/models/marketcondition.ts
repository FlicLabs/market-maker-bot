import mongoose, { Document, Model, Schema } from 'mongoose';

interface IMarket extends Document {
    tokenAddress: string;
    marketPrice: number;
    volume24h: number;
    volatility: number;
    timestamp: Date;
}

const marketSchema: Schema<IMarket> = new mongoose.Schema({
    tokenAddress: {
        type: String,
        required: true
    },
    marketPrice: {
        type: Number,
        required: true
    },
    volume24h: {
        type: Number,
        required: true
    },
 
    volatility: {
        type: Number,
        required: true
    },
   
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Market: Model<IMarket> = mongoose.model<IMarket>('market', marketSchema);

export default Market;
