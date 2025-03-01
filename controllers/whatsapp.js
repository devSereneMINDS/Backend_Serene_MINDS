export async function sendWhatsAppMessage(req, res) {
  const { campaignName, destination, userName, templateParams } = req.body;

  try {
    const AISensyUrl = process.env.AISENSY_URL;
    const apiKey = process.env.AISENSY_API_KEY?.trim();

    const data = {
      apiKey,
      campaignName,
      destination,
      userName,
      templateParams,
    };

    const apiResponse = await fetch(AISensyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseBody = await apiResponse.json();

    if (apiResponse.status === 200) {
      return res.status(200).json({
        success: true,
        message: "WhatsApp message sent successfully.",
        responseBody,
      });
    } else {
      return res.status(apiResponse.status).json({
        success: false,
        message: `Failed to send WhatsApp message: ${apiResponse.status} ${apiResponse.statusText}`,
        error: responseBody,
      });
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


export async function sendWhatsAppMessage2({ campaignName, destination, userName, templateParams }) {
  try {
    const AISensyUrl = process.env.AISENSY_URL;
    const apiKey = process.env.AISENSY_API_KEY?.trim();

    if (!campaignName || !destination || !userName || !templateParams) {
      throw new Error("Missing required parameters for WhatsApp message.");
    }

    const data = {
      apiKey,
      campaignName,
      destination,
      userName,
      templateParams,
    };

    const apiResponse = await fetch(AISensyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseBody = await apiResponse.json();

    if (apiResponse.ok) {
      return { success: true, message: "WhatsApp message sent successfully.", responseBody };
    } else {
      throw new Error(`Failed to send WhatsApp message: ${apiResponse.statusText}`);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, message: "Internal server error", error };
  }
}
