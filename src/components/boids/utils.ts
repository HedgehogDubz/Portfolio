/**
 * Calculate the smallest angle difference between two angles, accounting for wrapping.
 * Returns the smallest of: (target - current), (target - current + 2π), (target - current - 2π)
 */
export const getSmallestAngleDifference = (currentAngle: number, targetAngle: number): number => {
  const a = targetAngle - currentAngle;
  const b = targetAngle - currentAngle + 2 * Math.PI;
  const c = targetAngle - currentAngle - 2 * Math.PI;

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
export const normalizeAngle = (angle: number): number => {
  if (angle >= 0) {
    return angle % (2 * Math.PI);
  } else {
    return (2 * Math.PI) - ((-angle) % (2 * Math.PI));
  }
};

