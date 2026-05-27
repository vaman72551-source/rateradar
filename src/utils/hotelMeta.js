/**
 * fetchHotelMeta — fetches the real hotel image and address.
 *
 * Strategy:
 *  1. Call /api/hotel-meta which scrapes the OTA page for og:image + JSON-LD address
 *  2. If no address found, fall back to Nominatim (OpenStreetMap) – free, no key needed
 *  3. If no image found, return null (caller uses a beautiful fallback gradient)
 */
export async function fetchHotelMeta(originalUrl, hotelName) {
  let imageUrl = null;
  let address = null;

  // Step 1: Try the serverless proxy to get og:image and JSON-LD address
  if (originalUrl) {
    try {
      const res = await fetch(`/api/hotel-meta?url=${encodeURIComponent(originalUrl)}`);
      if (res.ok) {
        const data = await res.json();
        imageUrl = data.imageUrl || null;
        address = data.address || null;
      }
    } catch (e) {
      console.warn('[hotelMeta] OTA page fetch failed:', e.message);
    }
  }

  // Step 2: If no address yet, try Nominatim (OpenStreetMap) – completely free
  if (!address && hotelName) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hotelName)}&format=json&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RateRadar/1.0 (https://rateradar.vercel.app)',
            'Accept-Language': 'en',
          },
        }
      );
      if (res.ok) {
        const results = await res.json();
        if (results.length > 0) {
          const r = results[0];
          // Build a clean address: "Street, City, State, Country"
          const a = r.address || {};
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.suburb || a.neighbourhood,
            a.city || a.town || a.village || a.county,
            a.state,
            a.country,
          ].filter(Boolean);
          address = parts.length >= 2 ? parts.join(', ') : r.display_name.split(',').slice(0, 4).join(',').trim();
        }
      }
    } catch (e) {
      console.warn('[hotelMeta] Nominatim fallback failed:', e.message);
    }
  }

  return { imageUrl, address };
}
