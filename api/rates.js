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

  // Extract query parameters
  const hotel_key = req.query.hotel_key || req.query.key;
  const chk_in = req.query.chk_in || req.query.checkin;
  const chk_out = req.query.chk_out || req.query.checkout;
  const currency = req.query.currency || 'USD';

  if (!hotel_key || !chk_in || !chk_out) {
    return res.status(400).json({
      error: { status_code: 400, message: "Missing required parameters: hotel_key, chk_in, chk_out" }
    });
  }

  const apiKey = process.env.RAPIDAPI_KEY;

  try {
    let url;
    let headers = {};

    if (apiKey) {
      // Query via RapidAPI
      url = `https://xotelo-hotel-prices.p.rapidapi.com/api/rates?hotel_key=${encodeURIComponent(hotel_key)}&chk_in=${encodeURIComponent(chk_in)}&chk_out=${encodeURIComponent(chk_out)}&currency=${encodeURIComponent(currency)}`;
      headers = {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'xotelo-hotel-prices.p.rapidapi.com'
      };
    } else {
      // Query direct fallback
      url = `https://data.xotelo.com/api/rates?hotel_key=${encodeURIComponent(hotel_key)}&chk_in=${encodeURIComponent(chk_in)}&chk_out=${encodeURIComponent(chk_out)}&currency=${encodeURIComponent(currency)}`;
    }

    const response = await fetch(url, { headers, method: 'GET' });
    if (!response.ok) {
      // If we query data.xotelo.com and it fails, let's try direct xotelo.com as a fallback
      if (!apiKey && url.includes('data.xotelo.com')) {
        const fallbackUrl = `https://xotelo.com/api/rates?hotel_key=${encodeURIComponent(hotel_key)}&chk_in=${encodeURIComponent(chk_in)}&chk_out=${encodeURIComponent(chk_out)}&currency=${encodeURIComponent(currency)}`;
        const fallbackRes = await fetch(fallbackUrl, { method: 'GET' });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          return res.status(200).json(data);
        }
      }
      return res.status(response.status).json({
        error: { status_code: response.status, message: `Upstream API returned status ${response.status}` }
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    // If it's a network/DNS error on data.xotelo.com, try xotelo.com fallback
    if (!apiKey) {
      try {
        const fallbackUrl = `https://xotelo.com/api/rates?hotel_key=${encodeURIComponent(hotel_key)}&chk_in=${encodeURIComponent(chk_in)}&chk_out=${encodeURIComponent(chk_out)}&currency=${encodeURIComponent(currency)}`;
        const fallbackRes = await fetch(fallbackUrl, { method: 'GET' });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          return res.status(200).json(data);
        }
      } catch (fallbackError) {
        console.error("Fallback rates query failed:", fallbackError);
      }
    }
    return res.status(500).json({
      error: { status_code: 500, message: error.message }
    });
  }
}
