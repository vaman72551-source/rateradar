import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Searching from './components/Searching';
import Results from './components/Results';
import AdminDashboard from './components/AdminDashboard';
import { fetchHotelRates } from './utils/xoteloApi';
import { fetchHotelMeta } from './utils/hotelMeta';
import { detectUserCurrency, fetchExchangeRates, FALLBACK_RATES } from './utils/currency';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'searching', 'results', 'admin'
  const [hotelDetails, setHotelDetails] = useState(null);
  const [rates, setRates] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);

  // Initialize currency and fetch rates on mount
  useEffect(() => {
    async function initCurrency() {
      const detected = await detectUserCurrency();
      setCurrency(detected);
      const ratesData = await fetchExchangeRates();
      setExchangeRates(ratesData);
    }
    initCurrency();
  }, []);

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('rateradar_currency', newCurrency);
  };


  // Check URL parameters for shareable links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotelName = params.get('hotelName') || params.get('hotel');
    const checkin = params.get('checkin');
    const checkout = params.get('checkout');
    const guests = parseInt(params.get('guests') || '2', 10);

    if (hotelName && checkin && checkout) {
      const details = {
        hotelName,
        checkin,
        checkout,
        guests,
        nights: Math.max(1, Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24))),
        ota: 'Shared Link'
      };
      
      triggerComparison(details);
    }
  }, []);

  const triggerComparison = async (details) => {
    // Robust safety fallback to calculate nights if missing
    if (!details.nights && details.checkin && details.checkout) {
      const start = new Date(details.checkin);
      const end = new Date(details.checkout);
      details.nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    }
    setHotelDetails(details);
    setCurrentPage('searching');

    // Make sure scanning animation is visible for at least 2.5 seconds for a premium feel
    const minAnimationDelay = new Promise(resolve => setTimeout(resolve, 2500));

    // Fetch rates AND hotel meta (image + address) in parallel
    let fetchedRates = [];
    let hotelMeta = { imageUrl: null, address: null };
    try {
      [fetchedRates, hotelMeta] = await Promise.all([
        fetchHotelRates(
          details.hotelName,
          details.hotelKey,
          details.checkin,
          details.checkout,
          details.originalUrl,
          details.ota,
          details.guests
        ),
        fetchHotelMeta(details.originalUrl, details.hotelName),
      ]);
    } catch (err) {
      console.error('Rates/meta retrieval error:', err);
    }

    await minAnimationDelay;

    // Merge image and address into hotel details before showing results
    setHotelDetails(prev => ({
      ...prev,
      imageUrl: hotelMeta.imageUrl || null,
      address: hotelMeta.address || null,
    }));
    setRates(fetchedRates);
    setCurrentPage('results');
  };

  const handleBack = () => {
    // Clear search parameters from URL without page reload
    window.history.pushState({}, '', window.location.pathname);
    setCurrentPage('home');
  };

  const handleNavigate = (page) => {
    if (page === 'home') {
      window.history.pushState({}, '', window.location.pathname);
    }
    setCurrentPage(page);
  };

  return (
    <div className="bg-primary min-h-screen text-text-primary selection:bg-accent-gold/30 selection:text-text-primary">
      {currentPage === 'home' && (
        <Home 
          onSearch={triggerComparison} 
          onNavigate={handleNavigate} 
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
        />
      )}
      
      {currentPage === 'searching' && (
        <Searching 
          hotelDetails={hotelDetails} 
        />
      )}
      
      {currentPage === 'results' && (
        <Results 
          hotelDetails={hotelDetails} 
          rates={rates} 
          onBack={handleBack} 
          onNavigate={handleNavigate} 
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          exchangeRates={exchangeRates}
        />
      )}
      
      {currentPage === 'admin' && (
        <AdminDashboard 
          onNavigate={handleNavigate} 
        />
      )}
    </div>
  );

}
