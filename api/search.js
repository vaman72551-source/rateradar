export default async function handler(req, res) {
  // Set CORS headers for flexibility
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get search query parameter
  const q = req.query.q || req.query.query;
  if (!q) {
    return res.status(400).json({
      error: { status_code: 400, message: "Missing required parameter 'q'" }
    });
  }

  const apiKey = process.env.RAPIDAPI_KEY;

  try {
    let url;
    let headers = {};

    if (apiKey) {
      // Query via RapidAPI
      url = `https://xotelo-hotel-prices.p.rapidapi.com/api/search?q=${encodeURIComponent(q)}`;
      headers = {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'xotelo-hotel-prices.p.rapidapi.com'
      };
    } else {
      // Query direct fallback
      url = `https://data.xotelo.com/api/search?q=${encodeURIComponent(q)}`;
    }

    const response = await fetch(url, { headers, method: 'GET' });
    if (!response.ok) {
      return res.status(response.status).json({
        error: { status_code: response.status, message: `Upstream API returned status ${response.status}` }
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: { status_code: 500, message: error.message }
    });
  }
}
