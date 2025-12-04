import React, { useEffect, useRef } from 'react';
import './BoidsCanvas.css';

interface Boid {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BoidsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const textBoundsRef = useRef<Rectangle>({ x: 0, y: 0, width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const nextBoidIdRef = useRef<number>(0);

  // Constant boid density: boids per 10,000 square pixels
  const BOID_DENSITY = 1; // Approximately 120 boids for a 2000x1000 canvas

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createTextBounds();
      // Adjust boid count when canvas size changes
      if (boidsRef.current.length > 0) {
        adjustBoidCount();
      }
    };

    // Create text bounding box for collision detection (much more efficient)
    const createTextBounds = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Measure text dimensions
      tempCtx.font = 'bold 120px Arial';
      const textMetrics = tempCtx.measureText('TRISTAN WINATA');
      const textWidth = textMetrics.width;
      const textHeight = 120; // Font size

      // Add smaller padding for more form-fitting rectangle
      const padding = 30; // Reduced from 80 to 30

      // Calculate bounding box centered on canvas
      textBoundsRef.current = {
        x: canvas.width / 2 - textWidth / 2 - padding,
        y: canvas.height / 2 - textHeight / 2 - padding,
        width: textWidth + padding * 2,
        height: textHeight + padding * 2,
      };
    };

    // Calculate target number of boids based on canvas area
    const getTargetBoidCount = () => {
      const area = canvas.width * canvas.height;
      return Math.round((area / 10000) * BOID_DENSITY);
    };

    // Initialize boids with density-based count
    const initBoids = () => {
      boidsRef.current = [];
      nextBoidIdRef.current = 0;
      const targetCount = getTargetBoidCount();
      const margin = 50; // Keep boids away from edges initially

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
        });
      }
    };

    // Adjust boid count to maintain constant density (only when threshold is reached)
    const adjustBoidCount = () => {
      const targetCount = getTargetBoidCount();
      const currentCount = boidsRef.current.length;
      const difference = targetCount - currentCount;

      // Only adjust if difference is at least 1 boid (meaningful threshold)
      if (Math.abs(difference) < 1) {
        return; // No adjustment needed
      }

      if (difference > 0) {
        // Add exactly the number of boids needed
        const boidsToAdd = Math.round(difference);
        const margin = 50;

        for (let i = 0; i < boidsToAdd; i++) {
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
          });
        }
      } else if (difference < 0) {
        // Remove exactly the number of excess boids from the end
        const boidsToRemove = Math.round(Math.abs(difference));
        boidsRef.current.splice(-boidsToRemove, boidsToRemove);
      }
    };

    // Check if position is near text using rectangle bounds (MUCH faster)
    const isNearText = (x: number, y: number, distance: number): boolean => {
      const bounds = textBoundsRef.current;

      // Expand the rectangle by the distance parameter
      const expandedX = bounds.x - distance;
      const expandedY = bounds.y - distance;
      const expandedWidth = bounds.width + distance * 2;
      const expandedHeight = bounds.height + distance * 2;

      // Check if point is inside expanded rectangle
      return x >= expandedX &&
        x <= expandedX + expandedWidth &&
        y >= expandedY &&
        y <= expandedY + expandedHeight;
    };

    const updateBoids = () => {
      // Adjust boid count to maintain constant density
      adjustBoidCount();

      const boids = boidsRef.current;
      const constantSpeed = 5; // Fixed speed for all boids - NEVER changes
      const angleInterpolate = 0.1;

      boids.forEach((boid) => {


        // Torus wrap-around: if boid goes off one edge, wrap to the other side
        if (boid.x < 0) {
          boid.x += canvas.width;
        } else if (boid.x > canvas.width) {
          boid.x -= canvas.width;
        }

        if (boid.y < 0) {
          boid.y += canvas.height;
        } else if (boid.y > canvas.height) {
          boid.y -= canvas.height;
        }

        // Helper function to calculate torus distance
        const getTorusDistance = (x1: number, y1: number, x2: number, y2: number) => {
          let dx = x2 - x1;
          let dy = y2 - y1;

          // Wrap around horizontally
          if (Math.abs(dx) > canvas.width / 2) {
            dx = dx > 0 ? dx - canvas.width : dx + canvas.width;
          }

          // Wrap around vertically
          if (Math.abs(dy) > canvas.height / 2) {
            dy = dy > 0 ? dy - canvas.height : dy + canvas.height;
          }

          return { dx, dy, distanceSquared: dx * dx + dy * dy };
        };

        // Find the single nearest boid using torus distance
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

        // Calculate boid interaction forces
        let boidInteractionAngleDelta = 0;
        let hasBoidInteraction = false;

        // Cohesion: Find center of mass of all boids within radius
        const cohesionRadius = 10000; // Radius to look for nearby boids
        let centerX = 0;
        let centerY = 0;
        let nearbyCount = 0;

        for (const otherBoid of boids) {
          if (otherBoid.id === boid.id) continue;
          const { dx, dy, distanceSquared } = getTorusDistance(boid.x, boid.y, otherBoid.x, otherBoid.y);

          if (distanceSquared < cohesionRadius) {
            // Use torus-wrapped position for center calculation
            centerX += boid.x + dx;
            centerY += boid.y + dy;
            nearbyCount++;
          }
        }

        // If there are nearby boids, steer towards their center
        if (nearbyCount > 0) {
          centerX /= nearbyCount;
          centerY /= nearbyCount;

          // Calculate direction to center of mass
          const { dx: centerDx, dy: centerDy } = getTorusDistance(boid.x, boid.y, centerX, centerY);
          const angleToCenter = Math.atan2(centerDy, centerDx);

          // Calculate angle difference
          let angleDiff = angleToCenter - boid.angle;
          if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          // Draw green line to center of mass
          const targetX = boid.x + centerDx;
          const targetY = boid.y + centerDy;

          ctx.beginPath();
          ctx.moveTo(boid.x, boid.y);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = 'rgba(100, 255, 100, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Apply cohesion force (gentle steering towards center)
          boidInteractionAngleDelta += angleDiff * 0.02; // Gentle cohesion strength
          hasBoidInteraction = true;
        }

        // Separation: Move away from nearest boid if too close
        if (nearestBoid) {
          const dx = nearestDx;
          const dy = nearestDy;
          const distanceSquared = nearestDistanceSquared;

          let posAngle = Math.atan2(dy, dx) - boid.angle;

          // Normalize posAngle to [-PI, PI]
          if (posAngle > Math.PI) {
            posAngle -= 2 * Math.PI;
          } else if (posAngle < -Math.PI) {
            posAngle += 2 * Math.PI;
          }

          if (Math.abs(posAngle) < Math.PI * 3 / 2) {
            // Check if nearest boid is close enough for separation (red line)
            if (distanceSquared < 1000) {
              // Draw line using torus-wrapped position
              const targetX = boid.x + dx;
              const targetY = boid.y + dy;

              ctx.beginPath();
              ctx.moveTo(boid.x, boid.y);
              ctx.lineTo(targetX, targetY);
              ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
              ctx.lineWidth = 4;
              ctx.stroke();

              if (posAngle > 0) {
                boidInteractionAngleDelta += -1 * angleInterpolate;
                hasBoidInteraction = true;
              } else if (posAngle < 0) {
                boidInteractionAngleDelta += 1 * angleInterpolate;
                hasBoidInteraction = true;
              }
            }

            // Alignment: Match direction with nearest boid (blue line)
            else if (distanceSquared < 10000) {
              // Draw line using torus-wrapped position
              const targetX = boid.x + dx;
              const targetY = boid.y + dy;

              ctx.beginPath();
              ctx.moveTo(boid.x, boid.y);
              ctx.lineTo(targetX, targetY);
              ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
              ctx.lineWidth = 2;
              ctx.stroke();

              let dtheta = nearestBoid.angle - boid.angle;
              if (dtheta > Math.PI) {
                dtheta -= 2 * Math.PI;
              } else if (dtheta < -Math.PI) {
                dtheta += 2 * Math.PI;
              }
              if (dtheta > 0) {
                boidInteractionAngleDelta += angleInterpolate;
                hasBoidInteraction = true;
              } else if (dtheta < 0) {
                boidInteractionAngleDelta += -angleInterpolate;
                hasBoidInteraction = true;
              }
            }
          }
        }

        // Apply boid interaction forces (no wall avoidance in torus mode)
        if (hasBoidInteraction) {
          boid.angle += boidInteractionAngleDelta;
        }
        // Update position with constant speed
        boid.x += Math.cos(boid.angle) * constantSpeed;
        boid.y += Math.sin(boid.angle) * constantSpeed;
      });

    }

    // Draw function
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw boids as triangles
      boidsRef.current.forEach((boid) => {
        ctx.save();
        ctx.translate(boid.x, boid.y);
        ctx.rotate(boid.angle);

        ctx.beginPath();
        ctx.moveTo(20, 0);  // Increased from 14 to 20 (bigger boids)
        ctx.lineTo(-14, 10); // Increased from -10, 7 to -14, 10
        ctx.lineTo(-14, -10); // Increased from -10, -7 to -14, -10
        ctx.closePath();

        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 220, 255, 0.9)';
        ctx.lineWidth = 2; // Increased from 1.5 to 2
        ctx.stroke();

        ctx.restore();
      });
    };

    // Animation loop
    const animate = () => {
      updateBoids();
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initBoids();
    animate();

    // Resize handler - only resize canvas, don't reinitialize boids
    const handleResize = () => {
      resizeCanvas();
      // adjustBoidCount() is already called in resizeCanvas()
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="boids-container">
      <canvas ref={canvasRef} className="boids-canvas" />
      <div className="name-text">TRISTAN WINATA</div>
    </div>
  );
};

export default BoidsCanvas;

