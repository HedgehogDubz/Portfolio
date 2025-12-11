/**
 * BOIDS SIMULATION - PRESERVED FOR RESTORATION
 * 
 * This file contains the original boids flocking simulation code.
 * It can be used to restore the boids animation if needed.
 * 
 * Based on Craig Reynolds' Flocking Model
 * https://www.cs.toronto.edu/~dt/siggraph97-course/cwr87/
 */

import { useRef, useEffect } from 'react';
import type { Boid, Rectangle } from './types';
import { getSmallestAngleDifference, normalizeAngle } from './utils';
import {
  BOID_DENSITY,
  MAX_SPEED,
  MIN_SPEED,
  TURNING_HISTORY_LENGTH,
  SPEED_SMOOTHING,
  ANGLE_INTERPOLATE,
  MIN_TURN_THRESHOLD,
  LOOKING_ANGLE,
  COHESION_RADIUS,
  SEPARATION_DISTANCE,
  ALIGNMENT_RADIUS,
  COHESION_STRENGTH,
  SEPARATION_STRENGTH,
  ALIGNMENT_STRENGTH,
  MOUSE_ATTRACTION_STRENGTH,
  MOUSE_ATTRACTION_RADIUS,
  TEXT_AVOIDANCE_DISTANCE,
  SPAWN_MARGIN,
} from './constants';

interface UseBoidsSimulationProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPausedRef: React.MutableRefObject<boolean>;
  mousePositionRef: React.MutableRefObject<{ x: number; y: number } | null>;
  isMouseActiveRef: React.MutableRefObject<boolean>;
}

export const useBoidsSimulation = ({
  canvasRef,
  isPausedRef,
  mousePositionRef,
  isMouseActiveRef,
}: UseBoidsSimulationProps) => {
  const boidsRef = useRef<Boid[]>([]);
  const textBoundsRef = useRef<Rectangle>({ x: 0, y: 0, width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const nextBoidIdRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        createTextBounds();
        if (boidsRef.current.length > 0) {
          adjustBoidCount();
        }
      }
    };

    const createTextBounds = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.font = 'bold 120px Arial';
      const textMetrics = tempCtx.measureText('TRISTAN WINATA');
      const textWidth = textMetrics.width;
      const textHeight = 120;
      const padding = 30;

      textBoundsRef.current = {
        x: canvas.width / 2 - textWidth / 2 - padding,
        y: canvas.height / 2 - textHeight / 2 - padding,
        width: textWidth + padding * 2,
        height: textHeight + padding * 2,
      };
    };

    const getTargetBoidCount = () => {
      const area = canvas.width * canvas.height;
      return Math.round((area / 10000) * BOID_DENSITY);
    };

    const isNearText = (x: number, y: number, distance: number): boolean => {
      const bounds = textBoundsRef.current;
      const expandedX = bounds.x - distance;
      const expandedY = bounds.y - distance;
      const expandedWidth = bounds.width + distance * 2;
      const expandedHeight = bounds.height + distance * 2;

      return x >= expandedX &&
        x <= expandedX + expandedWidth &&
        y >= expandedY &&
        y <= expandedY + expandedHeight;
    };

    const initBoids = () => {
      boidsRef.current = [];
      nextBoidIdRef.current = 0;
      const targetCount = getTargetBoidCount();
      const margin = 50;

      for (let i = 0; i < targetCount; i++) {
        let x, y;
        let attempts = 0;
        do {
          x = margin + Math.random() * (canvas.width - margin * 2);
          y = margin + Math.random() * (canvas.height - margin * 2);
          attempts++;
        } while (isNearText(x, y, 150) && attempts < 100);

        const angle = Math.random() * Math.PI * 2;
        boidsRef.current.push({
          id: nextBoidIdRef.current++,
          x,
          y,
          angle,
          turningHistory: [],
          currentSpeed: MAX_SPEED,
        });
      }
    };

    const adjustBoidCount = () => {
      const targetCount = getTargetBoidCount();
      const currentCount = boidsRef.current.length;
      const difference = targetCount - currentCount;

      if (Math.abs(difference) < 1) return;

      if (difference > 0) {
        const boidsToAdd = Math.round(difference);
        for (let i = 0; i < boidsToAdd; i++) {
          let x, y;
          let attempts = 0;
          do {
            x = SPAWN_MARGIN + Math.random() * (canvas.width - SPAWN_MARGIN * 2);
            y = SPAWN_MARGIN + Math.random() * (canvas.height - SPAWN_MARGIN * 2);
            attempts++;
          } while (isNearText(x, y, TEXT_AVOIDANCE_DISTANCE) && attempts < 100);

          const angle = Math.random() * Math.PI * 2;
          boidsRef.current.push({
            id: nextBoidIdRef.current++,
            x,
            y,
            angle,
            turningHistory: [],
            currentSpeed: MAX_SPEED,
          });
        }
      } else if (difference < 0) {
        const boidsToRemove = Math.round(Math.abs(difference));
        boidsRef.current.splice(-boidsToRemove, boidsToRemove);
      }
    };

    const updateBoids = () => {
      if (isPausedRef.current) return;

      adjustBoidCount();
      const boids = boidsRef.current;

      boids.forEach((boid) => {
        if (boid.x < 0) boid.x += canvas.width;
        else if (boid.x > canvas.width) boid.x -= canvas.width;
        if (boid.y < 0) boid.y += canvas.height;
        else if (boid.y > canvas.height) boid.y -= canvas.height;

        const getTorusDistance = (x1: number, y1: number, x2: number, y2: number) => {
          let dx = x2 - x1;
          let dy = y2 - y1;
          if (Math.abs(dx) > canvas.width / 2) {
            dx = dx > 0 ? dx - canvas.width : dx + canvas.width;
          }
          if (Math.abs(dy) > canvas.height / 2) {
            dy = dy > 0 ? dy - canvas.height : dy + canvas.height;
          }
          return { dx, dy, distanceSquared: dx * dx + dy * dy };
        };

        let nearestBoid = null;
        let nearestDistanceSquared = Infinity;
        let nearestDx = 0;
        let nearestDy = 0;

        for (const otherBoid of boids) {
          if (otherBoid.id === boid.id) continue;
          const { dx, dy, distanceSquared } = getTorusDistance(boid.x, boid.y, otherBoid.x, otherBoid.y);
          if (distanceSquared < nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared;
            nearestBoid = otherBoid;
            nearestDx = dx;
            nearestDy = dy;
          }
        }

        let boidInteractionAngleDelta = 0;
        let hasBoidInteraction = false;

        // Cohesion
        let centerX = 0;
        let centerY = 0;
        let nearbyCount = 0;

        for (const otherBoid of boids) {
          if (otherBoid.id === boid.id) continue;
          const { dx, dy, distanceSquared } = getTorusDistance(boid.x, boid.y, otherBoid.x, otherBoid.y);
          if (distanceSquared < COHESION_RADIUS) {
            centerX += boid.x + dx;
            centerY += boid.y + dy;
            nearbyCount++;
          }
        }

        if (nearbyCount > 0) {
          centerX /= nearbyCount;
          centerY /= nearbyCount;
          const { dx: centerDx, dy: centerDy } = getTorusDistance(boid.x, boid.y, centerX, centerY);
          const angleToCenter = Math.atan2(centerDy, centerDx);
          const angleDiff = getSmallestAngleDifference(boid.angle, angleToCenter);
          if (Math.abs(angleDiff) > MIN_TURN_THRESHOLD) {
            boidInteractionAngleDelta += angleDiff * COHESION_STRENGTH;
            hasBoidInteraction = true;
          }
        }

        // Mouse attraction
        if (isMouseActiveRef.current && mousePositionRef.current) {
          const mouseX = mousePositionRef.current.x;
          const mouseY = mousePositionRef.current.y;
          const { dx, dy, distanceSquared } = getTorusDistance(boid.x, boid.y, mouseX, mouseY);
          if (distanceSquared < MOUSE_ATTRACTION_RADIUS) {
            const angleToMouse = Math.atan2(dy, dx);
            const angleDiff = getSmallestAngleDifference(boid.angle, angleToMouse);
            if (Math.abs(angleDiff) > MIN_TURN_THRESHOLD) {
              boidInteractionAngleDelta += angleDiff * MOUSE_ATTRACTION_STRENGTH;
              hasBoidInteraction = true;
            }
          }
        }

        // Separation
        if (nearestBoid) {
          const dx = nearestDx;
          const dy = nearestDy;
          const distanceSquared = nearestDistanceSquared;
          const angleToNearest = Math.atan2(dy, dx);
          let posAngle = getSmallestAngleDifference(boid.angle, angleToNearest);

          if (Math.abs(posAngle) < LOOKING_ANGLE) {
            if (distanceSquared < SEPARATION_DISTANCE) {
              if (Math.abs(posAngle) > MIN_TURN_THRESHOLD) {
                if (posAngle > 0) {
                  boidInteractionAngleDelta += -ANGLE_INTERPOLATE * SEPARATION_STRENGTH;
                  hasBoidInteraction = true;
                } else if (posAngle < 0) {
                  boidInteractionAngleDelta += ANGLE_INTERPOLATE * SEPARATION_STRENGTH;
                  hasBoidInteraction = true;
                }
              }
            } else if (distanceSquared < ALIGNMENT_RADIUS) {
              const dtheta = getSmallestAngleDifference(boid.angle, nearestBoid.angle);
              if (Math.abs(dtheta) > MIN_TURN_THRESHOLD) {
                if (dtheta > 0) {
                  boidInteractionAngleDelta += ANGLE_INTERPOLATE * ALIGNMENT_STRENGTH;
                  hasBoidInteraction = true;
                } else if (dtheta < 0) {
                  boidInteractionAngleDelta += -ANGLE_INTERPOLATE * ALIGNMENT_STRENGTH;
                  hasBoidInteraction = true;
                }
              }
            }
          }
        }

        if (hasBoidInteraction) {
          boid.angle += boidInteractionAngleDelta;
          boid.angle = normalizeAngle(boid.angle);
        }

        boid.turningHistory.push(boidInteractionAngleDelta);
        if (boid.turningHistory.length > TURNING_HISTORY_LENGTH) {
          boid.turningHistory.shift();
        }

        let targetSpeed = MAX_SPEED;
        if (boid.turningHistory.length >= 3) {
          const recentTurns = boid.turningHistory.slice(-TURNING_HISTORY_LENGTH);
          const absTurns = recentTurns.map(t => Math.abs(t));
          const avgAbsTurn = absTurns.reduce((sum, turn) => sum + turn, 0) / absTurns.length;
          const allSameSign = recentTurns.every(t => t >= 0) || recentTurns.every(t => t <= 0);
          if (allSameSign && avgAbsTurn > 0.02) {
            const turnIntensity = Math.min(avgAbsTurn / 0.15, 1);
            targetSpeed = MAX_SPEED - (MAX_SPEED - MIN_SPEED) * turnIntensity;
          } else {
            targetSpeed = MAX_SPEED;
          }
        }

        boid.currentSpeed += (targetSpeed - boid.currentSpeed) * SPEED_SMOOTHING;
        boid.x += Math.cos(boid.angle) * boid.currentSpeed;
        boid.y += Math.sin(boid.angle) * boid.currentSpeed;
      });
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(15, 14, 13, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      boidsRef.current.forEach((boid, index) => {
        ctx.save();
        ctx.translate(boid.x, boid.y);
        ctx.rotate(boid.angle);

        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-14, 10);
        ctx.lineTo(-14, -10);
        ctx.closePath();

        const isAmber = index % 2 === 0;
        if (isAmber) {
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(232, 212, 160, 0.7)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(232, 212, 160, 0.9)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(160, 184, 158, 0.65)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(160, 184, 158, 0.85)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });
    };

    const animate = () => {
      updateBoids();
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initBoids();
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

  return { boidsRef };
};

