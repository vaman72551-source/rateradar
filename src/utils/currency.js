export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', locale: 'ja-JP' },
  { code: 'AED', symbol: 'DH', name: 'UAE Dirham (AED)', locale: 'en-AE' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (CAD)', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', locale: 'en-AU' }
];

export const FALLBACK_RATES = {
  USD: 1,
  INR: 83.30,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.50,
  AED: 3.67,
  CAD: 1.37,
  AUD: 1.51
};

let cachedRates = { ...FALLBACK_RATES };

// Timezone to currency mapper
function inferCurrencyFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'INR';
    if (tz.includes('London')) return 'GBP';
    if (tz.includes('Tokyo')) return 'JPY';
    if (tz.includes('Dubai')) return 'AED';
    if (tz.includes('Australia') || tz.includes('Sydney') || tz.includes('Melbourne')) return 'AUD';
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('America/Canada')) return 'CAD';
    if (tz.includes('Europe') || tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid') || tz.includes('Amsterdam') || tz.includes('Brussels') || tz.includes('Vienna')) return 'EUR';
  } catch (e) {
    console.warn("Timezone resolution failed, defaulting to USD");
  }
  return 'USD';
}

// Detect user currency via IP lookup or fallback timezone mapping
export async function detectUserCurrency() {
  // 1. Check local storage first (user manual choice override)
  const saved = localStorage.getItem('rateradar_currency');
  if (saved && SUPPORTED_CURRENCIES.some(c => c.code === saved)) {
    return saved;
  }

  // 2. Fast IP lookup (with a strict timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      const ipCurrency = data.currency;
      if (ipCurrency && SUPPORTED_CURRENCIES.some(c => c.code === ipCurrency)) {
        return ipCurrency;
      }
    }
  } catch (e) {
    console.info("IP-based currency detection timed out or failed. Falling back to timezone mapping.");
  }

  // 3. Timezone mapping fallback
  return inferCurrencyFromTimezone();
}

// Fetch live conversion rates relative to USD
export async function fetchExchangeRates() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const rates = {};
        SUPPORTED_CURRENCIES.forEach(c => {
          if (data.rates[c.code]) {
            rates[c.code] = data.rates[c.code];
          } else {
            rates[c.code] = FALLBACK_RATES[c.code];
          }
        });
        cachedRates = rates;
        console.log("Live exchange rates successfully loaded:", cachedRates);
        return rates;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch live exchange rates. Using cached/fallback rates.");
  }
  return cachedRates;
}

// Convert amount in USD to target currency
export function convertUSD(amountUSD, targetCurrency, rates = cachedRates) {
  const rate = rates[targetCurrency] || FALLBACK_RATES[targetCurrency] || 1;
  return amountUSD * rate;
}

// Format currency amount cleanly according to locale standards
export function formatCurrency(amount, currencyCode) {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  try {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    // Basic fallback string format
    return `${currencyInfo.symbol}${Math.round(amount)}`;
  }
}
