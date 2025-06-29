import sql from '../config/db.js';
import { DIALOGFLOW_WELCOME_TEXT,DIALOGFLOW_CATALOGUE,DIALOGFLOW_NOT_KNOW,SEND_BOOKING_LINK,SUGGEST_PROFESSIONAL } from "./aisensy-template.js";

const AISENSY_URL = process.env.AISENSY_URL;
const AISENSY_API_KEY = process.env.AISENSY_API_KEY?.trim();
const BOOKING_BASE_URL = 'https://booking.sereneminds.life';
const DEFAULT_PROFESSIONAL_PHOTO = 'https://qmdfzzfphkfybewcyhej.supabase.co/storage/v1/object/public/uploads//Default_Photo.jpg';

// Shared utility functions
const getRandomProfessional = async (areaOfExpertise) => {
  try {
    const professionals = await sql`
      SELECT * FROM professional 
      WHERE area_of_expertise = ${areaOfExpertise}
    `;
    return professionals.length > 0 
      ? professionals[Math.floor(Math.random() * professionals.length)]
      : null;
  } catch (error) {
    console.error('Error fetching professionals:', error);
    return null;
  }
};

const sendWhatsAppMessage = async (userPhone, payload) => {
  if (!userPhone || typeof userPhone !== 'string') {
    console.error('Invalid phone number provided to sendWhatsAppMessage');
    return;
  }
  
  if (!AISENSY_API_KEY) {
    console.error('AISENSY_API_KEY is not configured');
    return;
  }
  
  try {
    const cleanPhone = userPhone.replace(/\D/g, '');
    const response = await fetch(AISENSY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: AISENSY_API_KEY,
        destination: cleanPhone.replace('+', ''),
        userName: "Serene MINDS",
        paramsFallbackValue: { FirstName: "there" },
        ...payload
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Aisensy API error:', errorText);
      throw new Error(`Aisensy API error: ${errorText}`);
    }
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

// Intent handler functions
const intentHandlers = {
  'welcomeIntent2': async (queryResult, userPhone, outputContexts = [], req) => {
    console.log('Default Welcome Intent triggered'); 
    console.log('User phone:', userPhone);
    
    try {
      if (!userPhone) {
        throw new Error('No phone number provided');
      }

      const phone = userPhone.replace(/\D/g, '');
      console.log('Normalized phone:', phone);
      
      // Check if user exists in database
      const existingUser = await sql`
        SELECT * FROM client 
        WHERE phone_no = ${phone}
        LIMIT 1
      `;

      if (existingUser.length > 0) {
        // Existing user flow
        try {
          await sendWhatsAppMessage(phone, {
            campaignName: DIALOGFLOW_WELCOME_TEXT,
            templateParams: [existingUser[0].name]
          });
        } catch (error) {
          console.error('WhatsApp send error:', error);
        }

        return {};
      } else {
        // New user flow
        return {
          fulfillmentText: 'Welcome to Serene MINDS. To get started, could you please tell me your name?',
          outputContexts: [{
            name: `${req.body.session}/contexts/collect_user_info`,
            lifespanCount: 5,
            parameters: {
              isExistingUser: false,
              step: 'collect_name'
            }
          }]
        };
      }
    } catch (error) {
      console.error('Error in welcome intent:', error);
      return {
        fulfillmentText: 'Welcome! Something went wrong. Please try again.'
      };
    }
  },

  'needToTalkSomeone': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      if (!userPhone) {
        console.error('No phone number available to send message');
        return {};
      }

      // Send WhatsApp message with the catalogue template
      await sendWhatsAppMessage(userPhone, {
        campaignName: DIALOGFLOW_CATALOGUE,
        templateParams: [] // No parameters needed for this template
      });

      // Return empty response since we're just sending a message
      return {};
    } catch (error) {
      console.error('Error in needToTalkSomeone intent:', error);
      return {}; // Still return empty to avoid showing error to user
    }
  },

  // Collect user information step 1 - Name
//   'getUserName': async (queryResult, userPhone, outputContexts = [], req) => {
//   try {
//     // Extract the name from the person parameter
//     const personArray = queryResult.parameters['person'];
//     console.log('getUserName parameters:', personArray);
    
//     if (!personArray || personArray.length === 0 || !personArray[0].name) {
//       throw new Error('No name provided');
//     }
    
//     const name = personArray[0].name;
    
//     return {
//       fulfillmentText: `Thanks ${name}. Could you share your age?`,
//       outputContexts: [{
//         name: `${req.body.session}/contexts/collect_user_info`,
//         lifespanCount: 5,
//         parameters: {
//           name: name,
//           step: 'collect_age'
//         }
//       }]
//     };
//   } catch (error) {
//     console.error('Error in getUserName:', error);
//     return {
//       fulfillmentText: 'Sorry, I didn\'t get your name. Could you please tell me your name again?'
//     };
//   }
// },

  'getUserName': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      // Extract the name from the person parameter
      const personArray = queryResult.parameters['person'];
      console.log('getUserName parameters:', personArray);
      
      if (!personArray || personArray.length === 0 || !personArray[0].name) {
        throw new Error('No name provided');
      }
      
      const name = personArray[0].name;
      const phone = userPhone.replace(/\D/g, '');

      // Save new user to database
      const [newUser] = await sql`
        INSERT INTO client (
          "name", 
          "phone_no",
          "created_at"
        ) VALUES (
          ${name},
          ${phone},
          NOW()
        ) RETURNING *
      `;

      // Send welcome message via WhatsApp
      await sendWhatsAppMessage(phone, {
        campaignName: DIALOGFLOW_WELCOME_TEXT,
        templateParams: [name]
      });

      // Send catalogue template
      // await sendWhatsAppMessage(userPhone, {
      //   campaignName: DIALOGFLOW_CATALOGUE,
      //   templateParams: []
      // });

      return {
        fulfillmentText: `Thanks ${name}! We've registered you with Serene MINDS. How can we assist you today?`
      };
    } catch (error) {
      console.error('Error in getUserName:', error);
      return {
        fulfillmentText: 'Sorry, I didn\'t get your name. Could you please tell me your name again?'
      };
    }
  },
  
  // Collect user information step 2 - Age
  'getUserAge': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      const age = queryResult.parameters['age'];
      if (!age) {
        throw new Error('No age provided');
      }

      const context = outputContexts.find(c => c.name.includes('collect_user_info'));
      
      return {
        fulfillmentText: `Got it. What city are you located in?`,
        outputContexts: [{
          name: `${req.body.session}/contexts/collect_user_info`,
          lifespanCount: 5,
          parameters: {
            ...context?.parameters,
            age: age,
            step: 'collect_location'
          }
        }]
      };
    } catch (error) {
      console.error('Error in getUserAge:', error);
      return {
        fulfillmentText: 'Sorry, I didn\'t get your age. Could you please tell me your age again?'
      };
    }
  },

  // Collect user information step 3 - Location (now creates user and sends catalogue)
  'getUserLocation': async (queryResult, userPhone, outputContexts = [], req) => {
  try {
    const location = queryResult.parameters['geo-city'];
    if (!location) {
      throw new Error('No location provided');
    }

    // Find the context
    let context = outputContexts.find(c => c.name.includes('collect_user_info'));
    if (!context && req.body.queryResult?.outputContexts) {
      context = req.body.queryResult.outputContexts.find(c => c.name.includes('collect_user_info'));
    }

    if (!context) {
      throw new Error('Missing user context');
    }

    // Extract parameters
    const name = context.parameters?.name || context.parameters?.person?.[0]?.name;
    const ageObj = context.parameters?.age;
    const age = ageObj?.amount || ageObj; // Handle age object or direct value

    // Validate inputs
    if (!name || !age || isNaN(Number(age))) {
      throw new Error(`Missing or invalid user information (name: ${name}, age: ${age})`);
    }

    const normalizedAge = Number(age);
    if (normalizedAge <= 0 || normalizedAge > 150) {
      throw new Error(`Invalid age value: ${normalizedAge}`);
    }

    // Normalize phone number
    const phone = userPhone.replace(/\D/g, '');

    // Log the query parameters for debugging
    console.log('Inserting user with params:', { name, age: normalizedAge, location, phone });

    // Save new user to database (use quoted column names to avoid reserved keyword issues)
    const newUser = await sql`
      INSERT INTO client (
        "name", 
        "age", 
        "city", 
        "phone_no",
        "created_at"
      ) VALUES (
        ${name},
        ${normalizedAge},
        ${location},
        ${phone},
        NOW()
      ) RETURNING *
    `;

    await sendWhatsAppMessage(userPhone, {
          campaignName: DIALOGFLOW_WELCOME_TEXT,
          templateParams: [name]
        });

    // Send catalogue template
    await sendWhatsAppMessage(userPhone, {
      campaignName: DIALOGFLOW_CATALOGUE,
      templateParams: []
    });

    return {};
  } catch (error) {
    console.error('Error in getUserLocation:', error);
    return {
      fulfillmentText: 'Sorry, I didn\'t get your location. Could you please tell me your city again?',
      outputContexts: outputContexts // Maintain existing contexts
    };
  }
},

  // Keep getUserProblem code but it won't be used in the flow
  'getUserProblem': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      const problem = queryResult.queryText;
      if (!problem) {
        throw new Error('No problem description provided');
      }

      const context = outputContexts.find(c => c.name.includes('collect_user_info'));
      if (!context) {
        throw new Error('Missing user context');
      }

      // Save new user to database
      const newUser = await sql`
        INSERT INTO client (
          name, 
          age, 
          city, 
          phone_no,
          created_at
        ) VALUES (
          ${context?.parameters?.name},
          ${context?.parameters?.age},
          ${context?.parameters?.location},
          ${userPhone.replace(/\D/g, '')},
          NOW()
        ) RETURNING *
      `;

      // Send welcome message via WhatsApp
      try {
        await sendWhatsAppMessage(userPhone, {
          campaignName: DIALOGFLOW_WELCOME_TEXT,
          templateParams: [newUser[0].name]
        });
      } catch (error) {
        console.error('WhatsApp send error:', error);
      }

      return {
        fulfillmentText: `Thank you for sharing. We'll match you with the right professional. How can we help?`,
        outputContexts: [{
          name: `${req.body.session}/contexts/known_user`,
          lifespanCount: 5,
          parameters: {
            user: newUser[0],
            isExistingUser: true
          }
        }]
      };
    } catch (error) {
      console.error('Error saving user:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while saving your information. Please try again.'
      };
    }
  },

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
      // Prepare languages string
      const languages = Array.isArray(professional.languages) && professional.languages.length > 0
        ? professional.languages.join(', ')
        : "English, Hindi";


      // Send WhatsApp message if phone available
      if (userPhone) {
        try {
          await sendWhatsAppMessage(userPhone, {
            campaignName: SUGGEST_PROFESSIONAL,
            templateParams: [
              professional.full_name,
              professional.area_of_expertise || areaOfExpertise,
              languages
            ],
            media: {
              url: photoUrl,
              filename: "professional_photo.jpg"
            }
          });
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
        }
      }

      return {
        fulfillmentText: `I found a Clinical Psychologist, ${professional.full_name}.\n\nSending you profile...`,
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
      // Prepare languages string
      const languages = Array.isArray(professional.languages) && professional.languages.length > 0
        ? professional.languages.join(', ')
        : "English, Hindi";


      // Send WhatsApp message if phone available
      if (userPhone) {
        try {
          await sendWhatsAppMessage(userPhone, {
            campaignName: SUGGEST_PROFESSIONAL,
            templateParams: [
              professional.full_name,
              professional.area_of_expertise || areaOfExpertise,
              languages
            ],
            media: {
              url: photoUrl,
              filename: "professional_photo.jpg"
            }
          });
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
        }
      }

      return {
        fulfillmentText: `I found a Counselling Psychologist, ${professional.full_name}.\n\nSending you profile...`,
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

  // Intent to get a random Wellness Associate
  'getScholarProfessional': async (queryResult, userPhone, outputContexts = [], req) => {
    const areaOfExpertise = 'Wellness Buddy';

    try {
      const professional = await getRandomProfessional(areaOfExpertise);
      
      if (!professional) {
        return {
          fulfillmentText: 'Sorry, no Wellness Buddy found at the moment. Please try again later.',
        };
      }

      const bookingLink = `${BOOKING_BASE_URL}/${professional.id}`;
      const photoUrl = professional.photo_url || DEFAULT_PROFESSIONAL_PHOTO;
      // Prepare languages string
      const languages = Array.isArray(professional.languages) && professional.languages.length > 0
        ? professional.languages.join(', ')
        : "English, Hindi";


      // Send WhatsApp message if phone available
      if (userPhone) {
        try {
          await sendWhatsAppMessage(userPhone, {
            campaignName: SUGGEST_PROFESSIONAL,
            templateParams: [
              professional.full_name,
              professional.area_of_expertise || areaOfExpertise,
              languages
            ],
            media: {
              url: photoUrl,
              filename: "professional_photo.jpg"
            }
          });
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
        }
      }

      return {
        fulfillmentText: `I found a Wellness Buddy, ${professional.full_name}.\n\nSending you profile...`,
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
      console.error('Error fetching Wellness Buddy:', error);
      return {
        fulfillmentText: 'Sorry, something went wrong while fetching a Wellness Buddy. Please try again later.',
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
      if (userPhone) {
        try {
          await sendWhatsAppMessage(userPhone, {
            campaignName: SEND_BOOKING_LINK,
            templateParams: [professional.full_name, bookingLink],
            media: { url: photoUrl, filename: "professional_photo.jpg" }
          });
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
        }
      }

      return {};
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

        let areaOfExpertise = 'Wellness Buddy'; // Default value
        
        if (professionalContext) {
            areaOfExpertise = professionalContext.parameters.area_of_expertise || 'Wellness Buddy';
        }

        // Call the appropriate handler based on expertise
        if (areaOfExpertise === 'Clinical Psychologist') {
            return intentHandlers['getClinicalProfessional'](queryResult, userPhone, outputContexts, req);
        } else if (areaOfExpertise === 'Counseling Psychologist') {
            return intentHandlers['getCounselingProfessional'](queryResult, userPhone, outputContexts, req);
        } else {
            // Default to Wellness Buddy if no specific expertise found
            return intentHandlers['getScholarProfessional'](queryResult, userPhone, outputContexts, req);
        }
    } catch (error) {
        console.error('Error suggesting another professional:', error);
        return {
            fulfillmentText: 'Sorry, something went wrong while finding another professional. Please try again later.',
        };
    }
  },

  // Add this to your intentHandlers object, along with the other handlers
  'dontKnowIntent': async (queryResult, userPhone) => {
    try {
      if (!userPhone) {
        console.error('No phone number available to send message');
        return {};
      }
  
      // Send WhatsApp message with the notknow template
      await sendWhatsAppMessage(userPhone, {
        campaignName: DIALOGFLOW_NOT_KNOW,
        templateParams: [] // No parameters needed for this template
      });
  
      // Return empty response since we're just sending a message
      return {};
    } catch (error) {
      console.error('Error in dontKnowIntent:', error);
      return {}; // Still return empty to avoid showing error to user
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
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    const intentName = queryResult.intent.displayName;

    console.log(`Triggered intent: ${intentName}`);
    console.log('Available contexts:', outputContexts.map(c => c.name));

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
