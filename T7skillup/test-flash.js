import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    const response = await result.response;
    console.log("SUCCESS: " + response.text());
  } catch (err) {
    console.log("ERROR: " + err.message);
  }
}

test();
