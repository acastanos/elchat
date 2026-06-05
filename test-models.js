const fs = require('fs');

async function checkModels() {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const keyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
  const key = keyMatch ? keyMatch[1].trim() : null;
  if (!key) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    
    if (data.models) {
      console.log('Modelos disponibles para tu API Key:');
      data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.error('Error fetching models:', data);
    }
  } catch(e) {
    console.error('Network error:', e);
  }
}

checkModels();
