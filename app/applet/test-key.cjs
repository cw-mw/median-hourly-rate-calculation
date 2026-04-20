require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log("Using key:", process.env.GEMINI_API_KEY.substring(0,5) + "...");
ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Are you working?'
}).then(res => console.log(res.text))
  .catch(err => console.error("Error:", err.message));
