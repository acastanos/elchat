exports.handler = async function (event, context) {
  // CORS Headers para asegurar compatibilidad en desarrollo local y producción
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Manejo de la petición preflight (CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Asegurarnos de que sea POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Falta la GEMINI_API_KEY en el entorno de Netlify' })
    };
  }

  const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastResponse = null;
  let lastData = null;

  for (const model of modelsToTry) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: event.body
      });

      const data = await response.json();
      lastResponse = response;
      lastData = data;

      if (response.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }

      // Si el modelo está experimentando alta demanda (503) o límite de frecuencia (429), reintentamos con el siguiente modelo
      if (response.status === 503 || response.status === 429) {
        console.warn(`Modelo ${model} ocupado (${response.status}). Probando el siguiente modelo...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(data)
      };
    } catch (error) {
      console.error(`Error de red al llamar a ${model}:`, error);
    }
  }

  return {
    statusCode: lastResponse ? lastResponse.status : 500,
    headers,
    body: JSON.stringify(lastData || { error: 'Error interno del servidor Proxy al contactar con Gemini' })
  };
};
