import { GoogleGenAI, Type } from "@google/genai";
import { MedicineInfo, ImageAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getMedicineInfo(medicineName: string): Promise<MedicineInfo | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide detailed information about the medicine: ${medicineName}. 
      Include its benefits, how to use it, common side effects, and general safety advice. 
      Format the response as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            benefits: { type: Type.STRING, description: "Key benefits of the medicine" },
            usage: { type: Type.STRING, description: "How to use the medicine" },
            sideEffects: { type: Type.STRING, description: "Common side effects" },
            isSafe: { type: Type.BOOLEAN, description: "Whether it is generally considered safe for common use" },
            generalAdvice: { type: Type.STRING, description: "General safety advice and warnings" },
          },
          required: ["benefits", "usage", "sideEffects", "isSafe", "generalAdvice"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as MedicineInfo;
  } catch (error) {
    console.error("Error fetching medicine info:", error);
    return null;
  }
}

export async function analyzeMedicineImage(base64Image: string, mimeType: string): Promise<ImageAnalysisResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: "Analyze this image of a medicine or prescription. Identify the medicine(s) if possible, describe their benefits, and explain the basis of the prescription if it's a prescription. Format the response as JSON.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medicineName: { type: Type.STRING, description: "Name of the medicine identified" },
            benefits: { type: Type.STRING, description: "Benefits of the medicine" },
            prescriptionBasis: { type: Type.STRING, description: "The basis or reason for this prescription" },
            confidence: { type: Type.NUMBER, description: "Confidence in identification (0-1)" },
            isPrescription: { type: Type.BOOLEAN, description: "Whether the image is a prescription" },
          },
          required: ["medicineName", "benefits", "prescriptionBasis", "confidence", "isPrescription"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ImageAnalysisResult;
  } catch (error) {
    console.error("Error analyzing medicine image:", error);
    return null;
  }
}
