// Helper to format Date objects as YYYY-MM-DD
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to parse MMDDYYYY string to YYYY-MM-DD
function parseMMDDYYYY(str) {
  if (!str || str.length !== 8) return null;
  const m = str.slice(0, 2);
  const d = str.slice(2, 4);
  const y = str.slice(4, 8);
  return `${y}-${m}-${d}`;
}

// Helper to clean up slugs into human readable names
export function cleanHotelName(slug) {
  if (!slug) return '';
  return slug
    .split(/[-_]+/)
    .map(word => {
      // Ignore common prefixes/suffixes in slug
      if (['hotel', 'resort', 'spa', 'villas', 'h', 'detail'].includes(word.toLowerCase())) {
        return '';
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');
}

// Robust URL Parser for RateRadar
export function parseHotelUrl(urlString) {
  const result = {
    hotelName: '',
    hotelKey: '',
    checkin: '',
    checkout: '',
    guests: 2,
    ota: 'unknown',
    originalUrl: urlString
  };

  // Set default dates
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  let parsedUrl;
  try {
    // If user forgot protocol, add it
    let cleanUrl = urlString.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    parsedUrl = new URL(cleanUrl);
  } catch (err) {
    return null; // Invalid URL
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 1. MakeMyTrip Parser
  if (hostname.includes('makemytrip.com')) {
    result.ota = 'MakeMyTrip';
    // MMT often has hotelId or TAHotelCode in search params
    const hotelId = searchParams.get('hotelId') || searchParams.get('TAHotelCode') || searchParams.get('hotelcode') || searchParams.get('topHtlId');

    // Primary: extract hotel name from searchText query param (standard MMT share URL format)
    // e.g. /hotels/hotel-details/?hotelId=...&searchText=The+Shakti+Vilas+By+Trulyy
    const searchText = searchParams.get('searchText') || searchParams.get('query');
    if (searchText) {
      result.hotelName = searchText.trim();
    }

    // Fallback: Extract hotel name from path slug, e.g. /hotels/hotel-details-detail-taj_mahal_palace-mumbai.html
    if (!result.hotelName) {
      const pathParts = pathname.split('/');
      const hotelDetailPart = pathParts.find(p => p.includes('hotel-details') || p.includes('hotel_details') || p.includes('detail-'));
      if (hotelDetailPart) {
        // Match slug content between 'detail-'/'details-' and the city suffix or .html
        const match = hotelDetailPart.match(/(?:detail-|details-)([^.]+?)(?:[-_][a-z]{3,})?(?:\.html)?$/i);
        if (match && match[1]) {
          result.hotelName = cleanHotelName(match[1]);
        }
      }
    }

    // Last resort: use hotelId as label
    if (!result.hotelName && hotelId) {
      result.hotelName = `MMT Hotel (${hotelId})`;
    }

    // Checkin/checkout in format MMDDYYYY (like checkin=05282026)
    const checkinParam = searchParams.get('checkin') || searchParams.get('chk_in') || searchParams.get('checkInDate');
    const checkoutParam = searchParams.get('checkout') || searchParams.get('chk_out') || searchParams.get('checkOutDate');

    result.checkin = parseMMDDYYYY(checkinParam) || checkinParam || '';
    result.checkout = parseMMDDYYYY(checkoutParam) || checkoutParam || '';
    result.hotelKey = hotelId || '';
  }
  // 2. Booking.com Parser
  else if (hostname.includes('booking.com')) {
    result.ota = 'Booking.com';
    // Path looks like /hotel/{country}/{hotel-slug}.html
    const match = pathname.match(/\/hotel\/\w+\/([^./]+)/i) || pathname.match(/\/hotel\/([^./]+)/i);
    if (match && match[1]) {
      result.hotelName = cleanHotelName(match[1]);
      result.hotelKey = match[1];
    }

    const checkinParam = searchParams.get('checkin');
    const checkoutParam = searchParams.get('checkout');
    result.checkin = checkinParam || '';
    result.checkout = checkoutParam || '';
  }
  // 3. Agoda Parser
  else if (hostname.includes('agoda.com')) {
    result.ota = 'Agoda';
    // Path looks like /en-gb/hotel-name/hotel/city-country.html?hotel_id=12345
    // or /hotel-name/hotel/city.html
    const pathParts = pathname.split('/');
    const hotelIdx = pathParts.indexOf('hotel');
    if (hotelIdx > 0) {
      result.hotelName = cleanHotelName(pathParts[hotelIdx - 1]);
    } else {
      const parts = pathname.replace('.html', '').split('/');
      const lastPart = parts[parts.length - 1];
      result.hotelName = cleanHotelName(lastPart);
    }

    const hotelId = searchParams.get('hotel_id') || searchParams.get('hotelId');
    if (hotelId) {
      result.hotelKey = hotelId;
    } else {
      // Try to find a numeric string in the pathname
      const numberMatch = pathname.match(/-h(\d+)\.html/i) || pathname.match(/\/(\d+)\.html/i);
      if (numberMatch && numberMatch[1]) {
        result.hotelKey = numberMatch[1];
      }
    }

    const checkinParam = searchParams.get('checkin') || searchParams.get('checkIn');
    const checkoutParam = searchParams.get('checkout') || searchParams.get('checkOut');
    result.checkin = checkinParam || '';
    result.checkout = checkoutParam || '';
  }
  // 4. Expedia Parser
  else if (hostname.includes('expedia.com') || hostname.includes('expedia.co.in')) {
    result.ota = 'Expedia';
    // Path looks like: /Mumbai-Hotels-Taj-Palace.h12345.Hotel-Information
    const idMatch = pathname.match(/\.h(\d+)\.Hotel-Information/i);
    if (idMatch && idMatch[1]) {
      result.hotelKey = idMatch[1];
    } else {
      result.hotelKey = searchParams.get('hotelId') || '';
    }

    const pathParts = pathname.split('/');
    const hotelInfoPart = pathParts.find(p => p.includes('Hotel-Information'));
    if (hotelInfoPart) {
      const namePart = hotelInfoPart.split('.h')[0].replace(/-Hotels/i, '');
      result.hotelName = cleanHotelName(namePart);
    } else {
      const lastPart = pathParts[pathParts.length - 1];
      result.hotelName = cleanHotelName(lastPart.split('.h')[0]);
    }

    const checkinParam = searchParams.get('startDate') || searchParams.get('chk_in') || searchParams.get('checkin');
    const checkoutParam = searchParams.get('endDate') || searchParams.get('chk_out') || searchParams.get('checkout');
    result.checkin = checkinParam || '';
    result.checkout = checkoutParam || '';
  }
  // 5. Generic Fallback
  else {
    result.ota = 'Generic';
    // Try to extract name from path
    const pathParts = pathname.split('/').filter(p => p && !/\.html$/i.test(p) && p !== 'hotel' && p !== 'hotels');
    if (pathParts.length > 0) {
      result.hotelName = cleanHotelName(pathParts[pathParts.length - 1]);
    } else {
      // Use domain name as a hint
      result.hotelName = cleanHotelName(hostname.replace('www.', '').split('.')[0]);
    }

    // Try common query keys for dates
    const checkinKeys = ['checkin', 'check_in', 'checkindate', 'startdate', 'start', 'from', 'chk_in', 'in'];
    const checkoutKeys = ['checkout', 'check_out', 'checkoutdate', 'enddate', 'end', 'to', 'chk_out', 'out'];

    let foundIn = '';
    let foundOut = '';

    for (const key of checkinKeys) {
      if (searchParams.has(key)) {
        foundIn = searchParams.get(key);
        break;
      }
    }
    for (const key of checkoutKeys) {
      if (searchParams.has(key)) {
        foundOut = searchParams.get(key);
        break;
      }
    }

    // Handle MMDDYYYY in generic search if found
    if (foundIn && foundIn.length === 8 && /^\d+$/.test(foundIn)) {
      result.checkin = parseMMDDYYYY(foundIn);
    } else {
      result.checkin = foundIn || '';
    }

    if (foundOut && foundOut.length === 8 && /^\d+$/.test(foundOut)) {
      result.checkout = parseMMDDYYYY(foundOut);
    } else {
      result.checkout = foundOut || '';
    }
  }

  // Parse guests parameter if it exists
  const guestsParam = searchParams.get('guests') || searchParams.get('adults') || searchParams.get('rooms');
  if (guestsParam && !isNaN(guestsParam)) {
    result.guests = parseInt(guestsParam, 10);
  }

  // Ensure dates are parsed as valid YYYY-MM-DD and set datesExtracted flag
  const checkinValid = /^\d{4}-\d{2}-\d{2}$/.test(result.checkin);
  const checkoutValid = /^\d{4}-\d{2}-\d{2}$/.test(result.checkout);

  if (checkinValid && checkoutValid) {
    const start = new Date(result.checkin);
    const end = new Date(result.checkout);

    // Get today's date in local time for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkinDate = new Date(start);
    checkinDate.setHours(0, 0, 0, 0);

    if (checkinDate >= today && end > start) {
      result.datesExtracted = true;
      result.nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    } else {
      // If check-in is in the past or checkout is before/on checkin, force date input
      result.datesExtracted = false;
      result.checkin = '';
      result.checkout = '';
      result.nights = 0;
    }
  } else {
    result.datesExtracted = false;
    result.checkin = '';
    result.checkout = '';
    result.nights = 0;
  }

  // Format hotelName to remove any trailing details and double spaces
  result.hotelName = result.hotelName.replace(/\s+/g, ' ').trim();

  // If we couldn't parse a name, default to "Luxury Hotel"
  if (!result.hotelName) {
    result.hotelName = 'Luxury Hotel';
  }

  return result;
}
