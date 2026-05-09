import fetch from 'node-fetch'; // if available, else we'll use node 18 fetch
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function testApi() {
  const modelName = 'gemini-1.5-flash';
  console.log('Testing with model:', modelName);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { 
          role: 'user', 
          parts: [{ text: "Hello" }] 
        }
      ],
      generationConfig: { temperature: 0.2 }
    })
  });

  const data = await response.json();
  console.log("Status:", response.status);
  console.log(JSON.stringify(data, null, 2));
}

testApi();
