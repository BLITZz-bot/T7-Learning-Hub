const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log("AUTHORIZED_MODELS:");
      data.models.forEach(m => {
          console.log(`- ${m.name}`);
      });
    } else {
      console.log("ERROR: " + JSON.stringify(data));
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

checkModels();
