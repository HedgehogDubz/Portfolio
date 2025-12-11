export interface Boid {
  id: number;
  x: number;
  y: number;
  angle: number;
  turningHistory: number[];
  currentSpeed: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NavItem {
  id: string;
  title: string;
  icon: string;
  description?: string;
}

export interface ProfileConfig {
  imagePath: string;
  name: string;
  title: string;
  fallbackInitial: string;
}

