import { useRef, useEffect } from 'react';
import type { Point } from './types';
import {
  PARTICLE_DENSITY,
  SIMULATION_PADDING,
  WANDER_SPEED,
  WANDER_STRENGTH,
  MAX_SPEED,
  DAMPING,
  REPULSION_RADIUS,
  REPULSION_STRENGTH,
  WALL_MARGIN,
  WALL_REPULSION_STRENGTH,
  LINE_WIDTH,
  BASE_ALPHA,
  AMBER_COLOR,
  GREEN_COLOR,
  CONNECTION_RADIUS,
  ANGULAR_SECTORS,
  MAX_PER_SECTOR,
  ANGULAR_PROXIMITY_THRESHOLD,
  MOUSE_ATTRACTION_STRENGTH,
  MOUSE_ATTRACTION_RADIUS,
  MOUSE_ATTRACTION_MIN_RADIUS,
  DISTORTION_STRENGTH,
  DISTORTION_RADIUS,
  DISTORTION_MAX_RADIUS,
  MOUSE_INTERACTION_STRENGTH,
  MOUSE_INTERACTION_RADIUS,
} from './constants';

interface UseFloatingPointsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPausedRef: React.MutableRefObject<boolean>;
  mousePositionRef: React.MutableRefObject<{ x: number; y: number } | null>;
  isMouseActiveRef: React.MutableRefObject<boolean>;
}

interface Connection {
  p1: Point;
  p2: Point;
  distance: number;
}

interface Triangle {
  p1: Point;
  p2: Point;
  p3: Point;
  key: string;
}
const clamp = (num:number, min:number, max:number) => {
  if (num < min) return min;
  if (num > max) return max;
  return num;
};
export const useFloatingPoints = (props: UseFloatingPointsProps) => {
  const { canvasRef, isPausedRef, mousePositionRef, isMouseActiveRef } = props;
  const pointsRef = useRef<Point[]>([]);
  const trianglesRef = useRef<Triangle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const connectionRadiusRef = useRef<number>(CONNECTION_RADIUS);
  const nextIdRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate target particle count based on screen area
    const getTargetParticleCount = (width: number, height: number): number => {
      const paddingX = width * SIMULATION_PADDING;
      const paddingY = height * SIMULATION_PADDING;
      const simWidth = width + paddingX * 2;
      const simHeight = height + paddingY * 2;
      const area = simWidth * simHeight;
      return Math.round((area / 100000) * PARTICLE_DENSITY);
    };

    // Create a new particle at a random position within the simulation bounds
    const createParticle = (width: number, height: number): Point => {
      const paddingX = width * SIMULATION_PADDING;
      const paddingY = height * SIMULATION_PADDING;
      const minX = -paddingX;
      const maxX = width + paddingX;
      const minY = -paddingY;
      const maxY = height + paddingY;

      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      const angle = Math.random() * Math.PI * 2;
      const individualWanderSpeed = 0.5 + Math.random();

      return {
        id: nextIdRef.current++,
        x,
        y,
        baseX: x,
        baseY: y,
        vx: Math.cos(angle) * WANDER_SPEED * 0.5,
        vy: Math.sin(angle) * WANDER_SPEED * 0.5,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderSpeed: individualWanderSpeed,
        tx: 0,
        ty: 0,
      };
    };

    // Initialize particles for the first time
    const initPoints = () => {
      const width = canvas.width;
      const height = canvas.height;
      const targetCount = getTargetParticleCount(width, height);

      // Update connection radius based on average spacing
      const paddingX = width * SIMULATION_PADDING;
      const paddingY = height * SIMULATION_PADDING;
      const simWidth = width + paddingX * 2;
      const simHeight = height + paddingY * 2;
      const avgSpacing = Math.sqrt((simWidth * simHeight) / targetCount);
      connectionRadiusRef.current = avgSpacing * CONNECTION_RADIUS;

      const points: Point[] = [];
      for (let i = 0; i < targetCount; i++) {
        points.push(createParticle(width, height));
      }
      pointsRef.current = points;
    };

    // Adjust particle count on resize without restarting simulation
    const adjustParticleCount = () => {
      const width = canvas.width;
      const height = canvas.height;
      const targetCount = getTargetParticleCount(width, height);
      const currentCount = pointsRef.current.length;

      // Update connection radius
      const paddingX = width * SIMULATION_PADDING;
      const paddingY = height * SIMULATION_PADDING;
      const simWidth = width + paddingX * 2;
      const simHeight = height + paddingY * 2;
      const avgSpacing = Math.sqrt((simWidth * simHeight) / targetCount);
      connectionRadiusRef.current = avgSpacing * CONNECTION_RADIUS;

      if (targetCount > currentCount) {
        // Add more particles
        const toAdd = targetCount - currentCount;
        for (let i = 0; i < toAdd; i++) {
          pointsRef.current.push(createParticle(width, height));
        }
      } else if (targetCount < currentCount) {
        // Remove particles (remove from the end)
        pointsRef.current.splice(targetCount);
      }
    };

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;

      if (canvas.width !== width || canvas.height !== height) {
        const isFirstInit = pointsRef.current.length === 0;
        canvas.width = width;
        canvas.height = height;

        if (isFirstInit) {
          initPoints();
        } else {
          adjustParticleCount();
        }
      }
    };

    const updatePoints = () => {
      if (isPausedRef.current) return;

      const points = pointsRef.current;
      const paddingX = canvas.width * SIMULATION_PADDING;
      const paddingY = canvas.height * SIMULATION_PADDING;

      // Calculate repulsion forces between all particle pairs
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[j].x - points[i].x;
          const dy = points[j].y - points[i].y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < REPULSION_RADIUS && dist > 0) {
            // Repulsion strength increases as particles get closer
            const force = clamp(Math.pow(1 - dist / REPULSION_RADIUS, 2) * REPULSION_STRENGTH, 0, 1);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            // Push particles apart (opposite directions)
            points[i].x -= fx;
            points[i].y -= fy;
            points[j].x += fx;
            points[j].y += fy;
          }
          //attraction when hovered
          if (isMouseActiveRef.current && mousePositionRef.current) {
            const mouseX = mousePositionRef.current.x;
            const mouseY = mousePositionRef.current.y;
            const dxMouseI = mouseX - points[i].x;
            const dyMouseI = mouseY - points[i].y;
            const dxMouseJ = mouseX - points[j].x;
            const dyMouseJ = mouseY - points[j].y;
            const distMouseI = Math.sqrt(dxMouseI * dxMouseI + dyMouseI * dyMouseI);
            const distMouseJ = Math.sqrt(dxMouseJ * dxMouseJ + dyMouseJ * dyMouseJ);
            if (distMouseI < MOUSE_INTERACTION_RADIUS && distMouseJ < MOUSE_INTERACTION_RADIUS) {
              const forceInteraction = MOUSE_INTERACTION_STRENGTH * (1 - distMouseJ / MOUSE_INTERACTION_RADIUS);
              const fxInteraction = (dx / dist) * forceInteraction;
              const fyInteraction = (dy / dist) * forceInteraction;
              points[i].x += fxInteraction;
              points[i].y += fyInteraction;
            }
          }
        }
      }

      points.forEach(point => {
        // Random walk: gradually change wander direction randomly
        point.wanderAngle += (Math.random() - 0.5) * WANDER_SPEED * point.wanderSpeed;
        point.vx += Math.cos(point.wanderAngle) * WANDER_STRENGTH;
        point.vy += Math.sin(point.wanderAngle) * WANDER_STRENGTH;

        const speed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
        if (speed > MAX_SPEED) {
          point.vx = (point.vx / speed) * MAX_SPEED;
          point.vy = (point.vy / speed) * MAX_SPEED;
        }

        point.vx *= DAMPING;
        point.vy *= DAMPING;

        point.x += point.vx;
        point.y += point.vy;

        // Wall repulsion - push particles away from edges
        const minX = -paddingX;
        const maxX = canvas.width + paddingX;
        const minY = -paddingY;
        const maxY = canvas.height + paddingY;

        // Calculate distance from each wall and apply repulsion force
        const distFromLeft = point.x - minX;
        const distFromRight = maxX - point.x;
        const distFromTop = point.y - minY;
        const distFromBottom = maxY - point.y;

        if (distFromLeft < WALL_MARGIN) {
          const force = (1 - distFromLeft / WALL_MARGIN) * WALL_REPULSION_STRENGTH;
          point.vx += force;
        }
        if (distFromRight < WALL_MARGIN) {
          const force = (1 - distFromRight / WALL_MARGIN) * WALL_REPULSION_STRENGTH;
          point.vx -= force;
        }
        if (distFromTop < WALL_MARGIN) {
          const force = (1 - distFromTop / WALL_MARGIN) * WALL_REPULSION_STRENGTH;
          point.vy += force;
        }
        if (distFromBottom < WALL_MARGIN) {
          const force = (1 - distFromBottom / WALL_MARGIN) * WALL_REPULSION_STRENGTH;
          point.vy -= force;
        }
        if (isMouseActiveRef.current && mousePositionRef.current) {
          const mouseX = mousePositionRef.current.x;
          const mouseY = mousePositionRef.current.y;
          const dxMouse = mouseX - point.x;
          const dyMouse = mouseY - point.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          // Mouse attraction

          if (distMouse < MOUSE_ATTRACTION_RADIUS && distMouse > MOUSE_ATTRACTION_MIN_RADIUS) {
            const forceMouse = ((-4 * (distMouse - MOUSE_ATTRACTION_MIN_RADIUS) * (distMouse - MOUSE_ATTRACTION_RADIUS)) / (Math.pow(MOUSE_ATTRACTION_RADIUS - MOUSE_ATTRACTION_MIN_RADIUS, 2))) * MOUSE_ATTRACTION_STRENGTH;
            const fxMouse = (dxMouse / distMouse) * forceMouse * Math.pow(1 - distMouse / MOUSE_ATTRACTION_RADIUS, 1);
            const fyMouse = (dyMouse / distMouse) * forceMouse * Math.pow(1 - distMouse / MOUSE_ATTRACTION_RADIUS, 1);
            point.x += fxMouse;
            point.y += fyMouse;
          }
          

          //Distortion
          const ddxMouse = mouseX - point.x - point.tx;
          const ddyMouse = mouseY - point.y - point.ty;
          if (distMouse < DISTORTION_RADIUS) {
            const forceDistortion = Math.pow(1 - distMouse / DISTORTION_RADIUS, 2) * DISTORTION_STRENGTH;
            const tfx = (ddxMouse / distMouse) * forceDistortion;
            const tfy = (ddyMouse / distMouse) * forceDistortion;
            point.tx += tfx;
            point.ty += tfy;
            
            if (point.tx * point.tx + point.ty * point.ty > DISTORTION_MAX_RADIUS * DISTORTION_MAX_RADIUS) {
              point.tx = (point.tx / Math.sqrt(point.tx * point.tx + point.ty * point.ty)) * DISTORTION_MAX_RADIUS * Math.pow(1 - distMouse / DISTORTION_RADIUS, 1);
              point.ty = (point.ty / Math.sqrt(point.tx * point.tx + point.ty * point.ty)) * DISTORTION_MAX_RADIUS * Math.pow(1 - distMouse / DISTORTION_RADIUS, 1);
            }
          }
          point.tx *= 0.9;
          point.ty *= 0.9;
        }
        
      });
    };


    // Helper to get the angular sector (0 to ANGULAR_SECTORS-1) for an angle
    const getAngularSector = (angle: number): number => {
      // Normalize angle to 0 to 2π
      const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(normalizedAngle / (Math.PI * 2) * ANGULAR_SECTORS) % ANGULAR_SECTORS;
    };

    // Check if adding a connection at this angle would exceed angular density limits
    const canAddConnection = (
      particleAngles: number[],
      newAngle: number,
      sectorCounts: number[]
    ): boolean => {
      const sector = getAngularSector(newAngle);

      // Check if sector is full
      if (sectorCounts[sector] >= MAX_PER_SECTOR) {
        return false;
      }

      // Check angular proximity to existing connections
      // Count how many existing connections are within the proximity threshold
      let nearbyCount = 0;
      for (const existingAngle of particleAngles) {
        let angleDiff = Math.abs(newAngle - existingAngle);
        // Handle wrap-around
        if (angleDiff > Math.PI) {
          angleDiff = Math.PI * 2 - angleDiff;
        }
        if (angleDiff < ANGULAR_PROXIMITY_THRESHOLD) {
          nearbyCount++;
        }
      }

      // Allow if there aren't too many nearby connections
      return nearbyCount < MAX_PER_SECTOR;
    };

    const findConnections = (): Connection[] => {
      const connections: Connection[] = [];
      const points = pointsRef.current;
      const maxDist = connectionRadiusRef.current;

      // Track angles and sector counts for each particle
      const particleAngles = new Map<number, number[]>();
      const particleSectorCounts = new Map<number, number[]>();

      // Initialize tracking for all particles
      points.forEach(p => {
        particleAngles.set(p.id, []);
        particleSectorCounts.set(p.id, new Array(ANGULAR_SECTORS).fill(0));
      });

      // Collect all potential connections with their distances
      interface PotentialConnection {
        p1: Point;
        p2: Point;
        distance: number;
        angle1: number; // Angle from p1 to p2
        angle2: number; // Angle from p2 to p1
      }
      const potentialConnections: PotentialConnection[] = [];

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1 = points[i];
          const p2 = points[j];
          const dx = p2.x + p2.tx - p1.x - p1.tx;
          const dy = p2.y + p2.ty - p1.y - p1.ty;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDist) {
            const angle1 = Math.atan2(dy, dx); // Angle from p1 to p2
            const angle2 = Math.atan2(-dy, -dx); // Angle from p2 to p1 (opposite)
            potentialConnections.push({ p1, p2, distance, angle1, angle2 });
          }
        }
      }

      // Sort by distance (prefer shorter connections)
      potentialConnections.sort((a, b) => a.distance - b.distance);

      // Add connections respecting angular distribution limits
      for (const potential of potentialConnections) {
        const { p1, p2, distance, angle1, angle2 } = potential;

        const angles1 = particleAngles.get(p1.id)!;
        const angles2 = particleAngles.get(p2.id)!;
        const sectors1 = particleSectorCounts.get(p1.id)!;
        const sectors2 = particleSectorCounts.get(p2.id)!;

        // Check if both particles can accept this connection based on angular distribution
        const canP1Accept = canAddConnection(angles1, angle1, sectors1);
        const canP2Accept = canAddConnection(angles2, angle2, sectors2);

        if (canP1Accept && canP2Accept) {
          // Add the connection
          connections.push({ p1, p2, distance });

          // Update tracking for both particles
          angles1.push(angle1);
          angles2.push(angle2);
          sectors1[getAngularSector(angle1)]++;
          sectors2[getAngularSector(angle2)]++;
        }
      }

      return connections;
    };

    const findTriangles = (connections: Connection[]): Triangle[] => {
      const triangles: Triangle[] = [];
      const connectionMap = new Map<number, Set<number>>();

      connections.forEach(conn => {
        if (!connectionMap.has(conn.p1.id)) connectionMap.set(conn.p1.id, new Set());
        if (!connectionMap.has(conn.p2.id)) connectionMap.set(conn.p2.id, new Set());
        connectionMap.get(conn.p1.id)!.add(conn.p2.id);
        connectionMap.get(conn.p2.id)!.add(conn.p1.id);
      });

      const points = pointsRef.current;
      const pointMap = new Map(points.map(p => [p.id, p]));
      const seen = new Set<string>();

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const neighbors1 = connectionMap.get(p1.id);
        if (!neighbors1) continue;

        for (const n2Id of neighbors1) {
          const neighbors2 = connectionMap.get(n2Id);
          if (!neighbors2) continue;

          for (const n3Id of neighbors2) {
            if (n3Id === p1.id) continue;
            if (neighbors1.has(n3Id)) {
              const ids = [p1.id, n2Id, n3Id].sort((a, b) => a - b);
              const key = ids.join('-');
              if (!seen.has(key)) {
                seen.add(key);
                triangles.push({
                  p1: pointMap.get(ids[0])!,
                  p2: pointMap.get(ids[1])!,
                  p3: pointMap.get(ids[2])!,
                  key,
                });
              }
            }
          }
        }
      }

      return triangles;
    };



    const drawLine = (
      p1: Point, p2: Point, distance: number,
      color: { r: number; g: number; b: number }
    ) => {
      const maxDist = connectionRadiusRef.current;
      const distanceFactor = 1 - (distance / maxDist);
      const alpha = BASE_ALPHA * distanceFactor;
      const midAlpha = alpha * 0.2;

      const gradient = ctx.createLinearGradient(p1.x + p1.tx, p1.y + p1.ty, p2.x + p2.tx, p2.y + p2.ty);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${midAlpha})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);

      ctx.beginPath();
      ctx.moveTo(p1.x + p1.tx, p1.y + p1.ty);
      ctx.lineTo(p2.x + p2.tx, p2.y + p2.ty);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = LINE_WIDTH;
      ctx.stroke();
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(15, 14, 13, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const points = pointsRef.current;
      const connections = findConnections();
      const triangles = findTriangles(connections);
      trianglesRef.current = triangles;

      const drawnEdges = new Set<string>();

      triangles.forEach((tri, idx) => {
        const color = idx % 2 === 0 ? AMBER_COLOR : GREEN_COLOR;

        const edges = [
          [tri.p1, tri.p2],
          [tri.p2, tri.p3],
          [tri.p3, tri.p1],
        ];

        edges.forEach(([pa, pb]) => {
          const edgeKey = [pa.id, pb.id].sort((a, b) => a - b).join('-');
          if (!drawnEdges.has(edgeKey)) {
            drawnEdges.add(edgeKey);
            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            drawLine(pa, pb, dist, color);
          }
        });
      });

      connections.forEach((conn, idx) => {
        const edgeKey = [conn.p1.id, conn.p2.id].sort((a, b) => a - b).join('-');
        if (!drawnEdges.has(edgeKey)) {
          const color = idx % 2 === 0 ? AMBER_COLOR : GREEN_COLOR;
          drawLine(conn.p1, conn.p2, conn.distance, color);
        }
      });

      points.forEach((point, idx) => {
        const color = idx % 2 === 0 ? AMBER_COLOR : GREEN_COLOR;
        ctx.beginPath();
        ctx.arc(point.x + point.tx, point.y + point.ty, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
        ctx.fill();
      });
    };

    const animate = () => {
      updatePoints();
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();

    // Clear canvas immediately with solid background
    ctx.fillStyle = 'rgb(15, 14, 13)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Warm up the simulation - run several update cycles before first visible frame
    // This makes the particles spread out and connections form naturally
    for (let i = 0; i < 60; i++) {
      updatePoints();
    }

    // Draw the warmed-up state immediately
    draw();

    animate();

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef, isPausedRef, mousePositionRef, isMouseActiveRef]);

  return { pointsRef, trianglesRef };
};

