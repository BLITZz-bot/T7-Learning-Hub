const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";
const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log("MATCHES: " + data.models.filter(m => m.name.includes("1.5")).map(m => m.name).join(", "));
    }
    
    // Also check for gemini-pro explicitly
    if (data.models && data.models.some(m => m.name.includes("gemini-pro"))) {
        console.log("PRO FOUND");
    }
  } catch (err) {
    console.error(err);
  }
}

checkModels();
