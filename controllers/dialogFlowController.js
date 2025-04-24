import sql from '../config/db.js';

const AISENSY_URL = process.env.AISENSY_URL;
const AISENSY_API_KEY = process.env.AISENSY_API_KEY?.trim();
const BOOKING_BASE_URL = 'https://booking.sereneminds.life';
const DEFAULT_PROFESSIONAL_PHOTO = 'https://png.pngtree.com/png-vector/20240309/ourmid/pngtree-psychologist-vector-concept-color-illustration-png-image_11904992.png';

// Shared utility functions
const getRandomProfessional = async (areaOfExpertise) => {
  const professionals = await sql`
    SELECT * FROM professional 
    WHERE area_of_expertise = ${areaOfExpertise}
  `;
  return professionals.length > 0 
    ? professionals[Math.floor(Math.random() * professionals.length)]
    : null;
};

const sendWhatsAppMessage = async (userPhone, payload) => {
  if (!userPhone || !AISENSY_API_KEY) return;
  
  try {
    const response = await fetch(AISENSY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: AISENSY_API_KEY,
        destination: userPhone.replace('+', ''),
        userName: "Serene MINDS",
        paramsFallbackValue: { FirstName: "there" },
        ...payload
      })
    });
    
    if (!response.ok) {
      console.error('Aisensy API error:', await response.text());
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
};

// Intent handler functions
const intentHandlers = {
  // Intent to get a random Clinical Psychologist
  'getClinicalProfessional': async (queryResult, userPhone, outputContexts = [], req) => {
    const areaOfExpertise = 'Clinical Psychologist';

    try {
      const professional = await getRandomProfessional(areaOfExpertise);
      
      if (!professional) {
        return {
          fulfillmentText: 'Sorry, no Clinical Psychologists found at the moment. Please try again later.',
        };
      }

      const bookingLink = `${BOOKING_BASE_URL}/${professional.id}`;
      const photoUrl = professional.photo_url || DEFAULT_PROFESSIONAL_PHOTO;

      // Send WhatsApp message if phone available
      await sendWhatsAppMessage(userPhone, {
        campaignName: "suggestprofessional",
        templateParams: [
          professional.full_name,
          professional.area_of_expertise || areaOfExpertise,
          "English, Hindi"
        ],
        media: {
          url: photoUrl,
          filename: "professional_photo.jpg"
        }
      });

      return {
        fulfillmentText: `I found a Clinical Psychologist: ${professional.full_name}. Would you like to know more about their services or availability?`,
        outputContexts: [{
          name: `${req.body.session}/contexts/selected_professional`,
          lifespanCount: 5,
          parameters: {
            professional,
            bookingLink,
            area_of_expertise: areaOfExpertise
          }
        }],
        payload: { professional }
      };
    } catch (error) {
      console.error('Error fetching Clinical Psychologist:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while fetching a Clinical Psychologist. Please try again later.',
      };
    }
  },

  // Intent to get a random Counseling Psychologist
  'getCounselingProfessional': async (queryResult, userPhone, outputContexts = [], req) => {
    const areaOfExpertise = 'Counseling Psychologist';

    try {
      const professional = await getRandomProfessional(areaOfExpertise);
      
      if (!professional) {
        return {
          fulfillmentText: 'Sorry, no Counseling Psychologists found at the moment. Please try again later.',
        };
      }

      const bookingLink = `${BOOKING_BASE_URL}/${professional.id}`;
      const photoUrl = professional.photo_url || DEFAULT_PROFESSIONAL_PHOTO;

      // Send WhatsApp message if phone available
      await sendWhatsAppMessage(userPhone, {
        campaignName: "suggestprofessional",
        templateParams: [
          professional.full_name,
          professional.area_of_expertise || areaOfExpertise,
          "English, Hindi"
        ],
        media: {
          url: photoUrl,
          filename: "professional_photo.jpg"
        }
      });

      return {
        fulfillmentText: `I found a Counseling Psychologist: ${professional.full_name}. Would you like to know more about their services or availability?`,
        outputContexts: [{
          name: `${req.body.session}/contexts/selected_professional`,
          lifespanCount: 5,
          parameters: {
            professional,
            bookingLink,
            area_of_expertise: areaOfExpertise
          }
        }],
        payload: { professional }
      };
    } catch (error) {
      console.error('Error fetching Counseling Psychologist:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while fetching a Counseling Psychologist. Please try again later.',
      };
    }
  },

  // Intent to provide booking link for psychologist
  'bookPsychologistSession': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      const professionalContext = 
        outputContexts.find(c => c.name.includes('selected_professional')) ||
        req.body.queryResult.outputContexts?.find(c => c.name.includes('selected_professional'));

      if (!professionalContext) {
        return {
          fulfillmentText: 'Please ask for a psychologist recommendation first.',
        };
      }

      const professional = professionalContext.parameters.professional;
      const bookingLink = professionalContext.parameters.bookingLink || 
                         `${BOOKING_BASE_URL}/${professional.id}`;
      const photoUrl = professional.photo_url || DEFAULT_PROFESSIONAL_PHOTO;

      // Send WhatsApp message if phone available
      await sendWhatsAppMessage(userPhone, {
        campaignName: "sendbookinglink",
        templateParams: [professional.full_name, bookingLink],
        media: { url: photoUrl, filename: "professional_photo.jpg" }
      });

      return {
        fulfillmentText: `Here's the booking link for Dr. ${professional.full_name}: ${bookingLink}`,
      };
    } catch (error) {
      console.error('Error:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong. Please try again later.',
      };
    }
  },

  // Intent to suggest another professional of same type
  'suggestAnotherProfessional': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      const professionalContext = 
        outputContexts.find(c => c.name.includes('selected_professional')) ||
        req.body.queryResult.outputContexts?.find(c => c.name.includes('selected_professional'));

      if (!professionalContext) {
        return {
          fulfillmentText: 'Please ask for a psychologist recommendation first.',
        };
      }

      const areaOfExpertise = professionalContext.parameters.area_of_expertise;
      
      // Call the appropriate handler based on previous expertise
      if (areaOfExpertise === 'Clinical Psychologist') {
        return intentHandlers['getClinicalProfessional'](queryResult, userPhone, outputContexts, req);
      } else if (areaOfExpertise === 'Counseling Psychologist') {
        return intentHandlers['getCounselingProfessional'](queryResult, userPhone, outputContexts, req);
      } else {
        return {
          fulfillmentText: 'Sorry, I cannot suggest another professional at this time.'
        };
      }
    } catch (error) {
      console.error('Error suggesting another professional:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while finding another professional. Please try again later.',
      };
    }
  },

  // Default fallback intent
  'Default Fallback Intent': async () => {
    return {
      fulfillmentText: "I didn't understand that. Could you please rephrase or ask about finding a professional?",
    };
  }
};

// Main Dialogflow webhook handler
export async function dialogflowWebhook(req, res) {
  try {
    const { queryResult, originalDetectIntentRequest, outputContexts = [] } = req.body;
    const intentName = queryResult.intent.displayName;

    // Normalize phone number
    let userPhone = originalDetectIntentRequest?.payload?.AiSensyMobileNumber;
    if (userPhone) {
      userPhone = userPhone.replace(/\D/g, '');
      if (userPhone.startsWith('0')) userPhone = '91' + userPhone.substring(1);
    }

    // Route to appropriate handler
    const handler = intentHandlers[intentName] || intentHandlers['Default Fallback Intent'];
    const response = await handler(queryResult, userPhone, outputContexts, req);

    res.status(200).json(response);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      fulfillmentText: 'Something went wrong. Please try again later.',
    });
  }
}
