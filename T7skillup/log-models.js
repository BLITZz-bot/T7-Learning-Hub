import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.listModels();
    const modelLinks = result.models.map(m => m.name).join("\n");
    fs.writeFileSync("available_models.txt", modelLinks);
    console.log("Wrote available models to available_models.txt");
  } catch (error) {
    fs.writeFileSync("available_models.txt", "ERROR: " + error.message);
    console.error("Error listing models:", error);
  }
}

listModels();
