/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


// --- Helper Functions ---

/**
 * Creates a fallback prompt to use when the primary one is blocked.
 * @param scene The scene string (e.g., "at a sunny park").
 * @returns The fallback prompt string.
 */
function getFallbackPrompt(scene: string): string {
    return `FOTO REALISTIS: Orang dari Gambar 1, memakai pakaian dari Gambar 2, di lokasi "${scene}". Jaga wajah tetap sama. Buat terlihat nyata.`;
}

/**
 * Parses an image data URL into its MIME type and base64 data.
 * @param imageDataUrl The data URL string.
 * @returns An object containing the mimeType and base64Data.
 */
function parseImageDataUrl(imageDataUrl: string): { mimeType: string; base64Data: string } {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Format URL data gambar tidak valid. Diharapkan 'data:image/...;base64,...'");
    }
    const [, mimeType, base64Data] = match;
    return { mimeType, base64Data };
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
    // The API can return multiple parts, find the first one that is an image.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const { mimeType, data } = part.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const textResponse = response.text;
    console.error("API tidak mengembalikan gambar. Respons:", textResponse);
    throw new Error(`Model AI merespons dengan teks, bukan gambar: "${textResponse || 'Tidak ada respons teks.'}"`);
}


/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imageParts The array of image parts for the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imageParts: object[], textPart: object): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [...imageParts, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
        } catch (error) {
            console.error(`Error memanggil Gemini API (Percobaan ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Kesalahan internal terdeteksi. Mencoba lagi dalam ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    // This should be unreachable due to the loop and throw logic above.
    throw new Error("Panggilan Gemini API gagal setelah semua percobaan ulang.");
}


/**
 * Generates a scene-styled image by combining a person, clothing, and a prompt.
 * It includes a fallback mechanism for prompts that might be blocked.
 * @param personImageDataUrl A data URL string of the person's image.
 * @param clothingImageDataUrl A data URL string of the clothing image.
 * @param scene The descriptive prompt for the scene.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateSceneImage(personImageDataUrl: string, clothingImageDataUrl: string, scene: string): Promise<string> {
    const { mimeType: personMimeType, base64Data: personBase64Data } = parseImageDataUrl(personImageDataUrl);
    const { mimeType: clothingMimeType, base64Data: clothingBase64Data } = parseImageDataUrl(clothingImageDataUrl);

    const personImagePart = {
        inlineData: { mimeType: personMimeType, data: personBase64Data },
    };
    const clothingImagePart = {
        inlineData: { mimeType: clothingMimeType, data: clothingBase64Data },
    };
    const imageParts = [personImagePart, clothingImagePart];
    
    const prompt = `FOTO REALISTIS: Gabungkan Gambar 1 (orang) dan Gambar 2 (pakaian) ke dalam latar "${scene}".
Prioritas Utama:
1.  **Wajah & Identitas**: Salin wajah dari Gambar 1 secara PERSIS. Jangan diubah.
2.  **Pakaian**: Terapkan pakaian dari Gambar 2 ke orang tersebut. Perhatikan detail seperti warna, pola, dan potongan.
3.  **Integrasi**: Pastikan pencahayaan dan bayangan pada orang dan pakaian menyatu dengan latar belakang secara alami.
Hasil akhir harus berupa satu gambar saja, tanpa teks.`;

    // --- First attempt with the original prompt ---
    try {
        console.log("Mencoba pembuatan dengan prompt asli...");
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry(imageParts, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const isNoImageError = errorMessage.includes("Model AI merespons dengan teks, bukan gambar");

        if (isNoImageError) {
            console.warn("Prompt asli sepertinya diblokir. Mencoba prompt cadangan.");
           
            // --- Second attempt with the fallback prompt ---
            try {
                const fallbackPrompt = getFallbackPrompt(scene);
                console.log(`Mencoba pembuatan dengan prompt cadangan untuk ${scene}...`);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry(imageParts, fallbackTextPart);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Prompt cadangan juga gagal.", fallbackError);
                const finalErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                throw new Error(`Model AI gagal dengan prompt asli dan cadangan. Kesalahan terakhir: ${finalErrorMessage}`);
            }
        } else {
            // This is for other errors, like a final internal server error after retries.
            console.error("Terjadi kesalahan yang tidak dapat dipulihkan selama pembuatan gambar.", error);
            throw new Error(`Model AI gagal membuat gambar. Detail: ${errorMessage}`);
        }
    }
}