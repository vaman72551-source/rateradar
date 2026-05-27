import React, { useState, useEffect } from 'react';
import { ShieldAlert, BarChart3, Globe, MousePointer, HelpCircle, RefreshCw, Trash2, ArrowLeft, Lock } from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const [authorized, setAuthorized] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Dashboard metrics state
  const [metrics, setMetrics] = useState({
    visits: 0,
    searches: 0,
    clicks: 0,
    ctr: '0%',
    estRevenue: 0
  });

  const [searchLogs, setSearchLogs] = useState([]);
  const [clickLogs, setClickLogs] = useState([]);

  // Check sessionStorage on mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem('rateradar_admin_auth') === 'true';
    if (isAuth) {
      setAuthorized(true);
      loadLogs();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'admin123') {
      sessionStorage.setItem('rateradar_admin_auth', 'true');
      setAuthorized(true);
      setErrorMsg('');
      loadLogs();
    } else {
      setErrorMsg('Invalid Administrator Passcode. Access Denied.');
    }
  };

  const loadLogs = () => {
    const visits = parseInt(localStorage.getItem('rateradar_visits') || '0', 10);
    const searches = JSON.parse(localStorage.getItem('rateradar_search_logs') || '[]');
    const clicks = JSON.parse(localStorage.getItem('rateradar_click_logs') || '[]');

    setSearchLogs(searches);
    setClickLogs(clicks);

    // Calculate metrics
    const totalSearches = searches.length;
    const totalClicks = clicks.length;
    const ctrVal = totalSearches > 0 ? ((totalClicks / totalSearches) * 100).toFixed(1) + '%' : '0.0%';
    
    // Estimate referral commission (let's say 4.5% of the nightly rate)
    const commission = clicks.reduce((acc, click) => acc + (parseFloat(click.rate || 0) * 0.045), 0);

    setMetrics({
      visits,
      searches: totalSearches,
      clicks: totalClicks,
      ctr: ctrVal,
      estRevenue: commission.toFixed(2)
    });
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all affiliate click and search activity logs?')) {
      localStorage.setItem('rateradar_search_logs', '[]');
      localStorage.setItem('rateradar_click_logs', '[]');
      localStorage.setItem('rateradar_visits', '0');
      loadLogs();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rateradar_admin_auth');
    setAuthorized(false);
    setPasscode('');
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 max-w-md mx-auto">
        <div className="w-full bg-primary-card border border-border rounded-2xl p-8 shadow-2xl relative">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold mb-4 animate-pulse">
              <Lock size={22} />
            </div>
            <h1 className="font-outfit text-2xl font-bold text-text-primary">Admin Gateway</h1>
            <p className="font-sans text-xs text-text-muted mt-1.5">
              Secure console for affiliate tracking and traffic monitoring.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs text-text-muted uppercase tracking-wider font-semibold">
                Administrator Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (admin123)"
                className="w-full bg-primary/60 border border-border focus:border-accent-gold rounded-full px-4 py-2.5 text-text-primary text-center font-sans tracking-widest outline-none text-sm"
              />
            </div>

            {errorMsg && (
              <span className="text-red-400 text-xs font-sans text-center mt-1 block">
                {errorMsg}
              </span>
            )}

            <button
              type="submit"
              className="bg-accent-gold hover:bg-accent-gold/90 text-primary font-bold py-2.5 rounded-full font-sans transition-all uppercase tracking-wider text-xs shadow-md mt-2"
            >
              Verify Credentials
            </button>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="text-text-muted hover:text-text-primary text-xs font-sans mt-2 underline"
            >
              Back to RateRadar Homepage
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 max-w-6xl mx-auto flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center w-full mb-8 border-b border-border/20 pb-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 rounded-full border border-accent-gold flex items-center justify-center bg-primary-card">
              <span className="text-xl font-serif text-accent-gold font-bold">R</span>
            </div>
            <span className="font-outfit text-2xl font-bold tracking-wide text-text-primary">
              Rate<span className="text-accent-gold">Radar</span> <span className="font-sans text-xs font-normal text-text-muted uppercase tracking-wider">Console</span>
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="text-xs font-sans text-text-muted hover:text-red-400 border border-border/40 hover:border-red-400/30 px-3 py-1.5 rounded-full transition-all"
            >
              Lock Console
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-sans text-primary bg-accent-gold hover:bg-accent-gold/90 px-4 py-1.5 rounded-full transition-all flex items-center gap-1 font-bold"
            >
              <ArrowLeft size={12} /> Live Site
            </button>
          </div>
        </div>

        {/* Dashboard Title */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-outfit text-2xl font-bold text-text-primary">System Monitoring</h2>
            <p className="font-sans text-xs text-text-muted mt-1">Real-time statistics for search volume and affiliate activity.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadLogs}
              className="bg-primary hover:bg-border/20 text-text-muted hover:text-accent-gold border border-border p-2 rounded-lg transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={handleClearLogs}
              className="bg-red-950/20 hover:bg-red-900/20 text-red-400 border border-red-500/20 p-2 rounded-lg transition-all"
              title="Clear All Logs"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-primary-card border border-border/40 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-text-muted mb-2">
              <span className="text-xs font-sans uppercase font-bold tracking-wider">Visits</span>
              <Globe size={16} className="text-blue-400" />
            </div>
            <div className="font-sans text-2xl font-bold text-text-primary">{metrics.visits}</div>
            <div className="text-[10px] text-text-muted mt-1">Total page impressions</div>
          </div>

          <div className="bg-primary-card border border-border/40 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-text-muted mb-2">
              <span className="text-xs font-sans uppercase font-bold tracking-wider">Searches</span>
              <BarChart3 size={16} className="text-accent-gold" />
            </div>
            <div className="font-sans text-2xl font-bold text-text-primary">{metrics.searches}</div>
            <div className="text-[10px] text-text-muted mt-1">Total URL comparison operations</div>
          </div>

          <div className="bg-primary-card border border-border/40 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-text-muted mb-2">
              <span className="text-xs font-sans uppercase font-bold tracking-wider">Clicks</span>
              <MousePointer size={16} className="text-green-400" />
            </div>
            <div className="font-sans text-2xl font-bold text-text-primary">{metrics.clicks}</div>
            <div className="text-[10px] text-text-muted mt-1">Affiliate link clicks</div>
          </div>

          <div className="bg-primary-card border border-border/40 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-text-muted mb-2">
              <span className="text-xs font-sans uppercase font-bold tracking-wider">CTR</span>
              <HelpCircle size={16} className="text-purple-400" />
            </div>
            <div className="font-sans text-2xl font-bold text-text-primary">{metrics.ctr}</div>
            <div className="text-[10px] text-text-muted mt-1">Click Through Rate</div>
          </div>

          <div className="bg-primary-card border border-accent-gold/30 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
            <div className="flex justify-between items-center text-text-muted mb-2">
              <span className="text-xs font-sans uppercase font-bold tracking-wider text-accent-gold">Commission</span>
              <span className="text-accent-gold text-sm font-bold">$</span>
            </div>
            <div className="font-sans text-2xl font-bold text-accent-gold">${metrics.estRevenue}</div>
            <div className="text-[10px] text-accent-gold/70 mt-1">Estimated earnings (4.5% rate)</div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Searches Table */}
          <div className="bg-primary-card border border-border rounded-xl p-5 shadow-lg">
            <h3 className="font-outfit text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span>🔍</span> Search Query Log
            </h3>
            {searchLogs.length === 0 ? (
              <div className="text-center py-10 font-sans text-text-muted text-sm border border-dashed border-border/10 rounded-lg">
                No search queries registered yet.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-border/20 text-text-muted pb-2">
                      <th className="py-2">Hotel</th>
                      <th className="py-2 text-center">Dates</th>
                      <th className="py-2 text-right">Parsed OTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/10">
                        <td className="py-3 font-medium text-text-primary max-w-[150px] truncate" title={log.hotelName}>
                          {log.hotelName}
                        </td>
                        <td className="py-3 text-center text-text-muted text-[11px] font-sans">
                          {log.checkin} / {log.checkout}
                        </td>
                        <td className="py-3 text-right">
                          <span className="bg-primary px-2 py-0.5 rounded text-[10px] border border-border/10 text-accent-gold">
                            {log.ota}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Affiliate Clicks Table */}
          <div className="bg-primary-card border border-border rounded-xl p-5 shadow-lg">
            <h3 className="font-outfit text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span>💰</span> Affiliate Conversion Log
            </h3>
            {clickLogs.length === 0 ? (
              <div className="text-center py-10 font-sans text-text-muted text-sm border border-dashed border-border/10 rounded-lg">
                No affiliate redirections recorded yet.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-border/20 text-text-muted pb-2">
                      <th className="py-2">Hotel</th>
                      <th className="py-2 text-center">OTA</th>
                      <th className="py-2 text-right">Nightly Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/10">
                        <td className="py-3 font-medium text-text-primary max-w-[150px] truncate" title={log.hotelName}>
                          {log.hotelName}
                        </td>
                        <td className="py-3 text-center text-text-muted">
                          {log.otaName}
                        </td>
                        <td className="py-3 text-right font-bold text-accent-gold">
                          ${parseFloat(log.rate).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
