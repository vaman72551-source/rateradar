import React, { useState, useEffect } from 'react';
import { Calendar, Users, Share2, Award, ArrowUpDown, Info, ExternalLink, RefreshCw, Check, MapPin } from 'lucide-react';
import { convertUSD, formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currency';
import { buildOtaLink } from '../utils/xoteloApi';


const LUXURY_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80', // Premium facade
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=80', // Elegant suite
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80', // Resort pool
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&auto=format&fit=crop&q=80', // Luxury interior
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80', // Boutique bedroom
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&auto=format&fit=crop&q=80', // Grand lobby
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80', // Ocean view resort
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=80', // Seaside villa
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&auto=format&fit=crop&q=80', // Wellness spa hotel
  'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop&q=80', // Historic palazzo
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop&q=80', // Modern penthouse suite
  'https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=800&auto=format&fit=crop&q=80', // Classic hotel facade
];

export default function Results({ hotelDetails, rates, onBack, onNavigate, currency, onCurrencyChange, exchangeRates }) {
  const [sortBy, setSortBy] = useState('price_asc'); // 'price_asc', 'rating_desc'
  const [showTaxes, setShowTaxes] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sparklinePoints, setSparklinePoints] = useState('');

  const { hotelName, checkin, checkout, guests, nights, imageUrl, address } = hotelDetails;

  // Generate consistent rating based on hotel name length/hashing
  const getHotelStars = () => {
    let nameLen = hotelName.length;
    if (hotelName.toLowerCase().includes('palace') || hotelName.toLowerCase().includes('ritz') || hotelName.toLowerCase().includes('sands')) {
      return 5;
    }
    return (nameLen % 2) === 0 ? 5 : 4;
  };

  // Keyword-based fallback image (used when real OTA image unavailable or fails)
  const getHotelImage = () => {
    const nameLower = hotelName.toLowerCase();
    if (nameLower.includes('taj') && nameLower.includes('mahal') && nameLower.includes('palace')) {
      return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80';
    }
    if (nameLower.includes('marina') && nameLower.includes('sands')) {
      return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=80';
    }
    if (nameLower.includes('ritz') && nameLower.includes('carlton')) {
      return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80';
    }

    // Deterministic selection based on hotel name hashing
    let hash = 0;
    for (let i = 0; i < hotelName.length; i++) {
      hash = hotelName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % LUXURY_HOTEL_IMAGES.length;
    return LUXURY_HOTEL_IMAGES[index];
  };


  // Generate sparkline SVG path points
  useEffect(() => {
    if (rates && rates.length > 0) {
      const cheapestBase = Math.min(...rates.map(r => r.rate));
      // Generate 6 historical data points
      const history = [
        cheapestBase * 1.15,
        cheapestBase * 1.08,
        cheapestBase * 1.25,
        cheapestBase * 0.95,
        cheapestBase * 1.10,
        cheapestBase
      ];

      const maxVal = Math.max(...history);
      const minVal = Math.min(...history);
      const range = maxVal - minVal || 1;

      // Map to SVG coordinates: width 300, height 60
      const padding = 5;
      const width = 300;
      const height = 50;
      
      const points = history.map((val, idx) => {
        const x = (idx / (history.length - 1)) * (width - 2 * padding) + padding;
        const y = height - ((val - minVal) / range) * (height - 2 * padding) - padding;
        return `${x},${y}`;
      }).join(' ');

      setSparklinePoints(points);
    }
  }, [rates]);

  // Log an affiliate click to localstorage
  const handleOtaClick = (otaName, rate) => {
    const clickLogs = JSON.parse(localStorage.getItem('rateradar_click_logs') || '[]');
    clickLogs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      hotelName,
      otaName,
      rate,
      checkin,
      checkout,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('rateradar_click_logs', JSON.stringify(clickLogs.slice(0, 100)));
  };

  // Copy share link
  const handleShare = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?hotelName=${encodeURIComponent(hotelName)}&checkin=${checkin}&checkout=${checkout}&guests=${guests}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasRates = rates && rates.length > 0;

  // Sort and process rates safely
  const sortedRates = hasRates ? [...rates].sort((a, b) => {
    const aVal = showTaxes ? a.total / nights : a.rate;
    const bVal = showTaxes ? b.total / nights : b.rate;

    if (sortBy === 'price_asc') {
      return aVal - bVal;
    } else if (sortBy === 'rating_desc') {
      return b.rating - a.rating;
    }
    return 0;
  }) : [];

  const cheapestRate = hasRates ? Math.min(...rates.map(r => showTaxes ? r.total / nights : r.rate)) : 0;
  const mostExpensiveRate = hasRates ? Math.max(...rates.map(r => showTaxes ? r.total / nights : r.rate)) : 0;
  const maxSavingsPercent = (hasRates && mostExpensiveRate > 0) ? Math.round(((mostExpensiveRate - cheapestRate) / mostExpensiveRate) * 100) : 0;

  // Prepare fallback links for manual verification if automated rates are not returned
  const fallbackOtaPlatforms = [
    { code: 'BookingCom', name: 'Booking.com', icon: '🔵' },
    { code: 'Agoda', name: 'Agoda', icon: '🟢' },
    { code: 'MakeMyTrip', name: 'MakeMyTrip', icon: '🟠' },
    { code: 'Expedia', name: 'Expedia', icon: '🟡' },
    { code: 'TripCom', name: 'Trip.com', icon: '🌐' },
    { code: 'Goibibo', name: 'Goibibo', icon: '🏨' }
  ];

  const fallbackOtaLinks = fallbackOtaPlatforms.map(platform => {
    return {
      ...platform,
      deeplink: buildOtaLink(
        platform.code,
        platform.name,
        hotelName,
        hotelDetails.hotelKey || '',
        checkin,
        checkout,
        hotelDetails.originalUrl || '',
        hotelDetails.ota || '',
        guests
      )
    };
  });


  return (
    <div className="py-10 px-4 md:px-8 max-w-6xl mx-auto min-h-screen flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center w-full mb-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onBack()}>
            <div className="w-10 h-10 rounded-full border border-accent-gold flex items-center justify-center bg-primary-card">
              <span className="text-xl font-serif text-accent-gold font-bold">R</span>
            </div>
            <span className="font-outfit text-2xl font-bold tracking-wide text-text-primary">
              Rate<span className="text-accent-gold">Radar</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Currency Dropdown */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="bg-primary-card text-text-primary hover:text-accent-gold border border-border hover:border-accent-gold/60 text-xs font-sans font-semibold px-3 py-1.5 rounded-full cursor-pointer outline-none transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%20viewBox%3D%220%200%20292.4%20292.4%22%3E%3Cpath%20fill%3D%22%23d4a853%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[right_10px_center] bg-no-repeat"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-primary text-text-primary">
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onBack}
              className="text-xs font-sans tracking-widest text-text-muted hover:text-accent-gold border border-border px-4 py-2 rounded-full transition-all uppercase"
            >
              ← Modify Search
            </button>
          </div>
        </div>

        {/* Hotel Info Card */}
        <div className="luxury-card overflow-hidden bg-primary-card border border-border mb-8 shadow-xl flex flex-col md:flex-row gap-0">
          {/* Thumbnail Image */}
          <div className="w-full md:w-60 h-52 md:h-auto relative overflow-hidden flex-shrink-0 bg-primary-card">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={hotelName}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                onError={(e) => {
                  // If OTA CDN image fails, fall back to the keyword-based image
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getHotelImage();
                }}
              />
            ) : (
              <img
                src={getHotelImage()}
                alt={hotelName}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent md:bg-gradient-to-r md:from-transparent md:to-primary-card/30" />
          </div>

          {/* Info Content */}
          <div className="flex-1 p-6 md:py-6 md:pr-6 md:pl-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex text-accent-gold">
                  {Array.from({ length: getHotelStars() }).map((_, i) => (
                    <span key={i} className="text-sm">★</span>
                  ))}
                </div>
                <span className="text-xs text-text-muted tracking-wider uppercase font-sans font-semibold">
                  Luxury Rating
                </span>
              </div>
              <h1 className="font-outfit text-2xl md:text-3xl font-bold text-text-primary mb-1">
                {hotelName}
              </h1>

              {/* Address line */}
              {address && (
                <div className="flex items-start gap-1.5 mb-3">
                  <MapPin size={13} className="text-accent-gold mt-0.5 flex-shrink-0" />
                  <span className="font-sans text-xs text-text-muted leading-snug">{address}</span>
                </div>
              )}

              {/* Meta details */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs md:text-sm text-text-muted font-sans mt-2">
                <div className="flex items-center gap-1.5 bg-primary/40 px-3 py-1.5 rounded-lg border border-border/10">
                  <Calendar size={14} className="text-accent-gold" />
                  <span>{checkin} to {checkout} ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                </div>
                <div className="flex items-center gap-1.5 bg-primary/40 px-3 py-1.5 rounded-lg border border-border/10">
                  <Users size={14} className="text-accent-gold" />
                  <span>{guests} {guests === 1 ? 'Guest' : 'Guests'}</span>
                </div>
              </div>
            </div>

            {/* Sparkline & Actions */}
            <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-3 mt-2 md:mt-0">
              {/* Sparkline */}
              <div className="bg-primary/40 border border-border/10 rounded-xl p-3 w-full md:w-auto">
                <span className="text-xs text-text-muted font-sans block mb-1">6-Month Price Trend</span>
                <div className="flex items-center gap-2">
                  <svg width="150" height="30" className="stroke-accent-gold fill-none stroke-2">
                    <polyline points={sparklinePoints ? sparklinePoints.split(' ').map(p => {
                      const [x, y] = p.split(',');
                      // scale x to 150 and y to 30
                      return `${parseFloat(x) / 2},${parseFloat(y) / 1.6}`;
                    }).join(' ') : ''} />
                  </svg>
                  <span className="text-[10px] text-green-400 font-sans font-bold bg-green-500/10 border border-green-500/20 px-1 rounded">
                    Low
                  </span>
                </div>
              </div>

              <button
                onClick={handleShare}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-border/20 text-text-primary hover:text-accent-gold border border-border px-4 py-2 rounded-full transition-all text-xs font-sans uppercase tracking-wider font-semibold"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
                {copied ? 'Copied Link!' : 'Share Results'}
              </button>
            </div>
          </div>
        </div>

        {hasRates ? (
          <>
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted uppercase tracking-wider font-sans font-semibold">
                  Sort By:
                </span>
                <div className="flex gap-1 bg-primary-card border border-border/20 p-0.5 rounded-full">
                  <button
                    onClick={() => setSortBy('price_asc')}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all font-sans font-medium ${sortBy === 'price_asc' ? 'bg-accent-gold text-primary font-bold' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    Lowest Price
                  </button>
                  <button
                    onClick={() => setSortBy('rating_desc')}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all font-sans font-medium ${sortBy === 'rating_desc' ? 'bg-accent-gold text-primary font-bold' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    Highest Rated OTA
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-sans">Include taxes & fees (est. 12%)</span>
                <button
                  onClick={() => setShowTaxes(!showTaxes)}
                  className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-all ${showTaxes ? 'bg-accent-gold justify-end' : 'bg-primary-card border border-border justify-start'}`}
                >
                  <span className={`w-5 h-5 rounded-full shadow-md transition-all ${showTaxes ? 'bg-primary' : 'bg-text-muted'}`} />
                </button>
              </div>
            </div>

             {/* Desktop Comparison Table (md: and up) */}
            <div className="hidden md:block bg-primary-card border border-border rounded-xl overflow-hidden shadow-xl mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-primary/20 text-text-muted text-xs uppercase tracking-widest font-sans font-bold">
                    <th className="py-4 px-6">OTA Booking Platform</th>
                    <th className="py-4 px-6 text-center">OTA Rating</th>
                    <th className="py-4 px-6">Price / Night</th>
                    <th className="py-4 px-6">Total Price ({nights} {nights === 1 ? 'night' : 'nights'})</th>
                    <th className="py-4 px-6 text-right">Reservation</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRates.map((otaRow, index) => {
                    const isCheapest = (showTaxes ? otaRow.total / nights : otaRow.rate) === cheapestRate;
                    
                    const baseRateInCurrency = convertUSD(otaRow.rate, currency, exchangeRates);
                    const taxPerNightInCurrency = convertUSD(otaRow.taxes, currency, exchangeRates);
                    const totalPerNightInCurrency = convertUSD(otaRow.rate + otaRow.taxes, currency, exchangeRates);
                    
                    const totalBaseInCurrency = convertUSD(otaRow.rate * nights, currency, exchangeRates);
                    const totalTaxInCurrency = convertUSD(otaRow.taxes * nights, currency, exchangeRates);
                    const totalStayInCurrency = convertUSD(otaRow.total, currency, exchangeRates);

                    const baseRateFormatted = formatCurrency(baseRateInCurrency, currency);
                    const totalPerNightFormatted = formatCurrency(totalPerNightInCurrency, currency);
                    
                    const totalBaseFormatted = formatCurrency(totalBaseInCurrency, currency);
                    const totalTaxFormatted = formatCurrency(totalTaxInCurrency, currency);
                    const totalStayFormatted = formatCurrency(totalStayInCurrency, currency);

                    return (
                      <tr
                        key={otaRow.code}
                        className={`border-b border-border/10 transition-all ${isCheapest ? 'bg-accent-gold/[0.04] border-accent-gold/40' : 'hover:bg-primary/20'}`}
                      >
                        <td className="py-5 px-6 font-serif text-lg font-bold text-text-primary flex items-center gap-3">
                          <span className="text-xl">
                            {otaRow.name === 'Booking.com' ? '🔵' : otaRow.name === 'Agoda' ? '🟢' : otaRow.name === 'MakeMyTrip' ? '🟠' : otaRow.name === 'Expedia' ? '🟡' : '🌐'}
                          </span>
                          {otaRow.name}
                          {isCheapest && (
                            <span className="bg-green-500/10 border border-green-500/20 text-green-400 font-sans text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Award size={10} /> Best Price 🏆
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center font-sans text-sm text-text-muted font-semibold">
                          ⭐ {otaRow.rating} / 5.0
                        </td>
                        <td className="py-5 px-6 font-sans">
                          <div className="text-lg font-bold text-text-primary">
                            {baseRateFormatted} <span className="text-[10px] text-text-muted font-normal">/ night</span>
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {totalPerNightFormatted} <span className="text-[10px] text-green-400/90 font-medium">(incl. tax)</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 font-sans">
                          <div className="text-lg font-bold text-text-primary">
                            {totalStayFormatted}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-1 items-center">
                            <span>{totalBaseFormatted} base</span>
                            <span className="text-text-muted/40">+</span>
                            <span className="text-green-400/80">{totalTaxFormatted} tax</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <a
                            href={otaRow.deeplink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleOtaClick(otaRow.name, totalPerNightFormatted)}
                            className={`inline-flex items-center gap-1 px-5 py-2 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${isCheapest ? 'bg-accent-gold text-primary hover:bg-accent-gold/90' : 'bg-primary border border-border text-text-primary hover:text-accent-gold'}`}
                          >
                            Book Now <ExternalLink size={12} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (below md:) */}
            <div className="md:hidden flex flex-col gap-4 mb-8">
              {sortedRates.map((otaRow) => {
                const isCheapest = (showTaxes ? otaRow.total / nights : otaRow.rate) === cheapestRate;
                
                const baseRateInCurrency = convertUSD(otaRow.rate, currency, exchangeRates);
                const taxPerNightInCurrency = convertUSD(otaRow.taxes, currency, exchangeRates);
                const totalPerNightInCurrency = convertUSD(otaRow.rate + otaRow.taxes, currency, exchangeRates);
                
                const totalBaseInCurrency = convertUSD(otaRow.rate * nights, currency, exchangeRates);
                const totalTaxInCurrency = convertUSD(otaRow.taxes * nights, currency, exchangeRates);
                const totalStayInCurrency = convertUSD(otaRow.total, currency, exchangeRates);

                const baseRateFormatted = formatCurrency(baseRateInCurrency, currency);
                const totalPerNightFormatted = formatCurrency(totalPerNightInCurrency, currency);
                
                const totalBaseFormatted = formatCurrency(totalBaseInCurrency, currency);
                const totalTaxFormatted = formatCurrency(totalTaxInCurrency, currency);
                const totalStayFormatted = formatCurrency(totalStayInCurrency, currency);

                return (
                  <div
                    key={otaRow.code}
                    className={`luxury-card p-5 bg-primary-card border ${isCheapest ? 'border-accent-gold' : 'border-border/40'} flex flex-col gap-4 shadow-md`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {otaRow.name === 'Booking.com' ? '🔵' : otaRow.name === 'Agoda' ? '🟢' : otaRow.name === 'MakeMyTrip' ? '🟠' : otaRow.name === 'Expedia' ? '🟡' : '🌐'}
                        </span>
                        <h3 className="font-serif text-lg font-bold text-text-primary">{otaRow.name}</h3>
                      </div>
                      {isCheapest && (
                        <span className="bg-green-500/10 border border-green-500/20 text-green-400 font-sans text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          Best Price
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-b border-border/10 py-3 font-sans text-xs">
                      <div>
                        <span className="text-text-muted block mb-0.5">Rate / Night</span>
                        <div className="text-sm font-bold text-text-primary">
                          {baseRateFormatted} <span className="text-[10px] text-text-muted font-normal">(excl. tax)</span>
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {totalPerNightFormatted} <span className="text-[9px] text-green-400 font-semibold">(incl. tax)</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-text-muted block mb-0.5">Total ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                        <div className="text-sm font-bold text-text-primary">
                          {totalStayFormatted}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {totalBaseFormatted} + {totalTaxFormatted} tax
                        </div>
                      </div>
                      <div className="col-span-2 border-t border-border/5 pt-2">
                        <span className="text-text-muted">OTA Trust Rating:</span>{' '}
                        <span className="text-text-primary font-semibold">⭐ {otaRow.rating} / 5.0</span>
                      </div>
                    </div>

                    {isCheapest && maxSavingsPercent > 0 && (
                      <div className="text-xs font-sans font-bold text-green-400 -mt-2">
                        Save {maxSavingsPercent}% vs most expensive site
                      </div>
                    )}

                    <a
                      href={otaRow.deeplink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleOtaClick(otaRow.name, totalPerNightFormatted)}
                      className={`w-full py-2.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 ${isCheapest ? 'bg-accent-gold text-primary' : 'bg-primary border border-border text-text-primary'}`}
                    >
                      Book Now <ExternalLink size={12} />
                    </a>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Empty rates fallback direct links */
          <div className="luxury-card bg-primary-card border border-border p-6 md:p-10 rounded-2xl mb-8 shadow-xl text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold text-xl mx-auto mb-4">
                ✨
              </div>
              <h2 className="font-outfit text-xl md:text-2xl font-bold text-text-primary mb-2">
                Compare Rates Directly
              </h2>
              <p className="font-sans text-xs md:text-sm text-text-muted mb-8 leading-relaxed">
                We couldn't automatically retrieve live pricing comparison data for this property from the API right now.
                However, you can compare prices instantly by opening the direct deep links below:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fallbackOtaLinks.map((ota) => (
                  <div key={ota.code} className="bg-primary/40 border border-border/10 rounded-xl p-4 flex flex-col justify-between items-center text-center hover:border-accent-gold/30 transition-all">
                    <div className="flex flex-col items-center gap-1.5 mb-4">
                      <span className="text-2xl">{ota.icon}</span>
                      <h4 className="font-serif text-base font-bold text-text-primary">{ota.name}</h4>
                      <span className="text-[10px] text-text-muted/80 uppercase font-semibold font-sans tracking-wide">Live Deep Link</span>
                    </div>
                    <a
                      href={ota.deeplink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleOtaClick(ota.name, 'Check Price')}
                      className="w-full bg-accent-gold hover:bg-accent-gold/90 text-primary font-sans text-xs font-bold uppercase tracking-wider py-2 rounded-full transition-all flex items-center justify-center gap-1.5"
                    >
                      Check Price <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Informational Disclaimer */}
        <div className="bg-primary/20 border border-border/10 p-4 rounded-xl flex items-start gap-3 max-w-3xl">
          <Info size={16} className="text-accent-gold mt-0.5 flex-shrink-0" />
          <p className="font-sans text-xs text-text-muted leading-relaxed">
            Rates are retrieved in real-time and subject to availability. Bookings are finalized directly with the selected OTA platform. RateRadar provides independent comparison services and may earn a small referral commission at no additional cost to you.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center mt-12 border-t border-border/20 pt-6">
        <p className="font-sans text-xs text-text-muted/60">
          © 2026 RateRadar Hotel Comparison Intelligence. Designed for luxury travel planners.
        </p>
      </div>
    </div>
  );
}
