import { config } from "./config";
import type { Particles } from "./particles";

/**
 * Air streaks left behind the spider when it's really moving, so a throw reads as a throw and a
 * fall as a fall.
 *
 * Each streak is left in the air where the spider just was, drifting slowly backwards and fading,
 * so as the spider pulls away they trail out behind it. They're ordinary dashes from Particles,
 * which draws them along whichever way they drift.
 */

type Vec = [number, number];

export function createSpeedLines(particles: Particles) {
  let owed = 0;

  return {
    /**
     * `center` is the spider's body centre (document px), `velocity` its speed in b/s, `unit` px
     * per b and `radius` half the spider's width in px.
     */
    update(dt: number, center: Vec | null, velocity: Vec, unit: number, radius: number) {
      const s = config.speedLines;
      const speed = Math.hypot(velocity[0], velocity[1]);
      if (!s.enabled || !center || !unit || dt <= 0 || speed < s.minSpeed) {
        owed = 0;
        return;
      }
      const how = Math.max(0, Math.min(1, (speed - s.minSpeed) / Math.max(0.001, s.fullSpeed - s.minSpeed)));
      owed += s.rate * (0.25 + 0.75 * how) * dt;

      const dir: Vec = [velocity[0] / speed, velocity[1] / speed];
      const across: Vec = [-dir[1], dir[0]];
      while (owed >= 1) {
        owed -= 1;
        const side = (Math.random() * 2 - 1) * s.spread * radius;
        const back = s.behind * radius * (0.6 + Math.random() * 0.8);
        // Drifting backwards, which is also the way Particles draws the dash — so it trails away
        // from where the spider is going.
        const drift = Math.max(0.01, s.drift) * speed * unit;
        particles.spawn({
          x: center[0] - dir[0] * back + across[0] * side,
          y: center[1] - dir[1] * back + across[1] * side,
          vx: -dir[0] * drift,
          vy: -dir[1] * drift,
          length: s.length * unit * (0.5 + 0.5 * how) * (0.7 + Math.random() * 0.6),
          width: s.thickness * unit,
          life: s.lifetime * (0.7 + Math.random() * 0.6),
          drag: 6,
          gravity: 0,
          shrink: 0.9,
        });
      }
    },
  };
}
