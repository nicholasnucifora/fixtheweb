import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: 'export * from "./src/scripts/spider-string/feel.ts"; export {config} from "./src/scripts/spider-string/config.ts"; export {homeSchema} from "./src/scripts/spider-string/tune-schema.ts"; export {createDrag} from "./src/scripts/spider-string/drag.ts"; export {Rope} from "./src/scripts/spider-string/rope.ts"; export {createSpeedLines} from "./src/scripts/spider-string/speedlines.ts"; export {drawEyes,neutralFace} from "./src/scripts/spider-string/face.ts";', resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, format: "cjs", write: false,
});
function rig() {
  const window = Object.assign(new EventTarget(), { scrollX: 0, scrollY: 0 });
  const page = Object.assign(new EventTarget(), { clientWidth: 1200, clientHeight: 900, classList: { toggle() {} } });
  const document = Object.assign(new EventTarget(), { documentElement: page });
  const module = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, window, document, CustomEvent, performance });
  return module.exports;
}

test("attention has no jump at the old notice distance, and fades across a broad area", () => {
  const { cursorAttention } = rig();
  assert.equal(cursorAttention(0, 4, 2), 1);
  assert.equal(cursorAttention(4, 4, 2), 0.5);
  assert.ok(cursorAttention(3, 4, 2) > 0.5);
  assert.ok(cursorAttention(5, 4, 2) > 0.2);
  assert.ok(Math.abs(cursorAttention(3.9999, 4, 2) - cursorAttention(4.0001, 4, 2)) < 0.0001);
  assert.equal(cursorAttention(Infinity, 4, 2), 0);
});

test("eye easing agrees across refresh rates and close glances are quicker", () => {
  const { followAmount, config } = rig();
  const after = (rate, frames) => {
    let value = 0;
    for (let i = 0; i < frames; i++) value += (1 - value) * followAmount(rate, 1 / frames);
    return value;
  };
  assert.ok(Math.abs(after(4.5, 30) - after(4.5, 144)) < 1e-10);
  assert.ok(followAmount(config.pupils.closeSpeed, 1 / 60) > followAmount(config.pupils.speed, 1 / 60));
});

test("pull deformation is bounded and never collapses the body sideways", () => {
  const { pullScale } = rig();
  for (const tension of [-1, 0, 0.2, 0.5, 1, 10]) {
    const scale = pullScale(tension, 10);
    assert.ok(scale.along >= 1 && scale.along <= 1.35);
    assert.ok(scale.across > 0.86 && scale.across <= 1);
  }
  assert.equal(pullScale(1, 0).along, 1);
});

test("a stationary test pull settles and has no time-driven shudder", () => {
  const { config, Rope, createDrag } = rig();
  const root = Object.assign(new EventTarget(), { dataset: {}, hasAttribute: () => false });
  const bob = Object.assign(new EventTarget(), { contains: () => false });
  const rope = new Rope(24);
  rope.setLength(100);
  rope.reset(400, 100);
  const drag = createDrag(root, bob, rope);
  const anchor = { x: 400, y: 100, unit: 50 };
  drag.testPull(anchor, 55, 0.7);
  const samples = [];
  for (let i = 0; i < 480; i++) {
    rope.setMass(config.rope.mass);
    drag.step(anchor, 1 / 120);
    if (i > 360) samples.push([rope.tail.x, rope.tail.y]);
  }
  for (const [x, y] of samples) {
    assert.ok(Math.abs(x - samples[0][0]) < 1e-8);
    assert.ok(Math.abs(y - samples[0][1]) < 1e-8);
  }
  assert.ok(drag.tension > 0);
  drag.releaseTest();
  assert.equal(drag.held, null);
});

test("snap tests use the same threshold as real anchor movement", () => {
  const { carriesAnchor } = rig();
  assert.equal(carriesAnchor(20, 50, 0.4), false);
  assert.equal(carriesAnchor(20.01, 50, 0.4), true);
  assert.equal(carriesAnchor(30, 50, 0.8), false);
});

test("motion streaks obey their own controls independently of pluck count", () => {
  const { config, createSpeedLines } = rig();
  config.particles.count = 0;
  config.speedLines.opacity = 0.3;
  config.speedLines.drag = 9;
  config.speedLines.shrink = 0.4;
  const particles = [];
  const lines = createSpeedLines({ spawn: (particle) => particles.push(particle) });
  lines.update(0.2, [300, 300], [20, 0], 50, 15);
  assert.ok(particles.length > 0);
  for (const particle of particles) {
    assert.equal(particle.opacity, 0.3);
    assert.equal(particle.drag, 9);
    assert.equal(particle.shrink, 0.4);
  }
  const count = particles.length;
  config.speedLines.enabled = false;
  lines.update(1, [300, 300], [20, 0], 50, 15);
  assert.equal(particles.length, count);
});

test("the homepage tuner keeps only requested areas and all five supplied defaults", () => {
  const { config, homeSchema } = rig();
  assert.equal(config.anchor.offsetX, 0.045);
  assert.equal(config.drag.follow, 60);
  assert.equal(config.particles.count, 3);
  assert.equal(config.crisp.wholePixels, false);
  assert.equal(config.blink.style, "lids");
  assert.equal(homeSchema.faceHappy, undefined);
  assert.equal(homeSchema.dropIn, undefined);
  assert.equal(homeSchema.body, undefined);
  assert.ok(homeSchema.snapTest && homeSchema.pullTest && homeSchema.speedLines && homeSchema.eyelids);
  assert.equal(homeSchema.snapTest.params.distance.transient, true);
});

test("lid blinks leave the pupils in proportion and add no default outline", () => {
  const { config, drawEyes, neutralFace } = rig();
  const scales = [];
  let strokes = 0;
  const ctx = new Proxy({ globalAlpha: 1, scale: (x, y) => scales.push([x, y]), stroke: () => strokes++ }, { get: (target, key) => key in target ? target[key] : () => {} });
  const eye = { side: "left", center: [0, 0], radius: 10, pupilCenter: [0, 0], look: [0, 0], slosh: [0, 0], white: {}, pupil: {} };
  drawEyes(ctx, [eye], neutralFace(), 1, { body: "#111", eyes: "#fff", pupils: "#111", mouth: "#fff" });
  assert.equal(config.eyelids.finish, "none");
  assert.equal(strokes, 0);
  assert.ok(scales.every(([x, y]) => x === y));
});
