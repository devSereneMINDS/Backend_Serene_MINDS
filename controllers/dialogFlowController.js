import sql from '../config/db.js';

const AISENSY_URL = process.env.AISENSY_URL;
const AISENSY_API_KEY = process.env.AISENSY_API_KEY?.trim();
const BOOKING_BASE_URL = 'https://booking.sereneminds.life';

// Intent handler functions
const intentHandlers = {
  // Intent to get a random Clinical Psychologist
  'getClinicalProfessional': async (queryResult, userPhone, outputContexts = [], req) => {
    const areaOfExpertise = 'Clinical Psychologist';

    try {
      const professionals = await sql`
        SELECT * FROM professional 
        WHERE area_of_expertise = ${areaOfExpertise}
      `;

      if (professionals.length === 0) {
        return {
          fulfillmentText: 'Sorry, no Clinical Psychologists found at the moment. Please try again later.',
        };
      }

      const randomProfessional = professionals[Math.floor(Math.random() * professionals.length)];
      const bookingLink = `${BOOKING_BASE_URL}/${randomProfessional.id}`;

      if (userPhone) {
        try {
          const aisensyPayload = {
            apiKey: AISENSY_API_KEY,
            campaignName: "suggestprofessional",
            destination: userPhone.replace('+', ''),
            userName: "Serene MINDS",
            templateParams: [
              randomProfessional.full_name,
              randomProfessional.area_of_expertise || "Clinical Psychology",
              "English, Hindi"
            ],
            media: randomProfessional.photo_url ? {
              url: randomProfessional.photo_url,
              filename: "professional_photo.jpg"
            } : undefined,
            paramsFallbackValue: {
              FirstName: "there"
            }
          };

          if (!randomProfessional.photo_url) {
            delete aisensyPayload.media;
          }

          const response = await fetch(AISENSY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        outputContexts: [{
          name: `${req.body.session}/contexts/selected_professional`,
          lifespanCount: 5,
          parameters: {
            professional: randomProfessional,
            bookingLink: bookingLink,
            area_of_expertise: areaOfExpertise // Store expertise in context
          }
        }],
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
  'getCounselingProfessional': async (queryResult, userPhone, outputContexts = [], req) => {
    const areaOfExpertise = 'Counseling Psychologist';

    try {
      const professionals = await sql`
        SELECT * FROM professional 
        WHERE area_of_expertise = ${areaOfExpertise}
      `;

      if (professionals.length === 0) {
        return {
          fulfillmentText: 'Sorry, no Counseling Psychologists found at the moment. Please try again later.',
        };
      }

      const randomProfessional = professionals[Math.floor(Math.random() * professionals.length)];
      const bookingLink = `${BOOKING_BASE_URL}/${randomProfessional.id}`;

      if (userPhone) {
        try {
          const aisensyPayload = {
            apiKey: AISENSY_API_KEY,
            campaignName: "suggestprofessional",
            destination: userPhone.replace('+', ''),
            userName: "Serene MINDS",
            templateParams: [
              randomProfessional.full_name,
              randomProfessional.area_of_expertise || "Counseling Psychology",
              "English, Hindi"
            ],
            media: randomProfessional.photo_url ? {
              url: randomProfessional.photo_url,
              filename: "professional_photo.jpg"
            } : undefined,
            paramsFallbackValue: {
              FirstName: "there"
            }
          };

          if (!randomProfessional.photo_url) {
            delete aisensyPayload.media;
          }

          const response = await fetch(AISENSY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        outputContexts: [{
          name: `${req.body.session}/contexts/selected_professional`,
          lifespanCount: 5,
          parameters: {
            professional: randomProfessional,
            bookingLink: bookingLink,
            area_of_expertise: areaOfExpertise // Store expertise in context
          }
        }],
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

      if (userPhone) {
        try {
          await fetch(AISENSY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: AISENSY_API_KEY,
              campaignName: "sendbookinglink",
              destination: userPhone.replace('+', ''),
              userName: "Serene MINDS",
              templateParams: [
                professional.full_name,
                bookingLink
              ],
              media: professional.photo_url ? {
                url: professional.photo_url,
                filename: "professional_photo.jpg"
              } : undefined
            })
          });
        } catch (error) {
          console.error('WhatsApp send error:', error);
        }
      }

      return {
        fulfillmentText: `Here's the booking link for Dr. ${professional.full_name}`,
        fulfillmentMessages: [
          {
            text: {
              text: [
                `Book your session with Dr. ${professional.full_name}:`
              ]
            }
          },
          {
            payload: {
              richContent: [
                [
                  {
                    type: "button",
                    text: "Book Now",
                    link: bookingLink
                  }
                ]
              ]
            }
          }
        ]
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
    console.log('Dialogflow Request Body:', JSON.stringify(req.body, null, 2));
    const { queryResult, originalDetectIntentRequest, outputContexts = [] } = req.body;
    const intentName = queryResult.intent.displayName;

    let userPhone = originalDetectIntentRequest?.payload?.AiSensyMobileNumber;
    if (userPhone) {
      userPhone = userPhone.replace(/\D/g, '');
      if (userPhone.startsWith('0')) userPhone = '91' + userPhone.substring(1);
    }

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
