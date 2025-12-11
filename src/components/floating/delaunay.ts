import type { Point, Triangle } from './types';

interface Edge {
  p1: number;
  p2: number;
}

const circumcircleContains = (
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  px: number, py: number
): boolean => {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-10) return false;
  
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  
  const radiusSq = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
  const distSq = (px - ux) * (px - ux) + (py - uy) * (py - uy);
  
  return distSq < radiusSq;
};

const edgeEquals = (e1: Edge, e2: Edge): boolean => {
  return (e1.p1 === e2.p1 && e1.p2 === e2.p2) || (e1.p1 === e2.p2 && e1.p2 === e2.p1);
};

export const triangulate = (points: Point[]): Triangle[] => {
  if (points.length < 3) return [];

  const minX = Math.min(...points.map(p => p.x)) - 100;
  const minY = Math.min(...points.map(p => p.y)) - 100;
  const maxX = Math.max(...points.map(p => p.x)) + 100;
  const maxY = Math.max(...points.map(p => p.y)) + 100;
  
  const dx = maxX - minX;
  const dy = maxY - minY;
  const deltaMax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const superTriangle = {
    p1: -1,
    p2: -2,
    p3: -3,
    centroidX: midX,
    centroidY: midY,
    neighbors: [] as number[],
  };

  const superPoints: Point[] = [
    { id: -1, x: midX - 2 * deltaMax, y: midY - deltaMax, baseX: 0, baseY: 0, vx: 0, vy: 0, phase: 0 },
    { id: -2, x: midX, y: midY + 2 * deltaMax, baseX: 0, baseY: 0, vx: 0, vy: 0, phase: 0 },
    { id: -3, x: midX + 2 * deltaMax, y: midY - deltaMax, baseX: 0, baseY: 0, vx: 0, vy: 0, phase: 0 },
  ];

  const allPoints = [...superPoints, ...points];
  const getPoint = (id: number): Point => {
    if (id < 0) return superPoints[-id - 1];
    return points.find(p => p.id === id)!;
  };

  let triangles: Triangle[] = [superTriangle];

  for (const point of points) {
    const badTriangles: Triangle[] = [];
    
    for (const tri of triangles) {
      const p1 = getPoint(tri.p1);
      const p2 = getPoint(tri.p2);
      const p3 = getPoint(tri.p3);
      
      if (circumcircleContains(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, point.x, point.y)) {
        badTriangles.push(tri);
      }
    }

    const polygon: Edge[] = [];
    
    for (const tri of badTriangles) {
      const edges: Edge[] = [
        { p1: tri.p1, p2: tri.p2 },
        { p1: tri.p2, p2: tri.p3 },
        { p1: tri.p3, p2: tri.p1 },
      ];
      
      for (const edge of edges) {
        let shared = false;
        for (const otherTri of badTriangles) {
          if (otherTri === tri) continue;
          const otherEdges: Edge[] = [
            { p1: otherTri.p1, p2: otherTri.p2 },
            { p1: otherTri.p2, p2: otherTri.p3 },
            { p1: otherTri.p3, p2: otherTri.p1 },
          ];
          if (otherEdges.some(e => edgeEquals(e, edge))) {
            shared = true;
            break;
          }
        }
        if (!shared) polygon.push(edge);
      }
    }

    triangles = triangles.filter(t => !badTriangles.includes(t));

    for (const edge of polygon) {
      const p1 = getPoint(edge.p1);
      const p2 = getPoint(edge.p2);
      const centroidX = (p1.x + p2.x + point.x) / 3;
      const centroidY = (p1.y + p2.y + point.y) / 3;
      
      triangles.push({
        p1: edge.p1,
        p2: edge.p2,
        p3: point.id,
        centroidX,
        centroidY,
        neighbors: [],
      });
    }
  }

  triangles = triangles.filter(t => t.p1 >= 0 && t.p2 >= 0 && t.p3 >= 0);

  // Calculate neighbors
  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    const triEdges: Edge[] = [
      { p1: tri.p1, p2: tri.p2 },
      { p1: tri.p2, p2: tri.p3 },
      { p1: tri.p3, p2: tri.p1 },
    ];
    
    for (let j = 0; j < triangles.length; j++) {
      if (i === j) continue;
      const other = triangles[j];
      const otherEdges: Edge[] = [
        { p1: other.p1, p2: other.p2 },
        { p1: other.p2, p2: other.p3 },
        { p1: other.p3, p2: other.p1 },
      ];
      
      if (triEdges.some(e1 => otherEdges.some(e2 => edgeEquals(e1, e2)))) {
        tri.neighbors.push(j);
      }
    }
  }

  return triangles;
};

