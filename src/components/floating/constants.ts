// Particle density - particles per 100,000 square pixels of screen area
export const PARTICLE_DENSITY = 20;
export const SIMULATION_PADDING = 0.3;

// Wandering motion
export const WANDER_SPEED = 0.3;
export const WANDER_STRENGTH = 0.02;
export const MAX_SPEED = 0.8;
export const DAMPING = 0.995;

// Particle repulsion
export const REPULSION_RADIUS = 100;
export const REPULSION_STRENGTH = 1.5;

// Wall repulsion
export const WALL_MARGIN = 80; // Distance from wall where repulsion starts
export const WALL_REPULSION_STRENGTH = 0.1; // How strongly particles push away from walls

// Visual settings
export const LINE_WIDTH = 1.5;
export const BASE_ALPHA = 0.3;
export const HOVER_ALPHA = 0.5;
export const GLOW_FALLOFF = 0.25;

// Colors (amber and green CRT style)
export const AMBER_COLOR = { r: 232, g: 212, b: 160 };
export const GREEN_COLOR = { r: 160, g: 184, b: 158 };

// Connection settings
export const CONNECTION_RADIUS = 1.8;

// Angular distribution connection limits
export const ANGULAR_SECTORS = 3; 
export const MAX_PER_SECTOR = 2; 
export const ANGULAR_PROXIMITY_THRESHOLD = Math.PI / 6;

// Mouse Forces
export const MOUSE_ATTRACTION_STRENGTH = 2.0; //2.0
export const MOUSE_ATTRACTION_RADIUS = 550;
export const MOUSE_ATTRACTION_MIN_RADIUS = 0;

// Distortion
export const DISTORTION_STRENGTH = 5.5; // 5.5
export const DISTORTION_RADIUS = 150;
export const DISTORTION_MAX_RADIUS = 100;

// Inter-particle Attractions when moused
export const MOUSE_INTERACTION_STRENGTH = 0.3;
export const MOUSE_INTERACTION_RADIUS = 200;
