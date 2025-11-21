import { FunctionDeclaration, Tool } from "@google/genai";

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Station {
  id: string;
  name: string;
  type: 'amtrak' | 'bus_stop';
  location: Coordinate;
}

export interface Vehicle {
  id: string;
  type: 'bus' | 'train';
  route: string;
  location: Coordinate;
  heading: number; // 0-360 degrees
  status: 'On Time' | 'Delayed' | 'Early';
  nextStop: string;
  color: string; // Hex color for the route line
}

export interface RouteStep {
  instruction: string;
  duration?: string;
  distance?: string;
  type: 'walk' | 'bus' | 'train' | 'wait';
}

export interface PlannedRoute {
  summary: string;
  steps: RouteStep[];
  hazards: string[];
  totalDuration: string;
  groundingUrls: string[];
}

export enum MapStyle {
  Standard = 'standard',
  Cartoon = 'cartoon'
}
