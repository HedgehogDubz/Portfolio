export interface Point {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  wanderAngle: number; 
  wanderSpeed: number; 
  tx: number;
  ty: number; 
}

export interface Triangle {
  p1: number;
  p2: number;
  p3: number;
  centroidX: number;
  centroidY: number;
  neighbors: number[];
}

