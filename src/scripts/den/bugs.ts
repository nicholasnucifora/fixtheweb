import { drawSnack, type Snack } from "../spider-string/food";
import { den } from "./config";
import type { Critter } from "./critter";
import type { Spot, Vec, Web } from "./web";

/**
 * Flies (and the odd moth or ladybird) that wander into the Spider Den.
 *
 * They fly across in a wobbly line, and a thread they cross can catch them. Stuck, they struggle
 * for a bit, shaking the web, and some get away. Hungry spiders come and eat the ones that don't.
 * You can pick one up and give it to a spider yourself, or stick it on a thread.
 *
 * Snacks from the wardrobe turn up hovering in one place, like the home page's fly, until you drag
 * them somewhere.
 */

export type BugState = "flying" | "hover" | "stuck" | "held" | "eaten" | "gone";

export interface Bug {
  kind: Snack;
  state: BugState;
  x: number;
  y: number;
  heading: number;
  speed: number;
  wobble: number;
  spot: Spot | null;
  /** Seconds of struggling left, and whether it gets a chance to break free at the end. */
  struggle: number;
  canEscape: boolean;
  stuckFor: number;
  /** Can't be caught for this long (it's just got free, or been let go). */
  slippery: number;
  wing: number;
  hover: Vec | null;
  claimedBy: Critter | null;
  eatenBy: Critter | null;
  eaten: number;
  /** Given to a spider by you, rather than caught: counts toward unlocks. */
  handFed: boolean;
  fade: number;
}

const between = (a: number, b: number) => Math.min(a, b) + Math.random() * Math.abs(b - a);

export function createBugs(den_: { web: Web; unit: number }) {
  let list: Bug[] = [];
  let nextIn = between(1.5, 4);
  let time = 0;

  const size = (bug: Bug) => den.flies.size * den_.unit * (bug.kind === "moth" ? 1.3 : bug.kind === "cookie" ? 1.2 : 1);

  const make = (kind: Snack, x: number, y: number): Bug => ({
    kind,
    state: "flying",
    x,
    y,
    heading: 0,
    speed: den.flies.speed * den_.unit * (kind === "moth" ? 0.7 : kind === "ladybird" ? 0.85 : 1) * between(0.8, 1.2),
    wobble: Math.random() * 10,
    spot: null,
    struggle: 0,
    canEscape: true,
    stuckFor: 0,
    slippery: 0,
    wing: Math.random() * 10,
    hover: null,
    claimedBy: null,
    eatenBy: null,
    eaten: 0,
    handFed: false,
    fade: 1,
  });

  /** One flies in from an edge, heading across. */
  const flyIn = () => {
    const { width: w, height: h } = den_.web;
    const f = den.flies;
    const roll = Math.random();
    const kind: Snack = roll < f.ladybirds ? "ladybird" : roll < f.ladybirds + f.moths ? "moth" : "fly";
    const side = Math.floor(Math.random() * 3);
    const margin = 30;
    const [x, y, toward] =
      side === 0
        ? [-margin, between(0.05, 0.75) * h, 0]
        : side === 1
          ? [w + margin, between(0.05, 0.75) * h, Math.PI]
          : [between(0.1, 0.9) * w, -margin, Math.PI / 2];
    const bug = make(kind, x, y);
    bug.heading = toward + (Math.random() - 0.5) * 1.1;
    list.push(bug);
  };

  /** Stuck on a thread where it crossed it. */
  const stick = (bug: Bug, hit: { edge: number; t: number; x: number; y: number }, pushX: number, pushY: number) => {
    bug.state = "stuck";
    bug.spot = { edge: hit.edge, t: hit.t };
    bug.x = hit.x;
    bug.y = hit.y;
    bug.struggle = den.flies.struggle * between(0.6, 1.4);
    bug.canEscape = true;
    bug.stuckFor = 0;
    bug.hover = null;
    den_.web.push(hit.x, hit.y, pushX, pushY);
  };

  return {
    get list() {
      return list;
    },

    /** A snack from the wardrobe, hovering at (x, y) until it's dragged somewhere. */
    offer(kind: Snack, x: number, y: number) {
      const bug = make(kind, x, y);
      bug.state = "hover";
      bug.hover = [x, y];
      list.push(bug);
      return bug;
    },

    /** Sends one in now. */
    flyIn,

    /** The bug under (x, y), if any: the easiest to grab. */
    at(x: number, y: number) {
      let best: Bug | null = null;
      let bestD = Infinity;
      for (const bug of list) {
        if (bug.state === "eaten" || bug.state === "gone" || bug.state === "held") continue;
        const d = Math.hypot(bug.x - x, bug.y - y);
        if (d < Math.max(14, size(bug) * 1.4) && d < bestD) {
          best = bug;
          bestD = d;
        }
      }
      return best;
    },

    grab(bug: Bug) {
      if (bug.claimedBy) bug.claimedBy = null;
      if (bug.state === "stuck") den_.web.push(bug.x, bug.y, 0, -den_.unit * 2);
      bug.state = "held";
      bug.spot = null;
      bug.hover = null;
    },

    /** Let go somewhere that isn't a spider's mouth: stuck on a thread if there's one right there, otherwise it flies off. */
    letGo(bug: Bug) {
      const near = den_.web.nearest(bug.x, bug.y, den_.unit * 0.22);
      if (near && bug.kind !== "cookie") {
        stick(bug, near, 0, den_.unit * 1.5);
        bug.canEscape = false;
      } else if (bug.kind === "cookie") {
        bug.state = "hover";
        bug.hover = [bug.x, bug.y];
      } else {
        bug.state = "flying";
        bug.heading = -Math.PI / 2 + (Math.random() - 0.5) * 2;
        bug.slippery = 0.6;
      }
    },

    /** A stuck bug within `range` px of (x, y) that no other spider is after. */
    preyNear(x: number, y: number, range: number, hunter: Critter) {
      let best: Bug | null = null;
      let bestD = range;
      for (const bug of list) {
        if (bug.state !== "stuck" || bug.fade < 1 || (bug.claimedBy && bug.claimedBy !== hunter)) continue;
        const d = Math.hypot(bug.x - x, bug.y - y);
        if (d < bestD) {
          best = bug;
          bestD = d;
        }
      }
      return best;
    },

    /** The webs were rebuilt: stuck bugs grab the nearest thread, or fly off. */
    rewoven() {
      for (const bug of list) {
        if (bug.state !== "stuck") continue;
        const near = den_.web.nearest(bug.x, bug.y, den_.unit);
        if (near) bug.spot = { edge: near.edge, t: near.t };
        else {
          bug.state = "flying";
          bug.spot = null;
        }
        bug.claimedBy = null;
      }
    },

    clear() {
      list = [];
    },

    update(dt: number, sendIn: boolean) {
      const web = den_.web;
      const f = den.flies;
      time += dt;

      nextIn -= dt;
      if (nextIn <= 0) {
        nextIn = between(f.everyFrom, f.everyTo);
        const about = list.filter((b) => b.state !== "gone" && b.state !== "eaten").length;
        if (sendIn && f.enabled && about < f.most) flyIn();
      }

      for (const bug of list) {
        bug.wing += dt * 14 * Math.PI * 2 * (bug.state === "stuck" && bug.struggle <= 0 ? 0.08 : 1);
        bug.slippery = Math.max(0, bug.slippery - dt);

        if (bug.state === "flying") {
          bug.wobble += dt;
          bug.heading += (Math.sin(bug.wobble * 1.3) * 0.8 + (Math.random() - 0.5) * 0.8) * dt;
          const across = Math.sin(bug.wobble * (bug.kind === "moth" ? 3 : 6)) * 0.3;
          const vx = Math.cos(bug.heading) * bug.speed - Math.sin(bug.heading) * bug.speed * across;
          const vy = Math.sin(bug.heading) * bug.speed + Math.cos(bug.heading) * bug.speed * across;
          const nx = bug.x + vx * dt;
          const ny = bug.y + vy * dt;
          if (bug.slippery <= 0) {
            for (const hit of web.crossings(bug.x, bug.y, nx, ny)) {
              if (Math.random() < f.stick) {
                stick(bug, hit, vx * 0.4, vy * 0.4);
                break;
              }
            }
          }
          if (bug.state === "flying") {
            bug.x = nx;
            bug.y = ny;
            const margin = 60;
            if (bug.x < -margin || bug.x > web.width + margin || bug.y < -margin * 2 || bug.y > web.height + margin) {
              bug.state = "gone";
            }
          }
        } else if (bug.state === "hover" && bug.hover) {
          bug.wobble += dt;
          bug.x = bug.hover[0] + Math.sin(bug.wobble * 1.7) * den_.unit * 0.05;
          bug.y = bug.hover[1] + Math.sin(bug.wobble * 2.3 + 1.1) * den_.unit * 0.035;
        } else if (bug.state === "stuck" && bug.spot) {
          const [px, py] = web.point(bug.spot);
          bug.stuckFor += dt;
          if (bug.struggle > 0) {
            bug.struggle -= dt;
            const shake = den_.unit * 0.025;
            bug.x = px + Math.sin(time * 47 + bug.wobble) * shake;
            bug.y = py + Math.cos(time * 39 + bug.wobble) * shake;
            if (Math.random() < dt * 5) web.push(px, py, (Math.random() - 0.5) * den_.unit * 3, (Math.random() - 0.5) * den_.unit * 3, den_.unit * 0.3);
            if (bug.struggle <= 0) {
              if (bug.canEscape && !bug.claimedBy && Math.random() < f.escape) {
                bug.state = "flying";
                bug.spot = null;
                bug.heading = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
                bug.slippery = 1.2;
                web.push(px, py, 0, -den_.unit * 5);
              }
              bug.canEscape = false;
            }
          } else {
            bug.x = px;
            bug.y = py;
            // Every so often it has another wriggle.
            if (Math.random() < dt * 0.15) bug.struggle = 0.5;
          }
          if (bug.stuckFor > f.gone && !bug.claimedBy) bug.fade -= dt / 2;
          if (bug.fade <= 0) bug.state = "gone";
        } else if (bug.state === "eaten" && bug.eatenBy) {
          const [mx, my] = bug.eatenBy.mouth();
          const k = 1 - Math.exp(-14 * dt);
          bug.x += (mx - bug.x) * k;
          bug.y += (my - bug.y) * k;
          bug.eaten = Math.min(1, bug.eaten + dt / 0.9);
        }
      }
      list = list.filter((b) => b.state !== "gone");
    },

    /** Den px. `over` draws only the ones that belong on top of the spiders (held, being eaten); otherwise the rest. */
    draw(ctx: CanvasRenderingContext2D, over: boolean) {
      for (const bug of list) {
        const top = bug.state === "held" || bug.state === "eaten";
        if (top !== over) continue;
        const s = size(bug) * (1 - bug.eaten * 0.85);
        if (s <= 0.5) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, bug.fade);
        drawSnack(ctx, bug.kind, bug.x, bug.y, s, bug.wing);
        ctx.restore();
      }
    },
  };
}

export type Bugs = ReturnType<typeof createBugs>;
