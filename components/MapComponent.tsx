import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Coordinate, Vehicle } from '../types';
import { STATIONS, VERMONTER_PATH, BUS_ROUTE_31_PATH } from '../constants';

// Fix for Leaflet default icons
try {
  if (L.Icon && L.Icon.Default) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }
} catch (e) {
  console.warn("Leaflet icon fix failed", e);
}

interface MapComponentProps {
  userLocation: Coordinate | null;
  vehicles: Vehicle[];
  destination: Coordinate | null;
  sidebarOpen: boolean;
}

// Component to handle map invalidation (resizing) and flying
const MapController = ({ center, sidebarOpen }: { center: Coordinate | null, sidebarOpen: boolean }) => {
  const map = useMap();
  
  // Fix gray tiles when sidebar toggles
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300); // Wait for transition
  }, [sidebarOpen, map]);

  // Fly to user
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], 13, { duration: 2 });
    }
  }, [center, map]);
  
  return null;
};

// Custom Icons (Waze Style)
const createCustomIcon = (type: 'user' | 'bus' | 'train' | 'station', heading: number = 0) => {
  let html = '';
  let size = 40;
  let color = '';

  switch (type) {
    case 'user':
      html = `<div class="relative flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-lg user-location-pulse">
                <div class="w-3 h-3 bg-white rounded-full"></div>
              </div>`;
      size = 32;
      break;
    case 'bus':
      color = '#34D399';
      html = `<div class="relative flex flex-col items-center justify-center w-12 h-12 transition-all duration-500" style="transform: rotate(${heading}deg)">
                <div class="flex items-center justify-center w-10 h-10 bg-white rounded-2xl border-4 border-emerald-400 shadow-xl z-10">
                  <span class="text-2xl">🚌</span>
                </div>
                <div class="absolute -bottom-1 w-4 h-4 bg-emerald-400 rotate-45 transform origin-center"></div>
              </div>`;
      break;
    case 'train':
      color = '#60A5FA';
      html = `<div class="relative flex flex-col items-center justify-center w-14 h-14 transition-all duration-500">
                <div class="flex items-center justify-center w-12 h-12 bg-white rounded-2xl border-4 border-blue-400 shadow-xl z-10">
                  <span class="text-2xl">🚆</span>
                </div>
              </div>`;
      break;
    case 'station':
      html = `<div class="w-5 h-5 bg-slate-800 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>`;
      size = 20;
      break;
  }

  return L.divIcon({
    className: 'custom-div-icon',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size],
  });
};

const MapComponent: React.FC<MapComponentProps> = ({ userLocation, vehicles, destination, sidebarOpen }) => {
  
  return (
    <MapContainer 
      center={[42.5879, -72.6014]} 
      zoom={12} 
      zoomControl={false}
      className="w-full h-full outline-none z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <MapController center={userLocation} sidebarOpen={sidebarOpen} />

      {/* User Location */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={createCustomIcon('user')}>
          <Popup className="rounded-xl font-bold">You are here</Popup>
        </Marker>
      )}

      {/* Destination Pin */}
      {destination && (
        <Marker position={[destination.lat, destination.lng]}>
           <Popup>Destination</Popup>
        </Marker>
      )}

      {/* Stations */}
      {STATIONS.map(station => (
        <Marker 
          key={station.id} 
          position={[station.location.lat, station.location.lng]}
          icon={createCustomIcon('station')}
        >
          <Popup className="rounded-lg">
            <div className="text-sm font-bold text-slate-700">{station.name}</div>
          </Popup>
        </Marker>
      ))}

      {/* Live Vehicles */}
      {vehicles.map(vehicle => (
        <Marker
          key={vehicle.id}
          position={[vehicle.location.lat, vehicle.location.lng]}
          icon={createCustomIcon(vehicle.type, vehicle.heading)}
        >
          <Popup className="rounded-xl border-none p-0 overflow-hidden">
            <div className={`p-3 min-w-[150px] text-white ${vehicle.type === 'bus' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
              <div className="font-black text-lg">{vehicle.route}</div>
              <div className="text-xs uppercase tracking-wider opacity-90">{vehicle.status}</div>
            </div>
            <div className="p-2 bg-white text-slate-700 text-sm">
              <div className="font-bold">Next: {vehicle.nextStop}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route Lines - Waze Style: Thick and Colorful */}
      <Polyline 
        positions={VERMONTER_PATH.map(p => [p.lat, p.lng])} 
        pathOptions={{ color: '#60A5FA', weight: 8, opacity: 0.8, lineJoin: 'round', lineCap: 'round' }} 
      />
      <Polyline 
        positions={BUS_ROUTE_31_PATH.map(p => [p.lat, p.lng])} 
        pathOptions={{ color: '#34D399', weight: 8, opacity: 0.8, lineJoin: 'round', lineCap: 'round' }} 
      />

    </MapContainer>
  );
};

export default MapComponent;
