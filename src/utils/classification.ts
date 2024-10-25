// Importing necessary wallet schemas
import FishWallet from '../models/fishwallets';  // Import FishWallet schema
import WhaleWallet from '../models/whalewallets';  // Import WhaleWallet schema
import DolphinWallet from '../models/dolphinwallets';  // Import DolphinWallet schema
import ShrimpWallet from '../models/shrimpwallets';  // Import ShrimpWallet schema
import PlanktonWallet from '../models/planktonwallets';  // Import PlanktonWallet schema
import TurtleWallet from '../models/turtlewallets';  // Import TurtleWallet schema
import { logger } from './logger';

// Classification types based on marine creatures
const classifications = {
    'Fish': {
        description: 'Small to Medium Size Holders',
        criteria: 'Group trades, quick reactions, and frequent trading.'
    },
    'Whale': {
        description: 'Large Holders / Investors',
        criteria: 'Market manipulation, slow strategic movements, and market control.'
    },
    'Plankton': {
        description: 'Micro Holders',
        criteria: 'Passive trading, influenced by larger movements, quick to sell.'
    },
    'Dolphin': {
        description: 'Medium to Large Holders / Active Traders',
        criteria: 'Strategic trading, agile, and group trading.'
    },
    'Shrimp': {
        description: 'Tiny Holders / Newcomers',
        criteria: 'Searching for small gains, exposed to volatility, and mimicking others.'
    },
    'Turtle': {
        description: 'Long-term Holders',
        criteria: 'Slow but steady trading, patience in the market, and often hold for years.'
    }
};

// Function to classify holders based on their trading patterns and trade completion time
import { calculateTokenAmountForUSDC, moveWalletToNewSchema } from './utils'; // Import the function

// Modify the classifyHolder function to include the newTransaction parameter in the createWalletEntry call
// Modify the classifyHolder function to include the newTransaction parameter in the createWalletEntry call
export const classifyHolder = async (
    holderAddress: string, 
    amountTradedInUSDC: number, 
    openTradeTime: number, 
    finishedTradeTime: number,
    tokenAddress: string
): Promise<string> => {

    if (!holderAddress || amountTradedInUSDC == null || openTradeTime == null || finishedTradeTime == null || !tokenAddress) {
        console.log(`Invalid input data for classification.`);
        return 'Invalid';
    }

    try {
        // Convert the traded amount from USDC to the token amount using the provided function
        const amountTradedInTokens = await calculateTokenAmountForUSDC(tokenAddress, amountTradedInUSDC);

        // Calculate the time taken to complete the trade
        const tradeDuration = finishedTradeTime - openTradeTime;
        const durationInMinutes = tradeDuration / (1000 * 60);

        let classification: string;

        if (amountTradedInTokens > 100000) {
            classification = durationInMinutes < 30 ? 'Whale - Active' : 'Whale - Patient';
        } else if (amountTradedInTokens > 10000) {
            classification = durationInMinutes < 30 ? 'Dolphin - Agile' : 'Dolphin - Steady';
        } else if (amountTradedInTokens > 1000) {
            classification = durationInMinutes < 30 ? 'Fish - Quick' : 'Fish - Steady';
        } else if (amountTradedInTokens <= 100 && amountTradedInTokens > 0) {
            classification = durationInMinutes < 10 ? 'Shrimp - Quick' : 'Shrimp - Patient';
        } else {
            classification = 'Plankton';
        }

        console.log(`Holder ${holderAddress} classified as ${classification}.`);

        const newTransaction = {
            amount: amountTradedInTokens,
            timestamp: finishedTradeTime,
            classification,
        };

        // Check if the wallet already exists and update classification if necessary
        await createWalletEntry(holderAddress, classification, newTransaction);

        return classification;
    } catch (error) {
        console.error(`Error classifying holder: ${error.message}`);
        return 'Error';
    }
};



// Function to create an entry in the respective wallet schema
const createWalletEntry = async (holderAddress: string, classification: string, newTransaction: any): Promise<void> => {
    try {
        if (!holderAddress || !classification) {
            console.log('Missing address or classification.');
            return;
        }

        const commonWalletData = {
            walletAddress: holderAddress,
            tokenBalance: 0,
            lastTradeDate: null,
            transactionHistory: [],
        };

        let WalletModel;

        // Identify classification type
        switch (classification.split(' - ')[0]) {
            case 'Fish': WalletModel = FishWallet; break;
            case 'Whale': WalletModel = WhaleWallet; break;
            case 'Dolphin': WalletModel = DolphinWallet; break;
            case 'Shrimp': WalletModel = ShrimpWallet; break;
            case 'Plankton': WalletModel = PlanktonWallet; break;
            case 'Turtle': WalletModel = TurtleWallet; break;
            default: return;
        }

        const existingWallet = await WalletModel.findOne({ where: { walletAddress: holderAddress } });

        if (existingWallet) {
            // If a wallet is already classified, check if the classification needs to be updated
            if (existingWallet.classification !== classification) {
                // Move the wallet to the new classification schema
                await moveWalletToNewSchema(existingWallet, classification);
            }
        
            // Update transaction history
            if (newTransaction) {
                const updatedTransactionHistory = [...existingWallet.transactionHistory, newTransaction];
        
                await WalletModel.update(
                    { transactionHistory: updatedTransactionHistory, lastTradeDate: new Date() },
                    { where: { walletAddress: holderAddress } }
                );
            }
        } else {
            // Create a new wallet entry if none exists
            await WalletModel.create({
                ...commonWalletData,
                classification,
                transactionHistory: [newTransaction],
                lastTradeDate: new Date()
            });
        }
        
    } catch (error) {
        console.error(`Error creating wallet entry: ${error.message}`);
    }
};


// Export classifications object and createWalletEntry function for external use
export { classifications, createWalletEntry }

//first step --> Classifying after trades are completed 

//Right now i am classifying right after the transaction is listened by the wallet -- which shouldnt be the case so the first step would 
//classification happens when the finishtrade is created while -- if the buy occurs the sale open trade should be created and vice versa --
// and the time should be
//logged which would be trade start time and when that opentrade is fulfilled the time should be logged which would be the trade end time --
// and this would be considered as the trade endtime -- and which will also give us the trade duration which would help us in classifcation later 

//second step -->Updating classifaction with each trade for that wallet 

//i would update the classification if the classification of the wallet already is done in the past and is present in the schemas of the classified types 
//then also classify it again -- then match the previous classifaction with the current classifcation -- if they match then its okay -- 
//if they do not the wallet should be moved to the new classified schema removing it from the previous classification 

//But i am already creating and managing the opentrades and finishtrades in the server script -- so ill need to adjust the classification timing
//instead of happening inside the parsing functions they wwould happen in the server file at the end -->                                    

//third step -->

//3.1-- the trend analysis how that wallet reacted to the trend (did it buy or sell when price high or vice versa?) --3.2. --The trade time of the wallet --
// is there any specific time window the wallet operates in or make trades in that time frame only--or is the wallet a speculative buyer 
//-- categorise accordingly -- 3.3. --map out by the trade analysis and trade patterns -- what is the primary trading strategy the wallet
// operates on -- 


//fourth step -->

//4- trade predictions should be made in advance from the studies in 3rd point and then execute th trade from our main wallet 
//to take a chance for our profit on our predicted trade from that holder


//fifth step -->

// i should also store the data of successful trade predictions and unsuccessful ones for analysing later on -- 
//storage should be made on how much profit i made and how much loss i made -- and the transaction history of my own primary wallet --