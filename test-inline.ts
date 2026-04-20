const { GoogleGenAI } = require('@google/genai'); 
const fs = require('fs'); 
const b64 = Buffer.from('test').toString('base64');
const ai = new GoogleGenAI({}); 
ai.models.generateContent({
  model: 'gemini-2.5-flash', 
  contents: [{role: 'user', parts: [{inlineData: {data: b64, mimeType: 'text/plain'}}, {text: 'test file'}]}]
}).then(res => console.log(res.text)).catch(e => console.error(e.message));
