import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const OTA_LIST = [
  'Booking.com',
  'Agoda',
  'Expedia',
  'MakeMyTrip',
  'Hotels.com',
  'Trip.com',
  'Priceline',
  'Kayak',
  'ZenHotels',
  'TripAdvisor'
];

export default function Searching({ hotelDetails }) {
  const [currentOtaIdx, setCurrentOtaIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Rotate OTA name every 350ms
    const otaInterval = setInterval(() => {
      setCurrentOtaIdx((prev) => (prev + 1) % OTA_LIST.length);
    }, 350);

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(otaInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-primary/95 flex flex-col items-center justify-center z-50 p-6">
      {/* Radar Animation */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        {/* Outer Ring 3 */}
        <div className="absolute inset-0 rounded-full border border-accent-gold/5 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
        {/* Outer Ring 2 */}
        <div className="absolute inset-4 rounded-full border border-accent-gold/10 animate-ping opacity-50" style={{ animationDuration: '2s' }} />
        {/* Outer Ring 1 */}
        <div className="absolute inset-8 rounded-full border border-accent-gold/20 animate-pulse opacity-75" />
        {/* Core Pulsing Radar */}
        <div className="w-20 h-20 rounded-full bg-primary-card border-2 border-accent-gold flex items-center justify-center shadow-xl shadow-accent-gold/10 relative z-10 animate-pulse">
          <span className="text-3xl">📡</span>
        </div>
      </div>

      {/* Text Container */}
      <div className="text-center max-w-md">
        <h2 className="font-outfit text-2xl md:text-3xl font-bold text-text-primary mb-2">
          Searching Rates{dots}
        </h2>
        <p className="font-sans text-sm text-accent-gold uppercase tracking-widest font-semibold mb-4">
          {hotelDetails?.hotelName || 'Luxury Hotel'}
        </p>

        {/* Live Scan Tracker */}
        <div className="bg-primary-card border border-border/40 px-6 py-3 rounded-full inline-flex items-center gap-3 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-sans text-xs md:text-sm text-text-primary tracking-wide">
            Scanning: <span className="font-bold text-accent-gold">{OTA_LIST[currentOtaIdx]}</span>
          </span>
        </div>

        <div className="mt-8 flex justify-center items-center gap-2 text-text-muted text-xs font-sans">
          <ShieldCheck size={14} className="text-accent-gold/70" />
          <span>Securing direct client-side comparison rates...</span>
        </div>
      </div>
    </div>
  );
}
