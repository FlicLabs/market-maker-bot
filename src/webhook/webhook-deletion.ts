const deleteWebhook = async () => {
    const webhookId = "2db9263d-13fb-4806-a667-cd58ddcaec9f"; // Replace with the actual webhook ID
    const apiKey = "ce94322e-9863-4831-b842-689688adb681"; // Replace with your actual API key
  
    console.log(`Attempting to delete webhook ID: ${webhookId} at ${new Date().toISOString()}`);
  
    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${apiKey}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
  
      const text = await response.text(); // Get the raw response text
      console.log("Raw Response:", text); // Log the raw response
  
      const data = JSON.parse(text); // Try parsing the text as JSON
      console.log({ data });
    } catch (e) {
      console.error("Error occurred while deleting webhook:", e);
    }
  };
  
  deleteWebhook();
  