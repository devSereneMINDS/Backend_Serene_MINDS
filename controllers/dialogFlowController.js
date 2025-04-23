import sql from '../config/db.js';

const AISENSY_URL = process.env.AISENSY_URL;
const AISENSY_API_KEY = process.env.AISENSY_API_KEY?.trim();

// Intent handler functions
const intentHandlers = {
  // Intent to get a random Clinical Psychologist
  'getClinicalProfessional': async (queryResult, userPhone) => {
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

      if (userPhone) {
        try {
          // Prepare Aisensy payload
          const aisensyPayload = {
            apiKey: AISENSY_API_KEY,
            campaignName: "suggestprofessional",
            destination: userPhone.replace('+', ''), // Remove + if present
            userName: "Serene MINDS",
            templateParams: [
              randomProfessional.full_name,
              randomProfessional.area_of_expertise || "Clinical Psychology",
              "English, Hindi" // Languages
            ],
            media: randomProfessional.photo_url ? {
              url: randomProfessional.photo_url,
              filename: "professional_photo.jpg"
            } : undefined,
            paramsFallbackValue: {
              FirstName: "there"
            }
          };

          // Remove media field if no photo URL is available
          if (!randomProfessional.photo_url) {
            delete aisensyPayload.media;
          }

          // Send to Aisensy API
          const response = await fetch(AISENSY_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(aisensyPayload),
          });

          if (!response.ok) {
            console.error('Aisensy API error:', await response.text());
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp message:', whatsappError);
        }
      }

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

  // Intent to get a random Counseling Psychologist
  'getCounselingProfessional': async (queryResult, userPhone) => {
    const areaOfExpertise = 'Counseling Psychologist'; // Set to 'counselling' to match database schema

    try {
      // Use tagged template literal for postgres.js
      const professionals = await sql`
        SELECT * FROM professional 
        WHERE area_of_expertise = ${areaOfExpertise}
      `;

      // postgres.js returns an array of rows directly
      if (professionals.length === 0) {
        return {
          fulfillmentText: 'Sorry, no Counseling Psychologists found at the moment. Please try again later.',
        };
      }

      const randomProfessional = professionals[Math.floor(Math.random() * professionals.length)];

      // Send WhatsApp message if phone number is available
      if (userPhone) {
        try {
          // Prepare Aisensy payload
          const aisensyPayload = {
            apiKey: AISENSY_API_KEY,
            campaignName: "suggestprofessional",
            destination: userPhone.replace('+', ''), // Remove + if present
            userName: "Serene MINDS",
            templateParams: [
              randomProfessional.full_name,
              randomProfessional.area_of_expertise || "Clinical Psychology",
              "English, Hindi" // Languages
            ],
            media: randomProfessional.photo_url ? {
              url: randomProfessional.photo_url,
              filename: "professional_photo.jpg"
            } : undefined,
            paramsFallbackValue: {
              FirstName: "there"
            }
          };

          // Remove media field if no photo URL is available
          if (!randomProfessional.photo_url) {
            delete aisensyPayload.media;
          }

          // Send to Aisensy API
          const response = await fetch(AISENSY_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(aisensyPayload),
          });

          if (!response.ok) {
            console.error('Aisensy API error:', await response.text());
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp message:', whatsappError);
        }
      }

      return {
        fulfillmentText: `I found a Counseling Psychologist: ${randomProfessional.full_name}. Would you like to know more about their services or availability?`,
        payload: {
          professional: randomProfessional,
        },
      };
    } catch (error) {
      console.error('Error fetching Counseling Psychologist:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while fetching a Counseling Psychologist. Please try again later.',
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
    const { queryResult, originalDetectIntentRequest } = req.body;
    const intentName = queryResult.intent.displayName;

    // Extract WhatsApp number from Aisensy payload
    let userPhone = null;
    if (originalDetectIntentRequest?.payload?.AiSensyMobileNumber) {
      userPhone = originalDetectIntentRequest.payload.AiSensyMobileNumber;
      // Ensure number is in correct format (E.164 without +)
      userPhone = userPhone.replace(/\D/g, ''); // Remove all non-digit characters
      if (userPhone.startsWith('0')) {
        userPhone = '91' + userPhone.substring(1); // Handle local Indian numbers
      }
    }

    const handler = intentHandlers[intentName] || intentHandlers['Default Fallback Intent'];
    const response = await handler(queryResult, userPhone);

    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing Dialogflow request:', error);
    res.status(500).json({
      fulfillmentText: 'Something went wrong on the server. Please try again later.',
    });
  }
}
