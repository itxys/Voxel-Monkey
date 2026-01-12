
import { GoogleGenAI, Type } from "@google/genai";

// Always use the named parameter and environment variable directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVoxelPrompt = async (prompt: string, gridSize: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a list of voxel coordinates and colors based on this prompt: "${prompt}". 
      Return the data as a JSON array of objects with {x, y, z, color}. 
      The workspace is a ${gridSize}x${gridSize}x${gridSize} grid. Ensure coordinates x, y, z are integers within the range [0, ${gridSize - 1}].
      Limit the output to 50 voxels.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.INTEGER },
              y: { type: Type.INTEGER },
              z: { type: Type.INTEGER },
              color: { type: Type.STRING }
            },
            required: ["x", "y", "z", "color"]
          }
        }
      }
    });
    
    // Access the text property directly on the response object
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
};
