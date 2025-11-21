import { Station, Coordinate } from './types';

// Franklin County / Pioneer Valley Area
export const CENTER_OF_MAP: Coordinate = { lat: 42.5879, lng: -72.6014 }; // Near Greenfield, MA

export const STATIONS: Station[] = [
  {
    id: 'gfd-amtrak',
    name: 'Greenfield John W. Olver Transit Center',
    type: 'amtrak',
    location: { lat: 42.5879, lng: -72.5995 }
  },
  {
    id: 'nht-amtrak',
    name: 'Northampton Station',
    type: 'amtrak',
    location: { lat: 42.3195, lng: -72.6298 }
  },
  {
    id: 'bus-stop-1',
    name: 'Main St & Federal St',
    type: 'bus_stop',
    location: { lat: 42.5890, lng: -72.6000 }
  },
  {
    id: 'bus-stop-2',
    name: 'GCC Main Entrance',
    type: 'bus_stop',
    location: { lat: 42.5950, lng: -72.6200 }
  },
  {
    id: 'bus-stop-3',
    name: 'Baystate Franklin Medical',
    type: 'bus_stop',
    location: { lat: 42.5920, lng: -72.6050 }
  }
];

// Simulation paths (Simplified for demo visual)
export const VERMONTER_PATH: Coordinate[] = [
  { lat: 42.6500, lng: -72.5800 }, // North
  { lat: 42.5879, lng: -72.5995 }, // Greenfield
  { lat: 42.3195, lng: -72.6298 }, // Northampton
  { lat: 42.2000, lng: -72.6300 }, // South
];

export const BUS_ROUTE_31_PATH: Coordinate[] = [
  { lat: 42.5879, lng: -72.5995 }, // Transit Center
  { lat: 42.5920, lng: -72.6050 },
  { lat: 42.5950, lng: -72.6200 },
  { lat: 42.6000, lng: -72.6100 }, // Loop back
  { lat: 42.5890, lng: -72.6000 },
];
