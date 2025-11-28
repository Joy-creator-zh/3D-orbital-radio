import OpenAI from 'openai';
import { Station } from '../types';

// Using DeepSeek API via OpenAI SDK compatibility
const API_KEY = "sk-b743b9ce1d50467891417ee010f1e729";
const BASE_URL = "https://api.deepseek.com";

let openai: OpenAI | null = null;

if (API_KEY) {
  openai = new OpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true // Allowed for demo/client-side only apps
  });
}

export interface AIStationGuide {
  summary: string;
  locationInfo: string;
  mood: string;
  topics: string[];
}

export interface MoodAnalysisResult {
  keywords: string[];
  location?: string;
  genre?: string;
}

export const generateStationGuide = async (station: Station, language: 'en' | 'zh' = 'en'): Promise<AIStationGuide | null> => {
  if (!openai) {
    console.warn("DeepSeek API Key not found. AI features disabled.");
    return null;
  }

  try {
    const langPrompt = language === 'zh' 
      ? "Please respond in Chinese (Simplified)." 
      : "Please respond in English.";

    // Get local time for "live" context simulation
    const localHour = new Date().getHours();
    const timeOfDay = localHour > 6 && localHour < 18 ? "Daytime" : "Nighttime";

    const prompt = `
      You are an intelligent radio guide for "Orbital Radio". 
      Analyze this radio station and location to provide a brief, engaging summary.
      Context: It is currently ${timeOfDay} at the user's location.
      ${langPrompt}
      
      Station Name: ${station.name}
      Tags/Genre: ${station.tags}
      Country: ${station.country}
      State/Region: ${station.state}
      Language: ${station.language}
      
      Please provide a JSON response with the following fields (no markdown formatting, just raw JSON):
      {
        "summary": "A 1-sentence catchy description of what this station likely plays based on its name and tags. Include a guess about what might be playing NOW based on the time of day (e.g. 'Evening jazz', 'Morning news').",
        "locationInfo": "A 1-sentence cool fact about the location (${station.state || station.country}) that provides context.",
        "mood": "A 1-2 word mood description (e.g. 'Energetic', 'Chill', 'News-heavy').",
        "topics": ["Topic 1", "Topic 2", "Topic 3"] (3 short relevant keywords/hashtags)
      }
      
      Keep it concise and cyber-punk/tech style if possible.
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that responds in JSON format." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
    });

    const text = completion.choices[0].message.content || "{}";
    
    // Cleanup markdown code blocks if present (DeepSeek sometimes wraps in ```json)
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson) as AIStationGuide;
  } catch (error) {
    console.error("Error generating AI guide:", error);
    return null;
  }
};

export const analyzeMoodRequest = async (input: string, language: 'en' | 'zh' = 'en'): Promise<MoodAnalysisResult | null> => {
  if (!openai) return null;

  try {
    const prompt = `
      User Input: "${input}"
      
      Analyze the user's request for radio music/content. 
      Extract key search terms (genres, tags) and any specific location mentioned.
      Translate the intent into standard radio tags (e.g. "coding" -> "lofi, ambient, electronic").
      
      Return JSON only:
      {
        "keywords": ["tag1", "tag2", "tag3"],
        "location": "Country or City name if mentioned, else null",
        "genre": "primary genre if applicable"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a JSON generator. No markdown." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
    });

    const text = completion.choices[0].message.content || "{}";
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson) as MoodAnalysisResult;

  } catch (error) {
    console.error("Mood analysis failed:", error);
    return null;
  }
}
