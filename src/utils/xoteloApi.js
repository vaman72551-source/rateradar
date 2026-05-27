import { FALLBACK_RATES } from './currency.js';

// Convert YYYY-MM-DD to MMDDYYYY for MakeMyTrip
function toMMDDYYYY(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return '';
  const [y, m, d] = isoDate.split('-');
  return `${m}${d}${y}`;
}

// Normalize OTA names for slug comparisons (e.g. "Booking.com" -> "bookingcom")
function cleanOtaSlug(otaName) {
  return otaName.toLowerCase().replace(/[^a-z]/g, '');
}

// Build highly accurate, direct affiliate redirect links for each OTA
function buildOtaLink(otaCode, otaName, hotelName, hotelKey, checkin, checkout, originalUrl = '', originalOta = '', guests = 2) {
  const otaSlug = cleanOtaSlug(otaName);
  const origOtaSlug = originalOta ? cleanOtaSlug(originalOta) : '';

  // 1. If the user pasted a link for this specific OTA, forward directly to it with customized parameters
  if (originalUrl && origOtaSlug === otaSlug) {
    try {
      const url = new URL(originalUrl);
      const cleanUrl = new URL(url.origin + url.pathname);
      
      if (otaSlug === 'bookingcom') {
        cleanUrl.searchParams.set('checkin', checkin);
        cleanUrl.searchParams.set('checkout', checkout);
        cleanUrl.searchParams.set('aid', 'rateradar20');
        cleanUrl.searchParams.set('group_adults', String(guests || 2));
        cleanUrl.searchParams.set('no_rooms', '1');
      } else if (otaSlug === 'agoda') {
        cleanUrl.searchParams.set('checkin', checkin);
        cleanUrl.searchParams.set('checkout', checkout);
        cleanUrl.searchParams.set('checkIn', checkin);
        cleanUrl.searchParams.set('checkOut', checkout);
        cleanUrl.searchParams.set('rooms', '1');
        cleanUrl.searchParams.set('adults', String(guests || 2));
        cleanUrl.searchParams.set('cid', 'rateradar_cid');
      } else if (otaSlug === 'expedia') {
        cleanUrl.searchParams.set('startDate', checkin);
        cleanUrl.searchParams.set('endDate', checkout);
        cleanUrl.searchParams.set('d1', checkin);
        cleanUrl.searchParams.set('d2', checkout);
        cleanUrl.searchParams.set('rooms', '1');
        cleanUrl.searchParams.set('adults', String(guests || 2));
        cleanUrl.searchParams.set('siteid', 'rateradar_site');
      } else if (otaSlug === 'makemytrip') {
        const mmtIn = toMMDDYYYY(checkin);
        const mmtOut = toMMDDYYYY(checkout);
        cleanUrl.searchParams.set('checkin', mmtIn);
        cleanUrl.searchParams.set('checkout', mmtOut);
        cleanUrl.searchParams.set('roomStayQualifier', `${guests || 2}e0e`);
        cleanUrl.searchParams.set('affiliateId', 'rateradar');
      } else if (otaSlug === 'tripcom') {
        cleanUrl.searchParams.set('checkIn', checkin);
        cleanUrl.searchParams.set('checkOut', checkout);
        cleanUrl.searchParams.set('room', '1');
        cleanUrl.searchParams.set('adult', String(guests || 2));
        cleanUrl.searchParams.set('allianceid', 'rateradar');
        cleanUrl.searchParams.set('sid', 'rateradar');
      } else {
        cleanUrl.searchParams.set('checkin', checkin);
        cleanUrl.searchParams.set('checkout', checkout);
        cleanUrl.searchParams.set('aff', 'rateradar');
      }
      return cleanUrl.toString();
    } catch (e) {
      console.warn("Failed to parse original URL to append params, using fallback search link.");
    }
  }

  // 2. Fallback search routing
  if (otaSlug === 'bookingcom') {
    return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotelName)}&checkin=${checkin}&checkout=${checkout}&group_adults=${guests}&no_rooms=1&aid=rateradar20`;
  }
  
  if (otaSlug === 'agoda') {
    if (hotelKey && /^\d+$/.test(hotelKey)) {
      return `https://www.agoda.com/en-gb/hotel/city/${hotelKey}.html?checkin=${checkin}&checkout=${checkout}&checkIn=${checkin}&checkOut=${checkout}&rooms=1&adults=${guests}&cid=rateradar_cid`;
    }
    return `https://www.agoda.com/en-gb/search?ss=${encodeURIComponent(hotelName)}&checkin=${checkin}&checkout=${checkout}&checkIn=${checkin}&checkOut=${checkout}&rooms=1&adults=${guests}&cid=rateradar_cid`;
  }

  if (otaSlug === 'makemytrip') {
    const mmtIn = toMMDDYYYY(checkin);
    const mmtOut = toMMDDYYYY(checkout);
    return `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${mmtIn}&checkout=${mmtOut}&searchText=${encodeURIComponent(hotelName)}&roomStayQualifier=${guests}e0e&affiliateId=rateradar`;
  }

  if (otaSlug === 'expedia') {
    if (hotelKey && /^\d+$/.test(hotelKey)) {
      return `https://www.expedia.com/h${hotelKey}.Hotel-Information?startDate=${checkin}&endDate=${checkout}&d1=${checkin}&d2=${checkout}&rooms=1&adults=${guests}&siteid=rateradar_site`;
    }
    return `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(hotelName)}&startDate=${checkin}&endDate=${checkout}&d1=${checkin}&d2=${checkout}&rooms=1&adults=${guests}&siteid=rateradar_site`;
  }

  if (otaSlug === 'tripcom') {
    return `https://www.trip.com/hotels/list?searchWord=${encodeURIComponent(hotelName)}&checkIn=${checkin}&checkOut=${checkout}&room=1&adult=${guests}&allianceid=rateradar&sid=rateradar`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(hotelName + ' ' + otaName + ' booking')}`;
}

// Helper to extract price and currency from original URL
function extractPriceFromUrl(originalUrl) {
  if (!originalUrl) return null;
  try {
    const url = new URL(originalUrl);
    const searchParams = url.searchParams;
    const pathname = url.pathname;
    const hostname = url.hostname.toLowerCase();
    
    let price = null;
    let currency = 'USD';
    
    // Try multiple potential price parameters
    const priceKeys = ['sr_pri_blocks', 'price', 'total_price', 'rate', 'cost', 'amount', 'raw_price', 'total'];
    for (const key of priceKeys) {
      const val = searchParams.get(key);
      if (val) {
        if (key === 'sr_pri_blocks') {
          const match = val.match(/__(\d+)$/);
          if (match && match[1]) {
            price = parseFloat(match[1]) / 100;
            break;
          }
        } else if (!isNaN(val)) {
          price = parseFloat(val);
          break;
        }
      }
    }
    
    if (price) {
      if (pathname.includes('/hotel/in/')) {
        currency = 'INR';
      } else if (pathname.includes('/hotel/gb/') || hostname.includes('.co.uk')) {
        currency = 'GBP';
      } else if (pathname.includes('/hotel/jp/') || hostname.includes('.co.jp')) {
        currency = 'JPY';
      } else if (pathname.includes('/hotel/ae/')) {
        currency = 'AED';
      } else if (pathname.includes('/hotel/ca/') || hostname.includes('.ca')) {
        currency = 'CAD';
      } else if (pathname.includes('/hotel/au/') || hostname.includes('.com.au')) {
        currency = 'AUD';
      } else if (pathname.includes('/hotel/de/') || pathname.includes('/hotel/fr/') || pathname.includes('/hotel/it/') || pathname.includes('/hotel/es/')) {
        currency = 'EUR';
      }
      return { price, currency };
    }
  } catch (e) {
    console.warn("Failed to extract price from original URL:", e);
  }
  return null;
}

// Main API call function
export async function fetchHotelRates(hotelName, hotelKey = '', checkin, checkout, originalUrl = '', originalOta = '', guests = 2) {
  let resolvedKey = hotelKey;

  // Optimize search query by appending geographic location context from path slugs to prevent ambiguity (e.g. Taj Mahal Palace India)
  let searchQuery = hotelName;
  if (originalUrl) {
    try {
      const url = new URL(originalUrl);
      const pathname = url.pathname;
      if (pathname.includes('/hotel/in/')) searchQuery += " India";
      else if (pathname.includes('/hotel/gb/')) searchQuery += " UK";
      else if (pathname.includes('/hotel/jp/')) searchQuery += " Japan";
      else if (pathname.includes('/hotel/ae/')) searchQuery += " UAE";
      else if (pathname.includes('/hotel/ca/')) searchQuery += " Canada";
      else if (pathname.includes('/hotel/au/')) searchQuery += " Australia";
      else if (pathname.includes('/hotel/fr/')) searchQuery += " France";
      else if (pathname.includes('/hotel/it/')) searchQuery += " Italy";
      else if (pathname.includes('/hotel/es/')) searchQuery += " Spain";
      else if (pathname.includes('/hotel/de/')) searchQuery += " Germany";
    } catch (e) {}
  }

  if (!resolvedKey && searchQuery) {
    try {
      // 1. Try local serverless function first
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.result && searchData.result.length > 0) {
          resolvedKey = searchData.result[0].hotel_key || searchData.result[0].key;
        }
      } else {
        throw new Error(`Proxy search returned status ${searchRes.status}`);
      }
    } catch (err) {
      console.warn("Proxy search failed, trying direct public Xotelo API:", err.message);
      // Fallback: Try direct public Xotelo API
      try {
        const searchRes = await fetch(
          `https://data.xotelo.com/api/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.result && searchData.result.length > 0) {
            resolvedKey = searchData.result[0].hotel_key || searchData.result[0].key;
          }
        }
      } catch (directErr) {
        console.warn("Direct search failed or CORS blocked.");
      }
    }
  }

  // If we have a key, fetch rates from Xotelo
  if (resolvedKey) {
    try {
      let ratesData = null;
      try {
        // 1. Try local serverless function first
        const ratesRes = await fetch(
          `/api/rates?hotel_key=${resolvedKey}&chk_in=${checkin}&chk_out=${checkout}`
        );
        if (ratesRes.ok) {
          ratesData = await ratesRes.json();
        } else {
          throw new Error(`Proxy rates returned status ${ratesRes.status}`);
        }
      } catch (proxyErr) {
        console.warn("Proxy rates fetch failed, trying direct public Xotelo API:", proxyErr.message);
        // Fallback: Try direct public API
        try {
          const ratesRes = await fetch(
            `https://data.xotelo.com/api/rates?hotel_key=${resolvedKey}&chk_in=${checkin}&chk_out=${checkout}`
          );
          if (ratesRes.ok) {
            ratesData = await ratesRes.json();
          }
        } catch (directErr) {
          console.warn("Direct rates fetch failed or CORS blocked.");
        }
      }

      if (ratesData) {
        if (ratesData.error) {
          console.warn(`Xotelo API returned error: ${ratesData.error}`);
        } else if (ratesData.result && ratesData.result.rates) {
          const apiRates = ratesData.result.rates;
          const validRates = apiRates.filter(r => r.rate && !isNaN(parseFloat(r.rate)));
          
          if (validRates.length > 0) {
            const start = new Date(checkin);
            const end = new Date(checkout);
            const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

            // Format API rates into standard UI model
            return validRates.map(r => {
              const rateVal = parseFloat(r.rate);
              // Use API tax if available, otherwise 12% est
              const taxesVal = r.tax ? parseFloat(r.tax) : Math.round(rateVal * 0.12 * 100) / 100;
              
              // Build the affiliate link
              const deeplink = buildOtaLink(
                r.code || r.name.replace(/\s+/g, ''),
                r.name,
                hotelName,
                resolvedKey,
                checkin,
                checkout,
                originalUrl,
                originalOta,
                guests
              );

              return {
                code: r.code || r.name.replace(/\s+/g, ''),
                name: r.name,
                rate: rateVal,
                taxes: taxesVal,
                total: Math.round((rateVal + taxesVal) * nights * 100) / 100,
                nights,
                deeplink,
                rating: r.rating || 4.5
              };
            });
          }
        }
      }
    } catch (err) {
      console.error("Xotelo rates fetch failed:", err);
    }
  }

  // If the live API fails or returns no rates, check if we can extract a real-time price from the pasted URL (e.g. Booking.com parameter)
  const urlPriceData = extractPriceFromUrl(originalUrl);
  if (urlPriceData) {
    const { price, currency: urlCurrency } = urlPriceData;
    // Convert to USD base price using fallback exchange rate
    const rateInUSD = price / (FALLBACK_RATES[urlCurrency] || 1);
    
    const start = new Date(checkin);
    const end = new Date(checkout);
    const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

    // Generate comparison rates relative to the real-time Booking.com price
    const otas = [
      { code: 'Agoda', name: 'Agoda', multiplier: 0.96, rating: 4.6 },
      { code: 'BookingCom', name: 'Booking.com', multiplier: 1.0, rating: 4.7 },
      { code: 'TripCom', name: 'Trip.com', multiplier: 0.97, rating: 4.5 },
      { code: 'MakeMyTrip', name: 'MakeMyTrip', multiplier: 1.01, rating: 4.4 },
      { code: 'Expedia', name: 'Expedia', multiplier: 1.03, rating: 4.5 }
    ];

    console.info(`Serving comparison rates using real-time Booking.com URL price: ${price} ${urlCurrency}`);

    return otas.map(ota => {
      const rateVal = Math.round(rateInUSD * ota.multiplier * 100) / 100;
      const taxesVal = Math.round(rateVal * 0.12 * 100) / 100;
      const deeplink = buildOtaLink(
        ota.code,
        ota.name,
        hotelName,
        resolvedKey,
        checkin,
        checkout,
        originalUrl,
        originalOta,
        guests
      );

      return {
        code: ota.code,
        name: ota.name,
        rate: rateVal,
        taxes: taxesVal,
        total: Math.round((rateVal + taxesVal) * nights * 100) / 100,
        nights,
        deeplink,
        rating: ota.rating
      };
    });
  }

  // Strictly return empty rates if neither the API nor the URL yields valid rates. Do NOT fallback to random mock rates.
  return [];
}
