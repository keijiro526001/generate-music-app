const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/generate-melody", async (req, res) => {

  const { key, bpm } = req.body;

  const prompt = `melody piano key ${key} tempo ${bpm} bpm`;

  const response = await fetch("https://api.fal.ai/cassetteai/music-generator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "YOUR_API_KEY"
    },
    body: JSON.stringify({
      prompt: prompt,
      duration: 10
    })
  });

  const data = await response.json();

  res.json(data);

});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});