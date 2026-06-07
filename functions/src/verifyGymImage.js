'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.verifyGymImage = onCall({ region: 'asia-south2', timeoutSeconds: 30 }, async (request) => {
  if (!GEMINI_API_KEY) {
    throw new HttpsError('internal', 'Server configuration error: Gemini API Key missing');
  }

  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

  const base64DataUrl = request.data?.image;
  if (!base64DataUrl) {
    throw new HttpsError('invalid-argument', 'Image data is required');
  }

  try {
    // Parse mimeType and raw base64 data
    const matches = base64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!matches) {
      throw new HttpsError('invalid-argument', 'Invalid image data format. Must be base64 Data URL.');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        temperature: 0.1,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      "Analyze this image. Does it depict a gym, workout area, fitness center, exercise equipment, weights, dumbbells, or people training? Answer with only 'yes' or 'no' in lowercase."
    ]);

    const responseText = result.response.text().trim().toLowerCase();
    const verified = responseText.includes('yes');

    return { success: true, verified };

  } catch (error) {
    console.error('[verifyGymImage] Error:', error.message);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to analyze the image. Please make sure the photo is clear.');
  }
});
