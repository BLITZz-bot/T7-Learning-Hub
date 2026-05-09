import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.listModels();
    
    // Log the structure of the result to a file
    fs.writeFileSync("models_structure.txt", JSON.stringify(result, null, 2));
    
    // If result has models array
    if (result.models) {
       const names = result.models.map(m => m.name).join("\n");
       fs.appendFileSync("models_structure.txt", "\n\nNAMES:\n" + names);
    }
    
    console.log("Wrote model info to models_structure.txt");
  } catch (error) {
    fs.writeFileSync("models_structure.txt", "ERROR: " + error.message + "\n" + error.stack);
    console.error("Error listing models:", error);
  }
}

listModels();
