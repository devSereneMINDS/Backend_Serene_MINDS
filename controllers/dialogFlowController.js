import sql from '../config/db.js';

// Intent handler functions
const intentHandlers = {
  // Intent to get a random Clinical Psychologist
  'getClinicalProfessional': async () => {
    const areaOfExpertise = 'Clinical Psychologist'; // Use 'clinical' to match database schema

    try {
      // Use tagged template literal for postgres.js
      const professionals = await sql`
        SELECT * FROM professional 
        WHERE area_of_expertise = ${areaOfExpertise}
      `;

      // postgres.js returns an array of rows directly
      if (professionals.length === 0) {
        return {
          fulfillmentText: 'Sorry, no Clinical Psychologists found at the moment. Please try again later.',
        };
      }

      const randomProfessional = professionals[Math.floor(Math.random() * professionals.length)];

      return {
        fulfillmentText: `I found a Clinical Psychologist: ${randomProfessional.full_name}. Would you like to know more about their services or availability?`,
        payload: {
          professional: randomProfessional,
        },
      };
    } catch (error) {
      console.error('Error fetching Clinical Psychologist:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while fetching a Clinical Psychologist. Please try again later.',
      };
    }
  },

  // Default fallback intent
  'Default Fallback Intent': async () => {
    return {
      fulfillmentText: "I didn't understand that. Could you please rephrase or ask about finding a professional?",
    };
  },
};

// Main Dialogflow webhook handler
export async function dialogflowWebhook(req, res) {
  try {
    console.log('Dialogflow Request Body:', JSON.stringify(req.body, null, 2));
    const { queryResult } = req.body;
    const intentName = queryResult.intent.displayName;

    // Find the appropriate intent handler
    const handler = intentHandlers[intentName] || intentHandlers['Default Fallback Intent'];

    // Execute the handler and send response
    const response = await handler(queryResult);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing Dialogflow request:', error);
    res.status(500).json({
      fulfillmentText: 'Something went wrong on the server. Please try again later.',
    });
  }
}
