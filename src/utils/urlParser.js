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

// Helper to normalize various date string formats to YYYY-MM-DD
export function normalizeDateStr(dateStr) {
  if (!dateStr) return '';
  dateStr = dateStr.trim();

  // 1. Match YYYY-M(M)-D(D) or YYYY/M(M)/D(D) or YYYY.M(M).D(D)
  const ymdMatch = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // 2. Match 8-digit numeric formats: YYYYMMDD or MMDDYYYY
  if (/^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.slice(0, 4), 10);
    if (year >= 2020 && year <= 2040) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return `${dateStr.slice(4, 8)}-${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}`;
  }

  // 3. Match D(D)-M(M)-YYYY or D(D)/M(M)/YYYY or M(M)/D(D)/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const first = parseInt(dmyMatch[1], 10);
    const second = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    // If the first number is > 12, it must be Day, so DD-MM-YYYY
    if (first > 12) {
      return `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`;
    }
    // Otherwise, assume standard US format MM-DD-YYYY or fallback MM-DD-YYYY
    return `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`;
  }

  return dateStr;
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

    const checkinParam = searchParams.get('startDate') || searchParams.get('chk_in') || searchParams.get('checkin') || searchParams.get('d1');
    const checkoutParam = searchParams.get('endDate') || searchParams.get('chk_out') || searchParams.get('checkout') || searchParams.get('d2');
    result.checkin = checkinParam || '';
    result.checkout = checkoutParam || '';
  }
  // 5. Trip.com / Ctrip Parser
  else if (hostname.includes('trip.com') || hostname.includes('ctrip.com')) {
    result.ota = 'Trip.com';
    // Try query params for hotel name first
    const nameFromParam = searchParams.get('searchWord') || searchParams.get('hotelName') || searchParams.get('keyword');
    if (nameFromParam) {
      result.hotelName = nameFromParam.trim();
    } else {
      const pathParts = pathname.split('/').filter(Boolean);
      result.hotelName = cleanHotelName(pathParts[pathParts.length - 1] || '');
    }
    const hotelId = searchParams.get('hotelId') || searchParams.get('id');
    result.hotelKey = hotelId || '';

    result.checkin = searchParams.get('checkIn') || searchParams.get('checkin') || '';
    result.checkout = searchParams.get('checkOut') || searchParams.get('checkout') || '';
  }
  // 6. Hotels.com Parser
  else if (hostname.includes('hotels.com')) {
    result.ota = 'Hotels.com';
    const nameFromParam = searchParams.get('q-destination') || searchParams.get('destination') || searchParams.get('q');
    if (nameFromParam) {
      result.hotelName = nameFromParam.trim();
    } else {
      const pathParts = pathname.split('/').filter(p => p && p !== 'hotel' && p !== 'hotels' && !/\.html$/i.test(p));
      result.hotelName = cleanHotelName(pathParts[pathParts.length - 1] || '');
    }
    result.checkin = searchParams.get('q-check-in') || searchParams.get('startDate') || searchParams.get('checkin') || '';
    result.checkout = searchParams.get('q-check-out') || searchParams.get('endDate') || searchParams.get('checkout') || '';
  }
  // 7. Trivago Parser
  else if (hostname.includes('trivago.com')) {
    result.ota = 'Trivago';
    result.hotelName = searchParams.get('search[query]') || searchParams.get('destination') || searchParams.get('query') || '';
    result.checkin = searchParams.get('search[checkinDay]') || searchParams.get('startDate') || searchParams.get('checkin') || '';
    result.checkout = searchParams.get('search[checkoutDay]') || searchParams.get('endDate') || searchParams.get('checkout') || '';
    if (!result.hotelName) {
      const pathParts = pathname.split('/').filter(Boolean);
      result.hotelName = cleanHotelName(pathParts[pathParts.length - 1] || '');
    }
  }
  // 8. Goibibo Parser (Indian OTA)
  else if (hostname.includes('goibibo.com')) {
    result.ota = 'Goibibo';
    result.hotelName = searchParams.get('searchtext') || searchParams.get('hotelname') || searchParams.get('query') || '';
    if (!result.hotelName) {
      const pathParts = pathname.split('/').filter(p => p && p !== 'hotels' && p !== 'hotel');
      result.hotelName = cleanHotelName(pathParts[pathParts.length - 1] || '');
    }
    const checkinRaw = searchParams.get('checkin') || searchParams.get('chk_in') || '';
    const checkoutRaw = searchParams.get('checkout') || searchParams.get('chk_out') || '';
    // Goibibo uses YYYYMMDD format
    result.checkin = checkinRaw.length === 8 && /^\d+$/.test(checkinRaw)
      ? checkinRaw.slice(0,4) + '-' + checkinRaw.slice(4,6) + '-' + checkinRaw.slice(6,8)
      : checkinRaw;
    result.checkout = checkoutRaw.length === 8 && /^\d+$/.test(checkoutRaw)
      ? checkoutRaw.slice(0,4) + '-' + checkoutRaw.slice(4,6) + '-' + checkoutRaw.slice(6,8)
      : checkoutRaw;
  }
  // 9. Yatra / ClearTrip / EaseMyTrip (Indian OTAs)
  else if (hostname.includes('yatra.com') || hostname.includes('cleartrip.com') || hostname.includes('easemytrip.com')) {
    if (hostname.includes('yatra.com')) result.ota = 'Yatra';
    else if (hostname.includes('cleartrip.com')) result.ota = 'ClearTrip';
    else result.ota = 'EaseMyTrip';

    result.hotelName = searchParams.get('searchText') || searchParams.get('query') || searchParams.get('hotelName') || searchParams.get('q') || '';
    if (!result.hotelName) {
      const pathParts = pathname.split('/').filter(p => p && p !== 'hotels' && p !== 'hotel' && !/^\d+$/.test(p));
      result.hotelName = cleanHotelName(pathParts[pathParts.length - 1] || '');
    }
    result.checkin = searchParams.get('checkin') || searchParams.get('checkIn') || searchParams.get('startDate') || searchParams.get('from') || '';
    result.checkout = searchParams.get('checkout') || searchParams.get('checkOut') || searchParams.get('endDate') || searchParams.get('to') || '';
  }
  // 10. Generic Fallback — handles any OTA not explicitly listed above
  else {
    result.ota = 'Generic';

    // Try query params for hotel name (many OTAs embed the name in a param)
    const nameFromParam = searchParams.get('searchText') || searchParams.get('hotelName')
      || searchParams.get('query') || searchParams.get('q') || searchParams.get('name')
      || searchParams.get('destination') || searchParams.get('property') || searchParams.get('keyword');
    if (nameFromParam) {
      result.hotelName = nameFromParam.trim();
    } else {
      // Fall back to path: take last meaningful path segment
      const pathParts = pathname.split('/').filter(p =>
        p && !/\.html?$/i.test(p) && p !== 'hotel' && p !== 'hotels' && p !== 'search' && !/^\d+$/.test(p)
      );
      if (pathParts.length > 0) {
        result.hotelName = cleanHotelName(pathParts[pathParts.length - 1]);
      } else {
        result.hotelName = cleanHotelName(hostname.replace('www.', '').split('.')[0]);
      }
    }

    // Try many common checkin/checkout param names
    const checkinKeys = ['checkin', 'checkIn', 'check_in', 'check-in', 'checkindate',
      'startdate', 'startDate', 'start', 'from', 'arrival', 'chk_in', 'd1', 'in'];
    const checkoutKeys = ['checkout', 'checkOut', 'check_out', 'check-out', 'checkoutdate',
      'enddate', 'endDate', 'end', 'to', 'departure', 'chk_out', 'd2', 'out'];

    let foundIn = '';
    let foundOut = '';

    for (const key of checkinKeys) {
      const v = searchParams.get(key);
      if (v) { foundIn = v; break; }
    }
    for (const key of checkoutKeys) {
      const v = searchParams.get(key);
      if (v) { foundOut = v; break; }
    }

    // Normalise various date formats to YYYY-MM-DD
    const normDate = (raw) => {
      if (!raw) return '';
      // MMDDYYYY  (8 digit, starts with 0-1)
      if (/^\d{8}$/.test(raw) && parseInt(raw.slice(0,2)) <= 12) {
        return `${raw.slice(4,8)}-${raw.slice(0,2)}-${raw.slice(2,4)}`;
      }
      // YYYYMMDD  (8 digit)
      if (/^\d{8}$/.test(raw)) {
        return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
      }
      // MM/DD/YYYY
      const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) return `${slashMatch[3]}-${slashMatch[1].padStart(2,'0')}-${slashMatch[2].padStart(2,'0')}`;
      // Already YYYY-MM-DD or similar — pass through
      return raw;
    };

    result.checkin = normDate(foundIn);
    result.checkout = normDate(foundOut);
  }

  // Parse guests parameter if it exists
  const guestsParam = searchParams.get('guests') || searchParams.get('adults') || searchParams.get('rooms');
  if (guestsParam && !isNaN(guestsParam)) {
    result.guests = parseInt(guestsParam, 10);
  }

  // Normalize checkin and checkout using our global helper normalizeDateStr
  result.checkin = normalizeDateStr(result.checkin);
  result.checkout = normalizeDateStr(result.checkout);

  // If check-in is valid but checkout is missing or invalid, calculate using length of stay (los)
  if (/^\d{4}-\d{2}-\d{2}$/.test(result.checkin) && !/^\d{4}-\d{2}-\d{2}$/.test(result.checkout)) {
    const losParam = searchParams.get('los') || searchParams.get('nights') || searchParams.get('lengthOfStay') || searchParams.get('stay') || searchParams.get('los_nights');
    if (losParam && !isNaN(losParam)) {
      const nights = parseInt(losParam, 10);
      if (nights > 0) {
        try {
          const parts = result.checkin.split('-');
          const checkinDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          checkinDate.setDate(checkinDate.getDate() + nights);
          result.checkout = formatDate(checkinDate);
        } catch (e) {
          // ignore parsing error
        }
      }
    }
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
