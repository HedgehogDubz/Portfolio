import React, { useEffect, useRef, useState } from 'react';
import './BoidsCanvas.css';
import Header from './Header';

interface Boid {
  id: number;
  x: number;
  y: number;
  angle: number;
  turningHistory: number[]; 
  currentSpeed: number; 
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Boid density
const BOID_DENSITY = 1; // Boids per 10,000 square pixels

// Speed constants
const MAX_SPEED = 5; // Maximum speed when going straight
const MIN_SPEED = 1; // Minimum speed when turning sharply
const TURNING_HISTORY_LENGTH = 10; // Number of frames to track for turning consistency
const SPEED_SMOOTHING = 1; // How quickly speed adjusts (0-1, lower = smoother)

// Turning constants
const ANGLE_INTERPOLATE = 0.1; // Angle interpolation factor

// Behavior radii
const COHESION_RADIUS = 10000; // Radius to look for nearby boids for cohesion
const SEPARATION_DISTANCE = 1000; // Distance threshold for separation
const ALIGNMENT_RADIUS = 10000; // Radius for alignment behavior

// Behavior strengths
const COHESION_STRENGTH = 0.02; // Gentle cohesion strength
const SEPARATION_STRENGTH = 1.0; // Separation turning strength (multiplier for ANGLE_INTERPOLATE)
const ALIGNMENT_STRENGTH = 1.0; // Alignment turning strength (multiplier for ANGLE_INTERPOLATE)

// Visual constants
const TEXT_AVOIDANCE_DISTANCE = 150; // Distance to avoid text when spawning
const SPAWN_MARGIN = 50; // Margin from edges when spawning boids

// ============================================================================

const BoidsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const textBoundsRef = useRef<Rectangle>({ x: 0, y: 0, width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const nextBoidIdRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef<boolean>(false); // Use ref to avoid re-running animation effect
  const [isFadedOut, setIsFadedOut] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Sync isPaused state with ref so animation loop can access current value
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createTextBounds();
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

      tempCtx.font = 'bold 120px Arial';
      const textMetrics = tempCtx.measureText('TRISTAN WINATA');
      const textWidth = textMetrics.width;
      const textHeight = 120; // Font size

      const padding = 30; // Reduced from 80 to 30

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

    // Adjust boid count to maintain constant density (only when threshold is reached)
    const adjustBoidCount = () => {
      const targetCount = getTargetBoidCount();
      const currentCount = boidsRef.current.length;
      const difference = targetCount - currentCount;

      if (Math.abs(difference) < 1) {
        return; 
      }

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

    // Check if position is near text using rectangle bounds (MUCH faster)
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

    const updateBoids = () => {
      // Skip animation if paused (scrolled out of view)
      if (isPausedRef.current) {
        return;
      }

      adjustBoidCount();

      const boids = boidsRef.current;

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

          if (Math.abs(dx) > canvas.width / 2) {
            dx = dx > 0 ? dx - canvas.width : dx + canvas.width;
          }

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

        let boidInteractionAngleDelta = 0;
        let hasBoidInteraction = false;

        // Cohesion: Find center of mass of all boids within radius
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

        // If there are nearby boids, steer towards their center
        if (nearbyCount > 0) {
          centerX /= nearbyCount;
          centerY /= nearbyCount;

          const { dx: centerDx, dy: centerDy } = getTorusDistance(boid.x, boid.y, centerX, centerY);
          const angleToCenter = Math.atan2(centerDy, centerDx);

          let angleDiff = angleToCenter - boid.angle;
          if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          const targetX = boid.x + centerDx;
          const targetY = boid.y + centerDy;

          ctx.beginPath();
          ctx.moveTo(boid.x, boid.y);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = 'rgba(100, 255, 100, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Apply cohesion force (gentle steering towards center)
          boidInteractionAngleDelta += angleDiff * COHESION_STRENGTH;
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
            if (distanceSquared < SEPARATION_DISTANCE) {
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
                boidInteractionAngleDelta += -1 * ANGLE_INTERPOLATE * SEPARATION_STRENGTH;
                hasBoidInteraction = true;
              } else if (posAngle < 0) {
                boidInteractionAngleDelta += 1 * ANGLE_INTERPOLATE * SEPARATION_STRENGTH;
                hasBoidInteraction = true;
              }
            }

            // Alignment: Match direction with nearest boid (blue line)
            else if (distanceSquared < ALIGNMENT_RADIUS) {
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
                boidInteractionAngleDelta += ANGLE_INTERPOLATE * ALIGNMENT_STRENGTH;
                hasBoidInteraction = true;
              } else if (dtheta < 0) {
                boidInteractionAngleDelta += -ANGLE_INTERPOLATE * ALIGNMENT_STRENGTH;
                hasBoidInteraction = true;
              }
            }
          }
        }

        // Apply boid interaction forces (no wall avoidance in torus mode)
        if (hasBoidInteraction) {
          boid.angle += boidInteractionAngleDelta;
        }

        // Update turning history with current angle delta
        boid.turningHistory.push(boidInteractionAngleDelta);
        if (boid.turningHistory.length > TURNING_HISTORY_LENGTH) {
          boid.turningHistory.shift(); // Remove oldest entry
        }

        // Calculate turning consistency to determine speed
        // Sustained turning in one direction = slow down
        // Straight or alternating = speed up
        let targetSpeed = MAX_SPEED;

        if (boid.turningHistory.length >= 3) {
          // Calculate turning consistency
          const recentTurns = boid.turningHistory.slice(-TURNING_HISTORY_LENGTH); // Look at last 5 frames
          const absTurns = recentTurns.map(t => Math.abs(t));
          const avgAbsTurn = absTurns.reduce((sum, turn) => sum + turn, 0) / absTurns.length;

          // Check if turning is sustained (same direction)
          const allSameSign = recentTurns.every(t => t >= 0) || recentTurns.every(t => t <= 0);

          if (allSameSign && avgAbsTurn > 0.02) {
            const turnIntensity = Math.min(avgAbsTurn / 0.15, 1); // Normalize to 0-1
            targetSpeed = MAX_SPEED - (MAX_SPEED - MIN_SPEED) * turnIntensity;
          } else {
            targetSpeed = MAX_SPEED;
          }
        }

        boid.currentSpeed += (targetSpeed - boid.currentSpeed) * SPEED_SMOOTHING;

        boid.x += Math.cos(boid.angle) * boid.currentSpeed;
        boid.y += Math.sin(boid.angle) * boid.currentSpeed;
      });

    }

    // Draw function
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      boidsRef.current.forEach((boid) => {
        ctx.save();
        ctx.translate(boid.x, boid.y);
        ctx.rotate(boid.angle);

        ctx.beginPath();
        ctx.moveTo(20, 0);  
        ctx.lineTo(-14, 10); 
        ctx.lineTo(-14, -10); 
        ctx.closePath();

        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 220, 255, 0.9)';
        ctx.lineWidth = 2; 
        ctx.stroke();

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

    // Resize handler - only resize canvas, don't reinitialize boids
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Function to trigger fade out
  const triggerFadeOut = () => {
    if (!isFadedOut) {
      setIsFadedOut(true);

      // Delay pausing animation until fade transition completes (0.6s)
      setTimeout(() => {
        setIsPaused(true);
      }, 600);
    }
  };

  // Automatic fade out on any downward scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // If scrolled down at all, trigger fade out
      if (scrollY > 0) {
        triggerFadeOut();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isFadedOut]);



  return (
    <>
      <div
        ref={containerRef}
        className={`boids-container ${isFadedOut ? 'faded-out' : ''}`}
        onClick={triggerFadeOut}
        style={{ cursor: isFadedOut ? 'default' : 'pointer' }}
      >
        {/* Header with hedgehog button */}
        <Header />

        <canvas ref={canvasRef} className="boids-canvas" />

        {/* Header text at center */}
        <div className="header-text">
          <div className="header-greeting">Hi! I'm</div>
          <div className="header-name">Tristan Winata</div>
        </div>

        {/* Attribution link at bottom left */}
        <a
          href="https://www.cs.toronto.edu/~dt/siggraph97-course/cwr87/"
          target="_blank"
          rel="noopener noreferrer"
          className="attribution-link"
        >
          Boids based off Craig Reynolds' Flocking Model
        </a>

        {/* Scroll indicator at bottom center */}
        <div className={`scroll-indicator ${isFadedOut ? 'hidden' : ''}`}>
          <div className="scroll-indicator-content">
            <div className="scroll-arrow">↓</div>
            <div className="scroll-text">Scroll</div>
          </div>
        </div>
      </div>

      {/* Portfolio content below */}
      <div className="portfolio-content">
        <section className="portfolio-section">
          <h2>About Me</h2>
          <p>Welcome to my portfolio. I'm a developer passionate about creating interactive experiences.</p>
        </section>

        <section className="portfolio-section">
          <h2>Projects</h2>
          <p>Here are some of my recent projects...</p>
        </section>

        <section className="portfolio-section">
          <h2>Contact</h2>
          <p>Get in touch with me...</p>
        </section>
      </div>
    </>
  );
};

export default BoidsCanvas;

