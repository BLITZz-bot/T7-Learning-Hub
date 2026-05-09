const apiKey = "AIzaSyDdAMoqDrYgB49UEelY3pjpxsgINUbc0gI";
const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log("V1 MODELS: " + data.models.map(m => m.name.replace("models/", "")).join(", "));
    } else {
      console.log("V1 ERROR: " + JSON.stringify(data));
    }

    const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const responseBeta = await fetch(urlBeta);
    const dataBeta = await responseBeta.json();
    if (dataBeta.models) {
      console.log("BETAMODELS: " + dataBeta.models.map(m => m.name.replace("models/", "")).join(", "));
    } else {
      console.log("BETA ERROR: " + JSON.stringify(dataBeta));
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

checkModels();
