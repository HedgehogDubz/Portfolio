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

// Navigation grid configuration - easily customizable
interface NavItem {
  id: string;
  title: string;
  icon: string; // Path to icon image
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'about', title: 'About', icon: '/icons/portfolio_about.png', description: 'Learn more about me' },
  { id: 'projects', title: 'Projects', icon: '/icons/portfolio_projects.png', description: 'View my work' },
  { id: 'timeline', title: 'Timeline', icon: '/icons/portfolio_timeline.png', description: 'My journey' },
  { id: 'home', title: 'Home', icon: '/icons/portfolio_backarrow.png', description: 'Return to start' },
  { id: 'resume', title: 'Resume', icon: '/icons/portfolio_resume.png', description: 'My experience' },
  { id: 'contact', title: 'Contact', icon: '/icons/portfolio_contact.png', description: 'Get in touch' },
];

// Profile Card Configuration - easily editable
const PROFILE_CONFIG = {
  imagePath: '/images/profile.jpg', // Change this to your profile image path
  name: 'Tristan',
  title: 'Developer',
  fallbackInitial: 'T', // Used if image fails to load
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Boid density
const BOID_DENSITY = 1; // Boids per 10,000 square pixels

// Speed constants
const MAX_SPEED = 6; // Maximum speed when going straight
const MIN_SPEED = 6; // Minimum speed when turning sharply
const TURNING_HISTORY_LENGTH = 7; // Number of frames to track for turning consistency
const SPEED_SMOOTHING = 1; // How quickly speed adjusts (0-1, lower = smoother)

// Turning constants
const ANGLE_INTERPOLATE = 0.1; // Angle interpolation factor
const MIN_TURN_THRESHOLD = 10 * (Math.PI / 180); // Minimum angle difference to trigger turning (10 degrees in radians)

// Vision constants
const LOOKING_ANGLE = Math.PI * 3 / 2; // Field of view angle for boid vision (270 degrees)

// Behavior radii
const COHESION_RADIUS = 30000; // Radius to look for nearby boids for cohesion
const SEPARATION_DISTANCE = 800; // Distance threshold for separation
const ALIGNMENT_RADIUS = 30000; // Radius for alignment behavior

// Behavior strengths
const COHESION_STRENGTH = 0.02; // Gentle cohesion strength
const SEPARATION_STRENGTH = 1.0; // Separation turning strength (multiplier for ANGLE_INTERPOLATE)
const ALIGNMENT_STRENGTH = 1.5; // Alignment turning strength (multiplier for ANGLE_INTERPOLATE)

// Mouse attraction constants
const MOUSE_ATTRACTION_STRENGTH = 0.035; // Strength of mouse attraction force
const MOUSE_ATTRACTION_RADIUS = 1005000; // Maximum distance for mouse attraction

// Visual constants
const TEXT_AVOIDANCE_DISTANCE = 150; // Distance to avoid text when spawning
const SPAWN_MARGIN = 50; // Margin from edges when spawning boids

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the smallest angle difference between two angles, accounting for wrapping
 * Returns the smallest of: (target - current), (target - current + 2π), (target - current - 2π)
 */
const getSmallestAngleDifference = (currentAngle: number, targetAngle: number): number => {
  const a = targetAngle - currentAngle;
  const b = targetAngle - currentAngle + 2 * Math.PI;
  const c = targetAngle - currentAngle - 2 * Math.PI;

  // Find the smallest absolute value
  if (Math.abs(a) <= Math.abs(b) && Math.abs(a) <= Math.abs(c)) {
    return a;
  }
  if (Math.abs(b) <= Math.abs(a) && Math.abs(b) <= Math.abs(c)) {
    return b;
  }
  return c;
};

/**
 * Normalize angle to [0, 2π] range
 */
const normalizeAngle = (angle: number): number => {
  if (angle >= 0) {
    return angle % (2 * Math.PI);
  } else {
    return (2 * Math.PI) - ((-angle) % (2 * Math.PI));
  }
};

// ============================================================================

const BoidsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navBgCanvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const textBoundsRef = useRef<Rectangle>({ x: 0, y: 0, width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const nextBoidIdRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef<boolean>(false); // Use ref to avoid re-running animation effect
  const [isFadedOut, setIsFadedOut] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showNavGrid, setShowNavGrid] = useState(false); // Navigation grid visibility
  const [activeSection, setActiveSection] = useState<string | null>(null); // Current active section

  // Typewriter effect state
  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const [displayedName, setDisplayedName] = useState('');
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [displayedPrompt, setDisplayedPrompt] = useState('');

  // Mouse tracking state
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseActiveRef = useRef<boolean>(false);

  // Sync isPaused state with ref so animation loop can access current value
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Typewriter effect for terminal text
  useEffect(() => {
    const greetingText = "Hi! I'm";
    const nameText = "Tristan Winata";
    const promptText = "> Click or Scroll to continue"; // No underscore in the text

    // Show greeting and name immediately
    setDisplayedGreeting(greetingText);
    setDisplayedName(nameText);

    // Wait 2 seconds, then show and type the prompt
    setShowContinuePrompt(true);
    setDisplayedPrompt(">");

    setTimeout(() => {

      let promptIndex = 1;
      const promptInterval = setInterval(() => {
        if (promptIndex <= promptText.length) {
          setDisplayedPrompt(promptText.slice(0, promptIndex));
          promptIndex++;
        } else {
          clearInterval(promptInterval);
        }
      }, 50); // Typing speed for prompt
    }, 1000);
  }, []);

  // Mouse tracking for boid attraction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Helper function to check if mouse is in an exclusion zone
    const isInExclusionZone = (x: number, y: number): boolean => {
      // Get header bounds (top navigation bar)
      const header = document.querySelector('.header');
      if (header) {
        const headerRect = header.getBoundingClientRect();
        if (x >= headerRect.left && x <= headerRect.right &&
            y >= headerRect.top && y <= headerRect.bottom) {
          return true;
        }
      }

      // Get center retro window bounds
      const retroWindow = document.querySelector('.retro-window');
      if (retroWindow) {
        const windowRect = retroWindow.getBoundingClientRect();
        if (x >= windowRect.left && x <= windowRect.right &&
            y >= windowRect.top && y <= windowRect.bottom) {
          return true;
        }
      }

      // Get attribution link bounds
      const attribution = document.querySelector('.attribution-link');
      if (attribution) {
        const attrRect = attribution.getBoundingClientRect();
        if (x >= attrRect.left && x <= attrRect.right &&
            y >= attrRect.top && y <= attrRect.bottom) {
          return true;
        }
      }

      return false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Don't track mouse if canvas is faded out
      if (isFadedOut) {
        isMouseActiveRef.current = false;
        mousePositionRef.current = null;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if mouse is in an exclusion zone
      if (isInExclusionZone(e.clientX, e.clientY)) {
        isMouseActiveRef.current = false;
        mousePositionRef.current = null;
      } else {
        isMouseActiveRef.current = true;
        mousePositionRef.current = { x, y };
      }
    };

    const handleMouseLeave = () => {
      isMouseActiveRef.current = false;
      mousePositionRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isFadedOut]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Use container dimensions for proper sizing within bevel frame
      const container = canvas.parentElement;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;

      // Only resize if dimensions actually changed (prevents unnecessary redraws)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        createTextBounds();
        if (boidsRef.current.length > 0) {
          adjustBoidCount();
        }
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

          // Use improved angle difference calculation
          const angleDiff = getSmallestAngleDifference(boid.angle, angleToCenter);

          // Only apply cohesion if angle difference is significant
          if (Math.abs(angleDiff) > MIN_TURN_THRESHOLD) {
            boidInteractionAngleDelta += angleDiff * COHESION_STRENGTH;
            hasBoidInteraction = true;
          }
        }

        // Mouse attraction: Steer towards mouse cursor if active
        if (isMouseActiveRef.current && mousePositionRef.current) {
          const mouseX = mousePositionRef.current.x;
          const mouseY = mousePositionRef.current.y;

          // Calculate distance to mouse using torus wrapping for consistency
          const { dx, dy, distanceSquared } = getTorusDistance(boid.x, boid.y, mouseX, mouseY);

          // Only attract if within radius
          if (distanceSquared < MOUSE_ATTRACTION_RADIUS) {
            const angleToMouse = Math.atan2(dy, dx);

            // Use improved angle difference calculation
            const angleDiff = getSmallestAngleDifference(boid.angle, angleToMouse);

            // Only apply mouse attraction if angle difference is significant
            if (Math.abs(angleDiff) > MIN_TURN_THRESHOLD) {
              boidInteractionAngleDelta += angleDiff * MOUSE_ATTRACTION_STRENGTH;
              hasBoidInteraction = true;
            }
          }
        }

        // Separation: Move away from nearest boid if too close
        if (nearestBoid) {
          const dx = nearestDx;
          const dy = nearestDy;
          const distanceSquared = nearestDistanceSquared;

          // Calculate angle to nearest boid
          const angleToNearest = Math.atan2(dy, dx);

          // Use improved angle difference calculation
          let posAngle = getSmallestAngleDifference(boid.angle, angleToNearest);

          if (Math.abs(posAngle) < LOOKING_ANGLE) {
            // Check if nearest boid is close enough for separation (red line)
            if (distanceSquared < SEPARATION_DISTANCE) {
              // Only turn away if angle difference is significant
              if (Math.abs(posAngle) > MIN_TURN_THRESHOLD) {
                // Turn away from the nearest boid
                if (posAngle > 0) {
                  boidInteractionAngleDelta += -ANGLE_INTERPOLATE * SEPARATION_STRENGTH;
                  hasBoidInteraction = true;
                } else if (posAngle < 0) {
                  boidInteractionAngleDelta += ANGLE_INTERPOLATE * SEPARATION_STRENGTH;
                  hasBoidInteraction = true;
                }
              }
            }

            // Alignment: Match direction with nearest boid (blue line)
            else if (distanceSquared < ALIGNMENT_RADIUS) {
              // Use improved angle difference calculation for alignment
              const dtheta = getSmallestAngleDifference(boid.angle, nearestBoid.angle);

              // Only align if angle difference is significant
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

        // Apply boid interaction forces (no wall avoidance in torus mode)
        if (hasBoidInteraction) {
          boid.angle += boidInteractionAngleDelta;
          // Normalize angle to [0, 2π] range
          boid.angle = normalizeAngle(boid.angle);
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

        // Alternate between amber and green phosphor colors for retro CRT aesthetic
        const isAmber = index % 2 === 0;

        if (isAmber) {
          // Amber phosphor with subtle glow
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(232, 212, 160, 0.7)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(232, 212, 160, 0.9)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Green phosphor with subtle glow
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(160, 184, 158, 0.65)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(160, 184, 158, 0.85)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Reset shadow for next boid
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

  // Draw checkerboard tiles on nav background canvas
  useEffect(() => {
    const canvas = navBgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCheckerboard = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Only resize if dimensions changed
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const tileSize = 40; // Size of each tile
      const cols = Math.ceil(width / tileSize);
      const rows = Math.ceil(height / tileSize);

      // Dark colors for retro CRT feel
      const color1 = '#0a0808'; // Near black
      const color2 = '#1a0a0a'; // Very dark red

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const isEven = (row + col) % 2 === 0;
          ctx.fillStyle = isEven ? color1 : color2;
          ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
      }
    };

    drawCheckerboard();

    const handleResize = () => drawCheckerboard();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showNavGrid]);

  // Function to trigger fade out and show navigation grid
  const triggerFadeOut = () => {
    if (!isFadedOut) {
      setIsFadedOut(true);
      // Show navigation grid immediately - it will fade in as boids fade out
      setShowNavGrid(true);

      // Pause boids after they've faded
      setTimeout(() => {
        setIsPaused(true);
      }, 600);
    }
  };

  // Function to return to home (boids canvas)
  const returnToHome = () => {
    setShowNavGrid(false);
    setIsFadedOut(false);
    setIsPaused(false);
    setActiveSection(null);
  };

  // Function to handle navigation item click
  const handleNavClick = (itemId: string) => {
    if (itemId === 'home') {
      returnToHome();
    } else {
      setActiveSection(itemId);
      // TODO: Navigate to the appropriate section/page
      console.log(`Navigate to: ${itemId}`);
    }
  };



  return (
    <>
      {/* CRT Monitor Frame with Clip-Path Bevels */}
      <div className="crt-monitor-frame">
        {/* Outer bevel edges */}
        <div className="bevel-top"></div>
        <div className="bevel-bottom"></div>
        {/* Inner bevel container */}
        <div className="inner-bevel-frame">
          <div className="inner-bevel-top"></div>
          <div className="inner-bevel-bottom"></div>
        </div>
        {/* Brand label */}
        <div className="crt-brand-label">Porky Device 088</div>
      </div>

      <div
        ref={containerRef}
        className={`boids-container ${isFadedOut ? 'faded-out' : ''}`}
        onClick={triggerFadeOut}
        style={{ cursor: isFadedOut ? 'default' : 'pointer' }}
      >
        {/* Header with hedgehog button */}
        <Header />

        <canvas ref={canvasRef} className="boids-canvas" />

        {/* Header text at center - Retro window style */}
        <div className="retro-window">
          {/* Window title bar */}
          <div className="window-title-bar">
            <div className="window-title">WELCOME.SYS</div>
            <div className="window-controls">
              <div className="window-button minimize">_</div>
              <div className="window-button maximize">□</div>
              <div className="window-button close">×</div>
            </div>
          </div>
          {/* Window content */}
          <div className="window-content">
            <div className="terminal-line">
              <span className="header-greeting">{displayedGreeting}</span>
            </div>
            <div className="terminal-line">
              <span className="header-name">{displayedName}</span>
            </div>
            {showContinuePrompt && (
              <div className="terminal-line continue-prompt">
                <span className="terminal-continue">
                  {displayedPrompt}
                  <span className="blinking-cursor">_</span>
                </span>
              </div>
            )}
          </div>
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
      </div>

      {/* Navigation Grid - appears after dismissing boids canvas */}
      <div className={`nav-grid-container ${showNavGrid ? 'visible' : ''}`}>
        {/* Checkerboard background canvas */}
        <canvas ref={navBgCanvasRef} className="nav-bg-canvas" />

        {/* Profile Card - positioned to the left of the nav grid */}
        <div
          className="profile-card nav-grid-item"
          style={{ '--item-index': 0 } as React.CSSProperties}
        >
          <div className="profile-image-wrapper">
            <img
              src={PROFILE_CONFIG.imagePath}
              alt={`${PROFILE_CONFIG.name}'s profile`}
              className="profile-image"
              onError={(e) => {
                // Fallback to placeholder with initial if image fails to load
                (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233d3934" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="%23E8D4A0" font-size="50" font-family="monospace">${PROFILE_CONFIG.fallbackInitial}</text></svg>`;
              }}
            />
          </div>
          <div className="profile-info">
            <span className="profile-name">{PROFILE_CONFIG.name}</span>
            <span className="profile-title">{PROFILE_CONFIG.title}</span>
          </div>
        </div>

        {/* Navigation Grid - 3x2 grid of nav buttons */}
        <div className="nav-grid">
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.id}
              className="nav-grid-item"
              style={{ '--item-index': index} as React.CSSProperties}
              onClick={() => handleNavClick(item.id)}
              aria-label={item.description || item.title}
            >
              <div className="nav-icon-wrapper">
                <img
                  src={item.icon}
                  alt={item.title}
                  className="nav-icon-image"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233d3934" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23E8D4A0" font-size="40">${item.title.charAt(0)}</text></svg>`;
                  }}
                />
              </div>
              <span className="nav-icon-title">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default BoidsCanvas;

