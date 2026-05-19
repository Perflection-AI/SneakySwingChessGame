/**
 * Overflow check for brainrot cards with Power > 10.
 * Returns overshoot parameters if triggered, null otherwise.
 */
export function checkOverflow(power) {
  if (power <= 10) return null

  const overflow = power - 10
  const chance = Math.min(0.95, 0.1 + overflow * 0.17)
  if (Math.random() >= chance) return null

  return {
    distMultiplier: 1.1 + overflow * 0.22 + Math.random() * 0.3,
    wobbleYd: overflow * 5,
  }
}
