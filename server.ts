import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import pdfParse from 'pdf-parse';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for PDF Parsing
  app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      let localItems: Array<{name: string, rate: string, hours: string}> = [];
      let confidence = 0;

      // STEP 1: Cost-neutral Local PDF Text Parsing
      // We attempt to extract digital text directly from the PDF without an API call.
      try {
        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text;

        // If we got meaningful digital text, apply heuristics to extract line items
        if (text && text.trim().length > 100) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for lines containing a Euro symbol and a number format typical for German
            // e.g. "Konzeption und Planung 1 3.500,00 €"
            if (line.match(/\d+(?:[.,]\d+)?\s*(?:€|Euro)/i)) {
              
              // Basic regex to split Description and Final Price
              // Matches things like "Item Name    3.500,00 €"
              const match = line.match(/^(.*?)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:€|Euro)/i);
              
              if (match) {
                const rawName = match[1].trim();
                const rawPrice = match[2];
                
                // Clean up German number format (e.g., 3.500,00 -> 3500.00)
                const rateStr = rawPrice.replace(/\./g, '').replace(',', '.');
                
                // Remove trailing stray numbers acting as quantity if caught in name
                const nameMatch = rawName.match(/^(.*?)(?:\s+\d+)?$/);
                const cleanName = nameMatch ? nameMatch[1].trim() : rawName;

                // Validate the name isn't just numbers or garbage
                if (cleanName.length > 3 && isNaN(Number(cleanName))) {
                  localItems.push({
                    name: cleanName,
                    rate: rateStr,
                    hours: '1' // Assume flat item if no explicit hours are parsed locally
                  });
                  confidence += 30; // Boost confidence per found coherent item
                }
              }
            }
          }
        }

        // Cap confidence at 100
        confidence = Math.min(confidence, 100);

      } catch (parseErr) {
        console.warn("Local PDF text extraction attempt failed...", parseErr);
        confidence = 0; // Force fallback
      }

      // STEP 2: Confidence Threshold Check
      // If our free local parser found items with good confidence, skip the API call to save costs.
      const CONFIDENCE_THRESHOLD = 60;
      if (confidence >= CONFIDENCE_THRESHOLD && localItems.length > 0) {
        console.log(`[Parse] High confidence (${confidence}%) local extraction successful. Saving API costs.`);
        return res.json({ items: localItems, method: 'local_ocr' });
      }

      // STEP 3: Fallback to Gemini Multimodal
      // (Used if PDF is a scanned image, OCR failed, or layout is too complex for basic regex)
      console.log(`[Parse] Confidence low (${confidence}%). Falling back to Gemini API...`);

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is missing');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: req.file.buffer.toString('base64'),
                  mimeType: 'application/pdf',
                }
              },
              {
                text: `Extract the line items from this estimate PDF. For each line item, extract the Description, Hourly Rate (in Euro), and Hours.
Be smart about it. If it's a flat fee without hourly rate, just specify rate as the total and hours as 1. Wait, actually, German estimates might have 'Anzahl', 'Preis', 'Summe'.
For example: 'Konzeption und Planung', Anzahl: 1, Preis: 3.500,00 €. Make rate '3500.00', hours '1'.
For 'Produktion und Dreh' Videograf: 20h. If rate is flat 26.600,00 but you see 20h, just output rate '1330' and hours '20', or rate '26600' and hours '1'. Preferably whatever adds up to the Sum.
For 'Social Media Manager: 20h' inside a bigger block, aggregate the total hours or put them as separate line items. 
If the file contains multiple items like:
- Konzeption und Planung: 3500 Euro (1)
- Produktion und Dreh: 26600 Euro (1)
- Post Production: 7280 Euro (1)
- Creator / Influencer: 20000 Euro (1)

Return the result STRICTLY as a JSON array where each object has "name" (string), "rate" (string representing number), and "hours" (string representing number). 
Only return the valid JSON, no markdown formatting like \`\`\`json.
Example: [{"name": "Konzeption und Planung", "rate": "3500", "hours": "1"}]`
              }
            ]
          }
        ]
      });

      const text = response.text;
      if (!text) {
          throw new Error("No response from Gemini");
      }
      
      const jsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const items = JSON.parse(jsonStr);

      res.json({ items, method: 'gemini_fallback' });
    } catch (error) {
      console.error('PDF Parse Error:', error);
      res.status(500).json({ error: 'Failed to parse PDF ' + (error as Error).message });
    }
  });

  // Vite middleare
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
