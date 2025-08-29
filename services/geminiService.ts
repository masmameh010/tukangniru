/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";
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
    return `Buat gambar FOTO yang SANGAT REALISTIS. DILARANG membuat ilustrasi atau kartun.
- Ambil orang dari gambar pertama.
- Terapkan gaya atau pakaian dari gambar kedua.
- Tempatkan mereka di latar ini: "${scene}".
- SANGAT PENTING: Wajah orang dari gambar pertama TIDAK BOLEH BERUBAH. Harus sama persis. Pastikan pencahayaan pada orang tersebut cocok dengan pencahayaan di latar.`;
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
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
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
    
    const prompt = `Anda adalah seorang Ahli Photoshop Digital yang sangat terampil, bertugas untuk melakukan compositing gambar fotorealistik untuk proyek IMAJINASILOKAL. Tugas Anda adalah menggabungkan tiga elemen (Model, Referensi, Latar) menjadi satu gambar tunggal yang SEPENUHNYA REALISTIS dan tidak dapat dibedakan dari foto asli.

**ATURAN GAYA (TIDAK BISA DITAWAR):**
1.  **IDENTITAS WAJAH 100%**: Wajah subjek di gambar hasil HARUS SAMA PERSIS dengan wajah di Gambar Sumber 1 (Model). Duplikasi setiap fitur, warna kulit, dan ekspresi. JANGAN mengubah wajah sama sekali. Ini adalah prioritas tertinggi.
2.  **FOTOREALISME MUTLAK**: Output HARUS berupa FOTO. DILARANG KERAS menghasilkan ilustrasi, lukisan, kartun, anime, atau render 3D. Bahkan jika latarnya imajinatif, render pemandangannya seolah-olah itu adalah lokasi fisik nyata yang difoto dengan kamera profesional.

---
**PROSES KERJA ANDA (LANGKAH-DEMI-LANGKAH):**

**Gambar Sumber 1 (MODEL):** Ini adalah subjek utama.
- Ekstrak subjek, dengan fokus utama pada wajah dan identitas mereka.

**Gambar Sumber 2 (REFERENSI):** Ini adalah sumber inspirasi.
- Analisis elemen kunci dari gambar ini. Apakah itu pakaian? Objek? Gaya pencahayaan? Palet warna?

**Latar yang Diminta:** "${scene}"

**Instruksi Komposisi:**
1.  **Mulai dengan Subjek:** Ambil subjek dari Gambar 1.
2.  **Terapkan Referensi:** Secara cerdas, kenakan pakaian dari Gambar 2 pada subjek, atau tempatkan objek dari Gambar 2 bersama mereka, atau terapkan gaya pencahayaan dari Gambar 2 pada seluruh komposisi. Pastikan pakaian pas secara alami, dengan lipatan dan bayangan yang realistis.
3.  **Tempatkan di Latar:** Letakkan subjek yang sudah dimodifikasi ke dalam latar "${scene}".
4.  **INTEGRASI SEMPURNA (Paling Penting):**
    - **Pencahayaan & Bayangan:** Pencahayaan pada subjek HARUS konsisten dengan sumber cahaya di latar. Jika latar belakang cerah, bayangannya harus tajam. Jika latarnya adalah ruangan remang-remang, cahayanya harus lembut dan menyebar. Ini adalah kunci untuk menghindari efek "tempelan".
    - **Skala & Perspektif:** Pastikan ukuran subjek masuk akal untuk latar tersebut.
    - **Fokus & Kedalaman Bidang:** Terapkan efek depth-of-field yang halus jika sesuai, agar subjek menonjol secara alami dari latar.
    - **Tekstur:** Pastikan semua tekstur (kain, kulit, permukaan di latar) terlihat nyata dan tajam.

Hasilkan satu gambar akhir yang koheren, berkualitas tinggi, dan sepenuhnya fotorealistik.`;

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