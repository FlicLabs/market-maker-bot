import 'dotenv/config';
import { logger } from '../utils/logger';
import { TOKEN_DETAILS } from '../config/profitConfig';




// Function to delete existing webhooks
const deleteExistingWebhooks = async () => {
    try {
        const response = await fetch(
            `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
            {
                method: 'GET',
            }
        );
        
        const webhooks = await response.json();
        
        if (webhooks.length > 0) {
            // Delete all existing webhooks
            for (const webhook of webhooks) {
                await fetch(
                    `https://api.helius.xyz/v0/webhooks/${webhook.webhookID}?api-key=${process.env.HELIUS_API_KEY}`,
                    {
                        method: 'DELETE',
                    }
                );
                logger.info(`Deleted existing webhook with ID: ${webhook.webhookID}`);
            }
        } else {
            logger.info('No existing webhooks found to delete.');
        }
    } catch (error) {
        
        throw error;
    }
};



export const createWebhook = async (tokenAddresses: any, webhookURL: string) => {
    try {
        // First, delete any existing webhooks
        await deleteExistingWebhooks();
        const tokenAddresses = Object.values(TOKEN_DETAILS); 
       const webhookURL = process.env.WEBHOOK_URL;
    //    console.log(webhookURL);

        // Then, create a new webhook
        const response = await fetch(
            `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "webhookURL": webhookURL,
                    "transactionTypes": ["Any"],
                    "accountAddresses": tokenAddresses,
                    "webhookType": "enhanced", // "rawDevnet"
                    "txnStatus": "success", // success/failed
                }),
            }
        );

        if (!response.ok) {
            const errorResponse = await response.json();
            logger.error('Failed to create webhook:', errorResponse);
            throw new Error(`Webhook creation failed: ${errorResponse.message}`);
        }

        const data = await response.json();
        if (data && data.webhookID) {
            logger.info('Webhook setup successfully ✅');
            return data.webhookID;
        } else {
            logger.error('Webhook creation failed: No webhook ID returned');
            throw new Error('No webhook ID returned');
        }
    } catch (error) {
        throw error;
    }
};
