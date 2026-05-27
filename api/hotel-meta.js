export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter', imageUrl: null, address: null });
  }

  try {
    // Fetch with a tight 6-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(200).json({ imageUrl: null, address: null });
    }

    // Only read the first 80KB — all meta tags live in <head>
    const buffer = await response.arrayBuffer();
    const html = new TextDecoder('utf-8', { fatal: false })
      .decode(new Uint8Array(buffer).slice(0, 80000));

    // ── Extract og:image ──────────────────────────────────────────────────────
    let imageUrl = null;
    const ogPatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pattern of ogPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].startsWith('http')) {
        imageUrl = match[1].split('?')[0]; // strip query params for clean CDN URL
        break;
      }
    }

    // ── Extract address from JSON-LD structured data ──────────────────────────
    let address = null;
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const jsonLdMatches = [...html.matchAll(jsonLdRegex)];

    for (const match of jsonLdMatches) {
      try {
        const raw = match[1].trim();
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
          const types = ['Hotel', 'LodgingBusiness', 'Accommodation', 'Resort'];
          const type = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
          if (!types.some(t => type.includes(t))) continue;

          if (item.address) {
            const addr = item.address;
            const parts = [
              addr.streetAddress,
              addr.addressLocality || addr.addressRegion,
              addr.postalCode,
              addr.addressCountry
            ].filter(Boolean);
            if (parts.length >= 2) {
              address = parts.join(', ');
              break;
            }
          }
        }
        if (address) break;
      } catch (_) {
        // JSON parse failed — try next block
      }
    }

    // ── Fallback: look for address in meta description ────────────────────────
    if (!address) {
      const descMatch = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([^"']{10,200})["']/i)
        || html.match(/<meta[^>]+content=["']([^"']{10,200})["'][^>]+(?:name=["']description["'])/i);
      if (descMatch) {
        // Extract anything that looks like an address from the description
        const addrMatch = descMatch[1].match(/(?:located|located at|address[:\s]+)([\w\s,]+(?:\d{4,}|\w{2,})[,.\s])/i);
        if (addrMatch) address = addrMatch[1].trim();
      }
    }

    return res.status(200).json({ imageUrl, address });
  } catch (error) {
    // Silently return nulls — client handles fallback
    return res.status(200).json({ imageUrl: null, address: null, error: error.message });
  }
}
