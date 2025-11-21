import React, { useState, useEffect, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import { planRouteWithGemini, getPlaceSuggestions } from './services/geminiService';
import { Coordinate, Vehicle, PlannedRoute } from './types';
import { VERMONTER_PATH, BUS_ROUTE_31_PATH } from './constants';
import { Navigation, Bus, Train, AlertTriangle, MapPin, Menu, X, Info, ExternalLink, ArrowRight, Locate, Search } from 'lucide-react';

// Helper for simulating movement
const interpolate = (start: Coordinate, end: Coordinate, fraction: number): Coordinate => {
  return {
    lat: start.lat + (end.lat - start.lat) * fraction,
    lng: start.lng + (end.lng - start.lng) * fraction
  };
};

const App: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  
  // Trip Plan State
  const [originInput, setOriginInput] = useState('Current Location');
  const [destinationInput, setDestinationInput] = useState('');
  
  // Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const [isPlanning, setIsPlanning] = useState(false);
  const [routePlan, setRoutePlan] = useState<PlannedRoute | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [destinationCoords, setDestinationCoords] = useState<Coordinate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          // originInput is already default 'Current Location'
        },
        (err) => {
          console.error("Geolocation blocked", err);
          setOriginInput(''); // Clear default if no GPS
        }
      );
    }
  }, []);

  // Vehicle Simulation Logic
  useEffect(() => {
    let ticks = 0;
    const interval = setInterval(() => {
      ticks += 1;
      const duration = 400;
      const progress = (ticks % duration) / duration;

      // Simulate Vermonter
      const vIdx = Math.floor(progress * (VERMONTER_PATH.length - 1));
      const vNext = (vIdx + 1) % VERMONTER_PATH.length;
      const vFrac = (progress * (VERMONTER_PATH.length - 1)) - vIdx;
      const vermonterPos = interpolate(VERMONTER_PATH[vIdx], VERMONTER_PATH[vNext], vFrac);

      // Simulate Bus 31
      const bIdx = Math.floor(((progress * 2) % 1) * (BUS_ROUTE_31_PATH.length - 1));
      const bNext = (bIdx + 1) % BUS_ROUTE_31_PATH.length;
      const bFrac = (((progress * 2) % 1) * (BUS_ROUTE_31_PATH.length - 1)) - bIdx;
      const busPos = interpolate(BUS_ROUTE_31_PATH[bIdx], BUS_ROUTE_31_PATH[bNext], bFrac);

      setVehicles([
        {
          id: 'train-1',
          type: 'train',
          route: 'Vermonter',
          location: vermonterPos,
          heading: 0,
          status: Math.random() > 0.95 ? 'Delayed' : 'On Time',
          nextStop: 'Northampton',
          color: '#60A5FA'
        },
        {
          id: 'bus-31',
          type: 'bus',
          route: 'FRTA 31',
          location: busPos,
          heading: 0,
          status: 'On Time',
          nextStop: 'Main St',
          color: '#34D399'
        }
      ]);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Debounced Autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!activeField) return;
      const query = activeField === 'origin' ? originInput : destinationInput;
      
      if (query.length > 2 && query !== 'Current Location') {
        setIsLoadingSuggestions(true);
        const results = await getPlaceSuggestions(query, userLocation || undefined);
        setSuggestions(results);
        setIsLoadingSuggestions(false);
      } else {
        setSuggestions([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [originInput, destinationInput, activeField, userLocation]);

  const handleSelectSuggestion = (suggestion: string) => {
    if (activeField === 'origin') setOriginInput(suggestion);
    else setDestinationInput(suggestion);
    setSuggestions([]);
    setActiveField(null);
  };

  const handlePlanRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationInput || !originInput) return;

    setIsPlanning(true);
    setRoutePlan(null);
    setErrorMsg(null);
    // On mobile, minimize sidebar to show map while planning
    if (window.innerWidth < 768) setSidebarOpen(false);

    try {
      const startPoint = originInput === "Current Location" && userLocation 
        ? "My Current Location" 
        : originInput;
      
      const result = await planRouteWithGemini(
        startPoint, 
        destinationInput, 
        originInput === "Current Location" ? userLocation || undefined : undefined
      );
      
      setRoutePlan(result);

      // Rough coordinate mapping for demo purposes (since we don't have full geocoding for markers)
      // In a full app, we'd geocode the destination string to a LatLng
      if (destinationInput.toLowerCase().includes('greenfield')) {
        setDestinationCoords({ lat: 42.5879, lng: -72.5995 });
      } else if (destinationInput.toLowerCase().includes('northampton')) {
        setDestinationCoords({ lat: 42.3195, lng: -72.6298 });
      }

    } catch (err) {
      setErrorMsg("Failed to plan route. Please try again.");
    } finally {
      setIsPlanning(false);
      // Re-open sidebar to show results
      setSidebarOpen(true);
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setOriginInput('Current Location');
        },
        () => alert("Location access denied.")
      );
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex font-sans bg-gray-100 text-slate-800">
      
      {/* Sidebar Panel */}
      <div 
        className={`
          absolute inset-y-0 left-0 z-20 bg-white shadow-2xl 
          transform transition-transform duration-300 ease-in-out
          w-full md:w-[400px] flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center shadow-md z-10">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <Bus className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight">FRTA<span className="font-light opacity-80">Waze</span></h1>
              <p className="text-xs opacity-75">Franklin Regional Transit Authority</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full md:hidden">
            <X size={24} />
          </button>
        </div>

        {/* Inputs Area */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 relative">
          {/* Origin */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500">
              <MapPin size={18} />
            </div>
            <input 
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
              placeholder="Origin"
              value={originInput}
              onFocus={() => setActiveField('origin')}
              onChange={(e) => setOriginInput(e.target.value)}
            />
            <button 
              onClick={useCurrentLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-blue-500"
              title="Use Current Location"
            >
              <Locate size={18} />
            </button>
            
            {/* Autocomplete Dropdown for Origin */}
            {activeField === 'origin' && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                 {suggestions.map((s, i) => (
                   <div key={i} onClick={() => handleSelectSuggestion(s)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none text-sm font-medium text-slate-700 flex items-center gap-2">
                     <MapPin size={14} className="opacity-50" />
                     {s}
                   </div>
                 ))}
              </div>
            )}
          </div>

          {/* Connector Dot */}
          <div className="absolute left-[27px] top-[58px] w-0.5 h-4 bg-slate-300 z-0"></div>

          {/* Destination */}
          <div className="relative group z-10">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500">
              <MapPin size={18} />
            </div>
            <input 
              className="w-full pl-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium transition-all"
              placeholder="Where to?"
              value={destinationInput}
              onFocus={() => setActiveField('destination')}
              onChange={(e) => setDestinationInput(e.target.value)}
            />
            {isLoadingSuggestions && activeField === 'destination' && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            )}

            {/* Autocomplete Dropdown for Destination */}
            {activeField === 'destination' && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                 {suggestions.map((s, i) => (
                   <div key={i} onClick={() => handleSelectSuggestion(s)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-none text-sm font-medium text-slate-700 flex items-center gap-2">
                     <Search size={14} className="opacity-50" />
                     {s}
                   </div>
                 ))}
              </div>
            )}
          </div>

          <button 
            onClick={handlePlanRoute}
            disabled={isPlanning || !destinationInput}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
          >
            {isPlanning ? 'Planning...' : 'Let\'s Go'} 
            {!isPlanning && <ArrowRight size={20} />}
          </button>
        </div>

        {/* Scrollable Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-bold text-center animate-pulse">
              {errorMsg}
            </div>
          )}

          {!routePlan && !isPlanning && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Navigation size={48} />
              </div>
              <p className="font-bold text-slate-400">Enter a destination to start</p>
            </div>
          )}

          {routePlan && (
            <>
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black mb-1">{routePlan.summary}</h3>
                    <p className="opacity-90 font-medium text-sm">Total Trip: {routePlan.totalDuration}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Train size={24} />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {routePlan.hazards.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-orange-600" size={18} />
                    <h4 className="font-bold text-orange-800 text-sm">Route Hazards</h4>
                  </div>
                  <ul className="list-disc list-inside text-xs text-orange-700">
                    {routePlan.hazards.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}

              {/* Step by Step */}
              <div className="space-y-0">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-3 pl-1">Itinerary</h4>
                {routePlan.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-stretch">
                    <div className="flex flex-col items-center min-w-[40px]">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm border-2 border-white
                         ${step.type === 'walk' ? 'bg-slate-100 text-slate-500' : 
                           step.type === 'train' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}
                       `}>
                         {step.type === 'walk' && <span className="text-lg">🚶</span>}
                         {step.type === 'bus' && <Bus size={18} />}
                         {step.type === 'train' && <Train size={18} />}
                         {step.type === 'wait' && <Info size={18} />}
                       </div>
                       {idx < routePlan.steps.length - 1 && (
                         <div className="w-0.5 flex-grow bg-slate-200 my-1"></div>
                       )}
                    </div>
                    <div className="pb-6 w-full">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-slate-700 font-medium text-sm leading-relaxed">{step.instruction}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sources */}
              {routePlan.groundingUrls.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Data Sources</h5>
                  <div className="flex flex-wrap gap-2">
                    {routePlan.groundingUrls.map((url, i) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] bg-slate-50 hover:bg-slate-100 text-blue-600 px-2 py-1 rounded border border-slate-200 transition-colors truncate max-w-[150px]"
                      >
                        <span className="truncate">{new URL(url).hostname}</span>
                        <ExternalLink size={8} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className={`flex-1 relative transition-all duration-300 ${sidebarOpen ? 'md:ml-[400px]' : 'ml-0'}`}>
        {/* Toggle Button (Visible when sidebar closed) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 bg-white p-3 rounded-full shadow-xl hover:scale-105 transition-transform border-2 border-blue-500 text-blue-600"
          >
            <Menu size={24} />
          </button>
        )}

        <MapComponent 
          userLocation={userLocation} 
          vehicles={vehicles}
          destination={destinationCoords}
          sidebarOpen={sidebarOpen}
        />
      </div>

    </div>
  );
};

export default App;
