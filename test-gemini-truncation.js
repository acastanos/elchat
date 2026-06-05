const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
const body = {
  systemInstruction: {
    parts: [{ text: "Actúa como una madre española típica." }]
  },
  contents: [{role: "user", parts: [{text: "Hola"}]}],
  generationConfig: { temperature: 0.8, maxOutputTokens: 250 }
};

fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
