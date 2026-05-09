const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";
const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("V1 Models Response:");
    if (data.models) {
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }

    const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const responseBeta = await fetch(urlBeta);
    const dataBeta = await responseBeta.json();
    console.log("\nV1beta Models Response:");
    if (dataBeta.models) {
      dataBeta.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log(JSON.stringify(dataBeta, null, 2));
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

checkModels();
