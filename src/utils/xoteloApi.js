import { FALLBACK_RATES } from './currency.js';

// Convert YYYY-MM-DD to MMDDYYYY for MakeMyTrip
function toMMDDYYYY(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return '';
  const [y, m, d] = isoDate.split('-');
  return `${m}${d}${y}`;
}

// Normalize OTA names for slug comparisons.
// Strips .com / .net / .org endings so "Agoda.com" and "Agoda" both map to "agoda",
// "Booking.com" maps to "booking", "Trip.com" maps to "trip", etc.
function cleanOtaSlug(otaName) {
  if (!otaName) return '';
  return otaName
    .toLowerCase()
    .replace(/[^a-z]/g, '')      // keep only letters
    .replace(/com$|net$|org$/, ''); // strip trailing domain suffix
}

// Build highly accurate, direct affiliate redirect links for each OTA
export function buildOtaLink(otaCode, otaName, hotelName, hotelKey, checkin, checkout, originalUrl = '', originalOta = '', guests = 2) {
  const otaSlug = cleanOtaSlug(otaName);
  const origOtaSlug = originalOta ? cleanOtaSlug(originalOta) : '';

  // 1. If the user pasted a link for this specific OTA, forward directly to it
  //    with OTA-specific date and affiliate parameters.
  if (originalUrl && origOtaSlug === otaSlug) {
    try {
      const url = new URL(originalUrl);
      // Strip all tracking/session state; rebuild with only essential params
      const cleanUrl = new URL(url.origin + url.pathname);

      if (otaSlug === 'booking') {
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
      } else if (otaSlug === 'trip' || otaSlug === 'ctrip') {
        cleanUrl.searchParams.set('checkIn', checkin);
        cleanUrl.searchParams.set('checkOut', checkout);
        cleanUrl.searchParams.set('room', '1');
        cleanUrl.searchParams.set('adult', String(guests || 2));
        cleanUrl.searchParams.set('allianceid', 'rateradar');
      } else if (otaSlug === 'hotels') {
        cleanUrl.searchParams.set('startDate', checkin);
        cleanUrl.searchParams.set('endDate', checkout);
        cleanUrl.searchParams.set('rooms', '1');
        cleanUrl.searchParams.set('adults', String(guests || 2));
      } else if (otaSlug === 'goibibo') {
        cleanUrl.searchParams.set('checkin', checkin.replace(/-/g, ''));
        cleanUrl.searchParams.set('checkout', checkout.replace(/-/g, ''));
        cleanUrl.searchParams.set('rooms', '1');
        cleanUrl.searchParams.set('adults', String(guests || 2));
      } else {
        // Generic: append standard checkin/checkout + affiliate tag
        cleanUrl.searchParams.set('checkin', checkin);
        cleanUrl.searchParams.set('checkout', checkout);
        cleanUrl.searchParams.set('aff', 'rateradar');
      }
      return cleanUrl.toString();
    } catch (e) {
      console.warn('Failed to parse original URL for OTA forwarding, using fallback search.');
    }
  }

  // 2. Fallback search routing — sends user to a pre-filled hotel search page
  if (otaSlug === 'booking') {
    return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotelName)}&checkin=${checkin}&checkout=${checkout}&group_adults=${guests}&no_rooms=1&aid=rateradar20`;
  }

  if (otaSlug === 'agoda') {
    if (hotelKey && /^\d+$/.test(hotelKey)) {
      return `https://www.agoda.com/en-gb/hotel/city/${hotelKey}.html?checkIn=${checkin}&checkOut=${checkout}&rooms=1&adults=${guests}&cid=rateradar_cid`;
    }
    return `https://www.agoda.com/en-gb/search?ss=${encodeURIComponent(hotelName)}&checkIn=${checkin}&checkOut=${checkout}&rooms=1&adults=${guests}&cid=rateradar_cid`;
  }

  if (otaSlug === 'makemytrip') {
    const mmtIn = toMMDDYYYY(checkin);
    const mmtOut = toMMDDYYYY(checkout);
    return `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${mmtIn}&checkout=${mmtOut}&searchText=${encodeURIComponent(hotelName)}&roomStayQualifier=${guests}e0e&affiliateId=rateradar`;
  }

  if (otaSlug === 'expedia') {
    if (hotelKey && /^\d+$/.test(hotelKey)) {
      return `https://www.expedia.com/h${hotelKey}.Hotel-Information?startDate=${checkin}&endDate=${checkout}&d1=${checkin}&d2=${checkout}&rooms=1&adults=${guests}`;
    }
    return `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(hotelName)}&startDate=${checkin}&endDate=${checkout}&d1=${checkin}&d2=${checkout}&rooms=1&adults=${guests}`;
  }

  if (otaSlug === 'trip' || otaSlug === 'ctrip') {
    return `https://www.trip.com/hotels/list?searchWord=${encodeURIComponent(hotelName)}&checkIn=${checkin}&checkOut=${checkout}&room=1&adult=${guests}&allianceid=rateradar`;
  }

  if (otaSlug === 'hotels') {
    return `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(hotelName)}&q-check-in=${checkin}&q-check-out=${checkout}&q-rooms=1&q-room-0-adults=${guests}`;
  }

  if (otaSlug === 'trivago') {
    return `https://www.trivago.com/search?search%5Bquery%5D=${encodeURIComponent(hotelName)}&search%5BcheckinDay%5D=${checkin}&search%5BcheckoutDay%5D=${checkout}`;
  }

  if (otaSlug === 'goibibo') {
    return `https://www.goibibo.com/hotels/hotels-in-search/?searchtext=${encodeURIComponent(hotelName)}&checkin=${checkin.replace(/-/g, '')}&checkout=${checkout.replace(/-/g, '')}&adults=${guests}&children=0&rooms=1`;
  }

  // Universal fallback: Google search for the hotel on the specific OTA
  return `https://www.google.com/search?q=${encodeURIComponent(hotelName + ' ' + otaName + ' hotel booking')}`;
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

// OTA canonical codes and display details mapping
const OTA_DETAILS = {
  booking: { name: 'Booking.com', code: 'BookingCom' },
  agoda: { name: 'Agoda', code: 'Agoda' },
  trip: { name: 'Trip.com', code: 'TripCom' },
  expedia: { name: 'Expedia', code: 'Expedia' },
  makemytrip: { name: 'MakeMyTrip', code: 'MakeMyTrip' },
  goibibo: { name: 'Goibibo', code: 'Goibibo' },
  hotels: { name: 'Hotels.com', code: 'Hotels' },
  trivago: { name: 'Trivago', code: 'Trivago' }
};

function getCanonicalOta(name, code) {
  const n = (name || '').toLowerCase();
  const c = (code || '').toLowerCase();
  
  if (n.includes('booking') || c.includes('booking')) return 'booking';
  if (n.includes('agoda') || c.includes('agoda')) return 'agoda';
  if (n.includes('trip') || c.includes('trip') || n.includes('ctrip') || c.includes('ctrip')) return 'trip';
  if (n.includes('expedia') || c.includes('expedia')) return 'expedia';
  if (n.includes('makemytrip') || c.includes('makemytrip') || n.includes('mmt') || c.includes('mmt')) return 'makemytrip';
  if (n.includes('goibibo') || c.includes('goibibo')) return 'goibibo';
  if (n.includes('yatra') || c.includes('yatra')) return 'yatra';
  if (n.includes('cleartrip') || c.includes('cleartrip')) return 'cleartrip';
  if (n.includes('easemytrip') || c.includes('easemytrip')) return 'easemytrip';
  if (n.includes('hotels.com') || n.includes('hotels') || c.includes('hotels')) return 'hotels';
  if (n.includes('trivago') || c.includes('trivago')) return 'trivago';
  
  return cleanOtaSlug(name) || code || 'generic';
}

function estimateBasePriceFromHotelName(hotelName) {
  const nameLower = (hotelName || '').toLowerCase();
  if (
    nameLower.includes('taj') ||
    nameLower.includes('palace') ||
    nameLower.includes('ritz') ||
    nameLower.includes('leela') ||
    nameLower.includes('oberoi') ||
    nameLower.includes('marriott') ||
    nameLower.includes('hyatt') ||
    nameLower.includes('hilton') ||
    nameLower.includes('sheraton') ||
    nameLower.includes('westin') ||
    nameLower.includes('kempinski')
  ) {
    return 120; // Ultra-Luxury (~₹10,000 INR)
  }
  if (
    nameLower.includes('villa') ||
    nameLower.includes('resort') ||
    nameLower.includes('spa') ||
    nameLower.includes('heritage') ||
    nameLower.includes('haveli') ||
    nameLower.includes('beach') ||
    nameLower.includes('boutique') ||
    nameLower.includes('manor') ||
    nameLower.includes('castle')
  ) {
    return 55; // Premium (~₹4,500 INR)
  }
  if (
    nameLower.includes('oyo') ||
    nameLower.includes('treebo') ||
    nameLower.includes('fabhotel') ||
    nameLower.includes('inn') ||
    nameLower.includes('pride') ||
    nameLower.includes('hostel') ||
    nameLower.includes('stay') ||
    nameLower.includes('budget') ||
    nameLower.includes('guesthouse') ||
    nameLower.includes('motel') ||
    nameLower.includes('lodge')
  ) {
    return 15; // Budget (~₹1,250 INR)
  }
  return 42; // Standard (~₹3,500 INR)
}

// Main API call function
export async function fetchHotelRates(hotelName, hotelKey = '', checkin, checkout, originalUrl = '', originalOta = '', guests = 2, currencyCode = 'USD', exchangeRates = FALLBACK_RATES) {
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
          `/api/rates?hotel_key=${resolvedKey}&chk_in=${checkin}&chk_out=${checkout}&currency=${currencyCode}`
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
            `https://data.xotelo.com/api/rates?hotel_key=${resolvedKey}&chk_in=${checkin}&chk_out=${checkout}&currency=${currencyCode}`
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

            // 1. Group rates by canonical OTA name and keep the lowest rate for each OTA
            const groupedRatesMap = {};
            validRates.forEach(r => {
              const canonical = getCanonicalOta(r.name, r.code);
              const rateVal = parseFloat(r.rate);
              if (!groupedRatesMap[canonical] || rateVal < parseFloat(groupedRatesMap[canonical].rate)) {
                groupedRatesMap[canonical] = r;
              }
            });
            const uniqueRates = Object.values(groupedRatesMap);

            // 2. Parse price from original URL if available
            const urlPriceData = extractPriceFromUrl(originalUrl);

            // 3. Format API rates into standard UI model, overriding the pasted OTA's price if available
            return uniqueRates.map(r => {
              const canonical = getCanonicalOta(r.name, r.code);
              const otaDetail = OTA_DETAILS[canonical] || { name: r.name, code: r.code || r.name.replace(/\s+/g, '') };

              let rateVal = parseFloat(r.rate);
              let taxesVal = r.tax ? parseFloat(r.tax) : Math.round(rateVal * 0.12 * 100) / 100;
              
              const apiCurrency = ratesData.result.currency || 'USD';
              
              // Override price logic using the canonical OTA name matching originalOta
              const isMatch = canonical === cleanOtaSlug(originalOta);
              if (isMatch && urlPriceData) {
                const priceInUSD = urlPriceData.price / (exchangeRates[urlPriceData.currency] || FALLBACK_RATES[urlPriceData.currency] || 1);
                const priceInApiCurrency = priceInUSD * (exchangeRates[apiCurrency] || FALLBACK_RATES[apiCurrency] || 1);
                
                // If URL price is the total stay price, divide by nights to get rate/night.
                // Choose tax rate: 18% if API currency is INR, otherwise 12%
                const taxRate = apiCurrency === 'INR' ? 0.18 : 0.12;
                const totalPerNight = priceInApiCurrency / nights;
                rateVal = totalPerNight / (1 + taxRate);
                taxesVal = totalPerNight - rateVal;
              }

              // Since the UI converts from USD to target currency, we MUST return rates in USD!
              const apiToUSDRate = exchangeRates[apiCurrency] || FALLBACK_RATES[apiCurrency] || 1;
              const rateValUSD = rateVal / apiToUSDRate;
              const taxesValUSD = taxesVal / apiToUSDRate;

              // Build the affiliate link
              const deeplink = buildOtaLink(
                otaDetail.code,
                otaDetail.name,
                hotelName,
                resolvedKey,
                checkin,
                checkout,
                originalUrl,
                originalOta,
                guests
              );

              return {
                code: otaDetail.code,
                name: otaDetail.name,
                rate: rateValUSD,
                taxes: taxesValUSD,
                total: Math.round((rateValUSD + taxesValUSD) * nights * 100) / 100,
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

  // Fallback rates generator (runs if live API rates are missing or failed)
  const start = new Date(checkin);
  const end = new Date(checkout);
  const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  let totalStayInUSD = 0;
  const urlPriceData = extractPriceFromUrl(originalUrl);
  if (urlPriceData) {
    const { price, currency: urlCurrency } = urlPriceData;
    // Convert total stay price to USD base price using exchangeRates
    totalStayInUSD = price / (exchangeRates[urlCurrency] || FALLBACK_RATES[urlCurrency] || 1);
  } else {
    // Estimate price based on hotel name category if no URL price exists
    let pricePerNightUSD = estimateBasePriceFromHotelName(hotelName);
    // Apply a deterministic hash variation (+/- 10%) based on hotel name
    let hash = 0;
    for (let i = 0; i < hotelName.length; i++) {
      hash = hotelName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const variation = (Math.abs(hash) % 21 - 10) / 100; // -10% to +10%
    pricePerNightUSD = pricePerNightUSD * (1 + variation);
    totalStayInUSD = pricePerNightUSD * nights;
  }

  // Generate comparison rates relative to the estimated or extracted price
  const otas = [
    { code: 'Agoda', name: 'Agoda', multiplier: 0.96, rating: 4.6 },
    { code: 'BookingCom', name: 'Booking.com', multiplier: 1.0, rating: 4.7 },
    { code: 'TripCom', name: 'Trip.com', multiplier: 0.97, rating: 4.5 },
    { code: 'MakeMyTrip', name: 'MakeMyTrip', multiplier: 1.01, rating: 4.4 },
    { code: 'Expedia', name: 'Expedia', multiplier: 1.03, rating: 4.5 }
  ];

  console.info(`Serving comparison rates using fallback price: ${totalStayInUSD} USD`);

  return otas.map(ota => {
    // Apply multiplier to the total stay price per night in USD
    const totalPerNight = (totalStayInUSD * ota.multiplier) / nights;
    
    // Breakdown into base rate and tax (assuming 18% tax for INR, 12% others)
    const taxRate = currencyCode === 'INR' ? 0.18 : 0.12;
    const rateVal = totalPerNight / (1 + taxRate);
    const taxesVal = totalPerNight - rateVal;

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
