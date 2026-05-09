import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.listModels();
    console.log("Available Models:");
    result.models.forEach((m) => {
      console.log(`- ${m.name} (Version: ${m.version}, Methods: ${m.supportedGenerationMethods.join(", ")})`);
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
