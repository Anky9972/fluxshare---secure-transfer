import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
// Ideally, we check if key exists, but for this demo we assume environment is set up.
// If not, we will fallback to manual generation or mocked data if the call fails.

const ai = new GoogleGenAI({ apiKey });

export const generateSmartCredentials = async (): Promise<{ username: string; password: string; region: string } | null> => {
  try {
    const modelId = 'gemini-2.5-flash'; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "Generate a single fun, memorable SFTP username (e.g., combining an adjective and an animal), a strong secure password, and a fictional cloud region name.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            username: { type: Type.STRING },
            password: { type: Type.STRING },
            region: { type: Type.STRING }
          },
          required: ["username", "password", "region"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini generation failed", error);
    // Fallback for demo robustness
    return {
      username: `fallback-user-${Math.floor(Math.random() * 1000)}`,
      password: Math.random().toString(36).slice(-8) + "!!",
      region: "us-east-backup"
    };
  }
};

export const generateQuickReplies = async (context: string): Promise<string[]> => {
  try {
    const modelId = 'gemini-2.5-flash';
    const prompt = `You are a cyberpunk netrunner in a high-tech file transfer interface. 
    The other user just said: "${context || 'Connection established'}".
    Generate 3 short, cool, terse, and professional 'hacker-style' quick response options for me to reply with.
    Keep them under 10 words. 
    Return strictly JSON.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return ["Ack.", "Link stable.", "Standby."];
    
    const parsed = JSON.parse(jsonText);
    return parsed.replies || ["Ack.", "Link stable.", "Standby."];
  } catch (error) {
    console.error("Gemini chat generation failed", error);
    return ["Copy that.", "Signal clear.", "Receiving."];
  }
};
