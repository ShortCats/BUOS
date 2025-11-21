import { GoogleGenAI } from "@google/genai";
import { PlannedRoute } from "../types";

// Helper to extract text from response
const extractText = (response: any): string => {
  if (response.text) return response.text;
  if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  return "No details available.";
};

export const getPlaceSuggestions = async (query: string, userLocation?: {lat: number, lng: number}): Promise<string[]> => {
  if (!process.env.API_KEY || query.length < 3) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    I am building a transit app for Franklin County, Massachusetts.
    The user is searching for a location. 
    Query: "${query}"
    
    Please provide a list of 3-5 specific, real-world places, addresses, or landmarks in Massachusetts that match this query. 
    Prioritize locations in Greenfield, Northampton, Amherst, and the Pioneer Valley.
    Return ONLY the names/addresses as a plain text list, one per line. No bullets, no numbering, no extra text.
  `;

  const toolConfig: any = {};
  if (userLocation) {
    toolConfig.retrievalConfig = {
      latLng: {
        latitude: userLocation.lat,
        longitude: userLocation.lng
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
      }
    });
    
    const text = extractText(response);
    // Split by newline and filter empty strings
    return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  } catch (e) {
    console.warn("Autocomplete failed", e);
    return [];
  }
};

export const planRouteWithGemini = async (
  origin: string, 
  destination: string, 
  userLocation?: { lat: number, lng: number }
): Promise<PlannedRoute> => {
  
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    I am in Franklin County, Massachusetts.
    I need to go from ${origin} to ${destination}.
    ${userLocation ? `My current coordinates are ${userLocation.lat}, ${userLocation.lng}.` : ''}
    
    Please provide a route plan using ONLY public transit (FRTA buses, Amtrak Vermonter/Valley Flyer) or walking.
    
    Focus on:
    1. Real-world bus route numbers (e.g., FRTA Route 31, 41).
    2. Amtrak schedules if relevant.
    3. Any potential delays or hazards typically found on this route (use Google Maps data).
    4. Estimated time.

    Format the output as a clear, step-by-step guide.
    Also, list any grounding links (Sources) you find explicitly.
  `;

  const toolConfig: any = {};
  
  if (userLocation) {
    toolConfig.retrievalConfig = {
      latLng: {
        latitude: userLocation.lat,
        longitude: userLocation.lng
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
      }
    });

    const text = extractText(response);
    
    // Extract Grounding Metadata URLs
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls: string[] = [];
    
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) urls.push(chunk.web.uri);
      if (chunk.maps?.uri) urls.push(chunk.maps.uri);
    });

    // Very basic parsing for the demo structure
    const stepsRaw = text.split('\n').filter(line => /^\d+\./.test(line.trim()));
    
    const steps = stepsRaw.map(s => ({
      instruction: s.replace(/^\d+\.\s*/, ''),
      type: s.toLowerCase().includes('walk') ? 'walk' : s.toLowerCase().includes('train') ? 'train' : 'bus'
    })) as any[];

    // Fallback if parsing fails
    const finalSteps = steps.length > 0 ? steps : [{ instruction: text, type: 'wait' }];

    return {
      summary: `Route to ${destination}`,
      steps: finalSteps,
      hazards: text.toLowerCase().includes('delay') ? ['Possible Delays detected'] : [],
      totalDuration: 'See details',
      groundingUrls: [...new Set(urls)]
    };

  } catch (error) {
    console.error("Gemini Route Error:", error);
    return {
      summary: "Error planning route",
      steps: [{ instruction: "Could not connect to route planner. Please try again.", type: 'wait' }],
      hazards: ["Connection Error"],
      totalDuration: "--",
      groundingUrls: []
    };
  }
};
