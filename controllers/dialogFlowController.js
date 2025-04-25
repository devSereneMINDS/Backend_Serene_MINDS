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
  'Default Welcome Intent': async (queryResult, userPhone, outputContexts = [], req) => {
    try {
      // Get user phone number from request
      const phone = userPhone.replace(/\D/g, '');
      
      // Check if user exists in database
      const existingUser = await sql`
        SELECT * FROM client 
        WHERE phone_no = ${phone}
        LIMIT 1
      `;

      if (existingUser.length > 0) {
        // Existing user flow
        try {
          await sendWhatsAppMessage({
            campaignName: "welcometext",
            destination: phone,
            templateParams: [
              existingUser[0].name,
            ]
          });
        } catch (error) {
          console.error('WhatsApp send error:', error);
        }

        return {
          fulfillmentText: `Welcome back, ${existingUser[0].name}! How can we help you today?`,
          outputContexts: [{
            name: `${req.body.session}/contexts/known_user`,
            lifespanCount: 5,
            parameters: {
              user: existingUser[0],
              isExistingUser: true
            }
          }]
        };
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

  // Collect user information step 1 - Name
  'getUserName': async (queryResult, userPhone, outputContexts = [], req) => {
    const name = queryResult.parameters['name'];
    
    return {
      fulfillmentText: `Thanks ${name}. Could you share your age?`,
      outputContexts: [{
        name: `${req.body.session}/contexts/collect_user_info`,
        lifespanCount: 5,
        parameters: {
          name: name,
          step: 'collect_age'
        }
      }]
    };
  },

  // Collect user information step 2 - Age
  'getUserAge': async (queryResult, userPhone, outputContexts = [], req) => {
    const age = queryResult.parameters['age'];
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
  },

  // Collect user information step 3 - Location
  'getUserLocation': async (queryResult, userPhone, outputContexts = [], req) => {
    const location = queryResult.parameters['location'];
    const context = outputContexts.find(c => c.name.includes('collect_user_info'));
    
    return {
      fulfillmentText: `Thank you. Could you briefly describe what you're struggling with?`,
      outputContexts: [{
        name: `${req.body.session}/contexts/collect_user_info`,
        lifespanCount: 5,
        parameters: {
          ...context?.parameters,
          location: location,
          step: 'collect_problem'
        }
      }]
    };
  },

  // Collect user information step 4 - Problem
  'getUserProblem': async (queryResult, userPhone, outputContexts = [], req) => {
    const problem = queryResult.queryText;
    const context = outputContexts.find(c => c.name.includes('collect_user_info'));
    
    try {
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
          ${problem},
          ${userPhone.replace(/\D/g, '')},
          NOW()
        ) RETURNING *
      `;

      // Send welcome message via WhatsApp
      try {
        await sendWhatsAppMessage({
          campaignName: "welcometext",
          destination: userPhone.replace(/\D/g, ''),
          templateParams: [
            newUser[0].name,
          ]
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
  const areaOfExpertise = 'Wellness Associate';

  try {
    const professional = await getRandomProfessional(areaOfExpertise);
    
    if (!professional) {
      return {
        fulfillmentText: 'Sorry, no Wellness Associates found at the moment. Please try again later.',
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
      fulfillmentText: `I found a Wellness Associate, ${professional.full_name}.\n\nSending you profile...`,
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
    console.error('Error fetching Wellness Associate:', error);
    return {
      fulfillmentText: 'Sorry, something went wrong while fetching a Wellness Associate. Please try again later.',
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
        fulfillmentText: 'Please ask for a professional recommendation first.',
      };
    }

    const areaOfExpertise = professionalContext.parameters.area_of_expertise;
    
    // Call the appropriate handler based on previous expertise
    if (areaOfExpertise === 'Clinical Psychologist') {
      return intentHandlers['getClinicalProfessional'](queryResult, userPhone, outputContexts, req);
    } else if (areaOfExpertise === 'Counseling Psychologist') {
      return intentHandlers['getCounselingProfessional'](queryResult, userPhone, outputContexts, req);
    } else if (areaOfExpertise === 'Wellness Associate') {
      return intentHandlers['getScholarProfessional'](queryResult, userPhone, outputContexts, req);
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
