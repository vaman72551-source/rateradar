import React, { useState, useEffect } from 'react';
import { Search, Compass, Shield, Zap, History, ExternalLink, AlertCircle } from 'lucide-react';
import { parseHotelUrl } from '../utils/urlParser';

const EXAMPLE_URLS = [
  {
    name: 'Taj Mahal Palace, Mumbai',
    url: 'https://www.booking.com/hotel/in/taj-mahal-palace.html?checkin=2026-06-15&checkout=2026-06-18&guests=2'
  },
  {
    name: 'Marina Bay Sands, Singapore',
    url: 'https://www.agoda.com/marina-bay-sands/hotel/singapore-sg.html?checkin=2026-07-10&checkout=2026-07-12'
  },
  {
    name: 'The Ritz-Carlton, Kyoto',
    url: 'https://www.expedia.com/Kyoto-Hotels-The-Ritz-Carlton-Kyoto.h6812854.Hotel-Information?startDate=2026-08-05&endDate=2026-08-10'
  }
];

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

import { SUPPORTED_CURRENCIES } from '../utils/currency';

export default function Home({ onSearch, onNavigate, currency, onCurrencyChange }) {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  // Date selection modal states
  const [showDateModal, setShowDateModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalCheckin, setModalCheckin] = useState('');
  const [modalCheckout, setModalCheckout] = useState('');
  const [modalGuests, setModalGuests] = useState(2);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    // Load recent searches
    const stored = localStorage.getItem('rateradar_recents');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        setRecentSearches([]);
      }
    }

    // Log traffic
    const visits = parseInt(localStorage.getItem('rateradar_visits') || '0', 10);
    localStorage.setItem('rateradar_visits', String(visits + 1));
  }, []);

  const executeSearch = (parsed) => {
    // Save to recents
    const searchItem = {
      hotelName: parsed.hotelName,
      checkin: parsed.checkin,
      checkout: parsed.checkout,
      guests: parsed.guests,
      ota: parsed.ota,
      url: urlInput.trim()
    };

    const existing = [...recentSearches];
    const filtered = existing.filter(item => item.hotelName.toLowerCase() !== parsed.hotelName.toLowerCase());
    const updated = [searchItem, ...filtered].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('rateradar_recents', JSON.stringify(updated));

    // Save search log for admin
    const searchLogs = JSON.parse(localStorage.getItem('rateradar_search_logs') || '[]');
    searchLogs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      hotelName: parsed.hotelName,
      checkin: parsed.checkin,
      checkout: parsed.checkout,
      ota: parsed.ota,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('rateradar_search_logs', JSON.stringify(searchLogs.slice(0, 100)));

    onSearch(parsed);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Please paste a hotel booking URL to start comparison.');
      return;
    }

    const parsed = parseHotelUrl(urlInput);
    if (!parsed) {
      setErrorMsg('Please paste a valid hotel booking URL (e.g., from Booking.com, MakeMyTrip, Agoda, Expedia).');
      return;
    }

    setErrorMsg('');

    if (!parsed.datesExtracted) {
      // Prompt user for check-in/check-out dates
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      setModalCheckin(formatDate(today));
      setModalCheckout(formatDate(tomorrow));
      setModalGuests(parsed.guests || 2);
      setModalData(parsed);
      setModalError('');
      setShowDateModal(true);
    } else {
      executeSearch(parsed);
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!modalCheckin || !modalCheckout) {
      setModalError('Please specify both check-in and check-out dates.');
      return;
    }

    const start = new Date(modalCheckin);
    const end = new Date(modalCheckout);
    if (end <= start) {
      setModalError('Check-out date must be after check-in date.');
      return;
    }

    setModalError('');
    setShowDateModal(false);

    const updatedParsed = {
      ...modalData,
      checkin: modalCheckin,
      checkout: modalCheckout,
      guests: modalGuests,
      nights: Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24))),
      datesExtracted: true
    };

    executeSearch(updatedParsed);
  };

  const handleExampleClick = (url) => {
    setUrlInput(url);
    setErrorMsg('');
  };

  const handleRecentClick = (item) => {
    setUrlInput(item.url);
    const parsed = parseHotelUrl(item.url);
    if (parsed) {
      // Check if dates are already present in localStorage item
      if (!parsed.datesExtracted && item.checkin && item.checkout) {
        parsed.checkin = item.checkin;
        parsed.checkout = item.checkout;
        parsed.guests = item.guests;
        parsed.datesExtracted = true;
      }

      if (!parsed.datesExtracted) {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        setModalCheckin(formatDate(today));
        setModalCheckout(formatDate(tomorrow));
        setModalGuests(parsed.guests || 2);
        setModalData(parsed);
        setModalError('');
        setShowDateModal(true);
      } else {
        executeSearch(parsed);
      }
    }
  };

  return (
    <div className="min-height-screen flex flex-col justify-between py-12 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full mb-12">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
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
            onClick={() => onNavigate('admin')}
            className="text-xs font-sans tracking-widest text-text-muted hover:text-accent-gold border border-border px-4 py-1.5 rounded-full transition-all uppercase"
          >
            Console
          </button>
        </div>
      </div>

      {/* Main Hero and Search Container */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full my-auto">
        <div className="text-center mb-10">
          <span className="font-sans text-xs tracking-widest text-accent-gold uppercase font-semibold bg-accent-gold/10 px-3 py-1 rounded-full border border-accent-gold/20">
            High-Value Intelligence
          </span>
          <h1 className="font-outfit text-4xl md:text-6xl font-bold text-text-primary mt-4 mb-6 leading-tight max-w-3xl">
            Find the Cheapest Rate for Any Hotel
          </h1>
          <p className="font-sans text-text-muted md:text-lg max-w-2xl mx-auto">
            Paste a booking URL from Booking.com, Agoda, Expedia, or MakeMyTrip. We'll scan 8+ OTAs instantly to find the best price.
          </p>
        </div>

        {/* Input Box */}
        <div className="w-full luxury-card p-6 md:p-8 bg-primary-card border border-border mb-8 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste your hotel link from Booking.com, MakeMyTrip, Agoda, Expedia..."
                rows="3"
                className="w-full bg-primary/60 border border-border focus:border-accent-gold focus:ring-1 focus:ring-accent-gold rounded-xl p-4 text-text-primary placeholder:text-text-muted/60 resize-none outline-none font-sans text-sm md:text-base transition-all"
              />
              <div className="absolute right-4 bottom-4 text-text-muted/40 pointer-events-none">
                <Search size={20} />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-sans px-1">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
              <div className="text-left w-full">
                <span className="text-xs text-text-muted/80 font-sans">
                  💡 We support full link parsing including mobile links.
                </span>
              </div>
              <button
                type="submit"
                className="w-full md:w-auto bg-accent-gold hover:bg-accent-gold/90 text-primary font-bold px-8 py-3 rounded-full font-sans transition-all transform active:scale-95 shadow-md uppercase tracking-wider text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Compare Rates
              </button>
            </div>
          </form>

          {/* Quick Examples */}
          <div className="border-t border-border/40 mt-6 pt-4 flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-xs text-text-muted uppercase tracking-wider font-sans font-semibold">
              Try an Example:
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_URLS.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExampleClick(ex.url)}
                  className="text-xs bg-primary hover:bg-accent-gold/10 text-text-primary hover:text-accent-gold border border-border px-3 py-1.5 rounded-full transition-all flex items-center gap-1 font-sans"
                >
                  {ex.name}
                  <ExternalLink size={10} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-12">
          <div className="flex items-center gap-4 bg-primary-card/50 border border-border/30 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-text-primary">100% Free</h3>
              <p className="font-sans text-xs text-text-muted mt-0.5">No subscription, fees, or hidden markups.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-primary-card/50 border border-border/30 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-text-primary">8+ OTA Providers</h3>
              <p className="font-sans text-xs text-text-muted mt-0.5">Booking.com, Agoda, Expedia, and local OTAs.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-primary-card/50 border border-border/30 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-text-primary">Real-time Scanner</h3>
              <p className="font-sans text-xs text-text-muted mt-0.5">Aggregates rates directly in under 3 seconds.</p>
            </div>
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="w-full text-left">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-accent-gold" />
              <h2 className="font-outfit text-lg font-bold text-text-primary">Recent Searches</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentSearches.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleRecentClick(item)}
                  className="bg-primary-card border border-border/40 hover:border-accent-gold rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <h3 className="font-outfit font-bold text-text-primary text-sm truncate">{item.hotelName}</h3>
                  <div className="flex justify-between items-center mt-2 text-xs text-text-muted font-sans">
                    <span>{item.checkin} to {item.checkout}</span>
                    <span className="bg-accent-gold/10 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/10">
                      {item.ota}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date Picker Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-primary-card border border-accent-gold/40 p-6 md:p-8 rounded-2xl w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <span className="font-sans text-[10px] tracking-widest text-accent-gold uppercase font-bold bg-accent-gold/10 px-2.5 py-1 rounded border border-accent-gold/20">
                Action Required
              </span>
              <h2 className="font-outfit text-xl font-bold text-text-primary mt-2">
                Specify Booking Dates
              </h2>
              <p className="font-sans text-xs text-text-muted mt-1.5 leading-relaxed">
                We successfully detected <span className="text-text-primary font-semibold">{modalData?.hotelName}</span> ({modalData?.ota}), but the link did not contain check-in/check-out dates.
              </p>
            </div>

            <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={modalCheckin}
                    min={formatDate(new Date())}
                    onChange={(e) => setModalCheckin(e.target.value)}
                    className="bg-primary/60 border border-border focus:border-accent-gold rounded-xl px-3 py-2 text-text-primary text-xs font-sans outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={modalCheckout}
                    min={modalCheckin || formatDate(new Date())}
                    onChange={(e) => setModalCheckout(e.target.value)}
                    className="bg-primary/60 border border-border focus:border-accent-gold rounded-xl px-3 py-2 text-text-primary text-xs font-sans outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                  Guests Count
                </label>
                <select
                  value={modalGuests}
                  onChange={(e) => setModalGuests(parseInt(e.target.value, 10))}
                  className="bg-primary/60 border border-border focus:border-accent-gold rounded-xl px-3 py-2 text-text-primary text-xs font-sans outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num} className="bg-primary-card">
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              {modalError && (
                <span className="text-red-400 text-xs font-sans text-center">
                  {modalError}
                </span>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDateModal(false)}
                  className="flex-1 border border-border hover:bg-border/10 text-text-muted hover:text-text-primary py-2 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent-gold hover:bg-accent-gold/90 text-primary py-2 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Compare Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full text-center mt-12 border-t border-border/20 pt-6">
        <p className="font-sans text-xs text-text-muted/60">
          © 2026 RateRadar Hotel Comparison Intelligence. Designed for luxury travel planners.
        </p>
      </div>
    </div>
  );
}
