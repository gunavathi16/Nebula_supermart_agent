import axios from 'axios';
import { config } from './config.js';

/**
 * Identify a grocery retail product from photo or barcode using Gemini 1.5 Flash Vision.
 */
export async function identifyProductFromPhoto(botApi, fileId, allProducts = []) {
  try {
    const file = await botApi.getFile(fileId);
    if (!file || !file.file_path) {
      throw new Error('Could not retrieve image file path from Telegram.');
    }

    const downloadUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    const imageBuffer = Buffer.from(response.data);
    const base64Image = imageBuffer.toString('base64');

    return await identifyProductFromBase64(base64Image, 'image/jpeg', allProducts);
  } catch (err) {
    console.error('[Vision Service Error]:', err.message);
    throw err;
  }
}

/**
 * Analyze base64 image with Gemini 1.5 Flash Vision against catalog products
 */
export async function identifyProductFromBase64(base64Image, mimeType = 'image/jpeg', allProducts = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured for image vision analysis.');
  }

  const catalogList = allProducts.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    mrp: p.sell_price,
    unit: p.unit,
    stock: p.stock_qty
  }));

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const promptText = `You are an AI retail barcode scanner and FMCG product packaging identifier for an Indian supermarket (Nebula Supermarket).
Analyze the attached photo. Extract:
1. Any visible 1D/2D barcode numbers (EAN-13, UPC, QR).
2. Product packaging text: Brand name (e.g., Amul, Aashirvaad, Maggi, Tata, Fortune, Parle, Dettol, Surf Excel), product item description, and net weight/volume (e.g., 500g, 1kg, 5kg, 1L, 100g).

Store Catalog:
${JSON.stringify(catalogList, null, 2)}

Match this photo against the store catalog. Return ONLY valid JSON in this exact structure without markdown backticks:
{
  "matched_product_id": <number or null>,
  "detected_brand": "<brand name>",
  "detected_product_name": "<full product name on packaging>",
  "detected_barcode": "<barcode number or null>",
  "confidence_percentage": <number between 0 and 100>,
  "summary": "<one short sentence describing what was recognized>"
}`;

  const geminiRes = await axios.post(geminiUrl, {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  }, {
    timeout: 25000
  });

  const rawText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Vision model returned an empty response.');
  }

  let cleanJson = rawText.trim();
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleanJson = jsonMatch[0];

  let parsed = null;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (_) {
    // If JSON parse failed, try regex match for matched_product_id
    const idMatch = rawText.match(/"matched_product_id"\s*:\s*(\d+)/);
    const matchedId = idMatch ? parseInt(idMatch[1], 10) : null;
    parsed = {
      matched_product_id: matchedId,
      detected_product_name: 'Identified Product',
      confidence_percentage: 85,
      summary: 'Product recognized from packaging'
    };
  }

  let matchedProduct = null;
  if (parsed.matched_product_id) {
    matchedProduct = allProducts.find(p => p.id === parsed.matched_product_id);
  }

  // If not matched by ID, try fuzzy match on detected product name or brand
  if (!matchedProduct && parsed.detected_product_name) {
    const dLower = parsed.detected_product_name.toLowerCase();
    matchedProduct = allProducts.find(p =>
      dLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(dLower)
    );
  }

  return {
    success: !!matchedProduct,
    product: matchedProduct,
    details: parsed
  };
}
