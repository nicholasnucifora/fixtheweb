import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: 'export * from "./src/scripts/spider-string/feel.ts"; export {config} from "./src/scripts/spider-string/config.ts"; export {homeSchema} from "./src/scripts/spider-string/tune-schema.ts"; export {applySpiderTuning} from "./src/scripts/spider-string/tune.ts"; export {createDrag} from "./src/scripts/spider-string/drag.ts"; export {createElasticity} from "./src/scripts/spider-string/elasticity.ts"; export * from "./src/scripts/spider-string/rotation.ts"; export {createRigTests} from "./src/scripts/spider-string/rig-tests.ts"; export {Rope} from "./src/scripts/spider-string/rope.ts"; export {createSpeedLines} from "./src/scripts/spider-string/speedlines.ts"; export {drawEyes,neutralFace} from "./src/scripts/spider-string/face.ts";', resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, format: "cjs", write: false,
});
function rig(saved = {}) {
  const window = Object.assign(new EventTarget(), { scrollX: 0, scrollY: 0, getSelection: () => null });
  const page = Object.assign(new EventTarget(), { clientWidth: 1200, clientHeight: 900, classList: { toggle() {} } });
  const document = Object.assign(new EventTarget(), { documentElement: page });
  const module = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, window, document, CustomEvent, performance, localStorage: { getItem: () => JSON.stringify(saved) } });
  return { ...module.exports, document, window };
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

test("anchor movement keeps the accepted carry threshold", () => {
  const { carriesAnchor } = rig();
  assert.equal(carriesAnchor(20, 50, 0.4), false);
  assert.equal(carriesAnchor(20.01, 50, 0.4), true);
  assert.equal(carriesAnchor(30, 50, 0.8), false);
});

test("the retained solver matches the accepted pull and release trajectory exactly", () => {
  for (const rate of [120, 240]) {
    const { config, Rope, createDrag, createElasticity } = rig();
    const a = { x: 400, y: 100, unit: 50 }, dt = 1 / rate;
    const ropes = [new Rope(24), new Rope(24)];
    const drags = ropes.map(rope => {
      rope.setLength(90); rope.reset(a.x, a.y);
      const root = Object.assign(new EventTarget(), { dataset: {}, hasAttribute: () => false });
      const bob = Object.assign(new EventTarget(), { contains: () => false });
      const drag = createDrag(root, bob, rope);
      drag.testPull(a, -55, 0.7);
      return drag;
    });
    const solve = createElasticity();
    let letOut = 0;
    for (let i = 0; i < rate * 4; i++) {
      if (i === rate) drags.forEach(drag => drag.releaseTest());
      ropes.forEach((rope, j) => {
        rope.setMass(config.rope.mass); drags[j].step(a, dt);
        rope.integrate(dt, config.rope.gravity * a.unit, config.rope.drag, config.bob.drag, () => 0);
      });
      // The accepted pre-experiment algorithm, including the held pull's extra give.
      const r = config.rope, drag = drags[0];
      const want = drag.held === null ? r.maxStretch : Math.max(r.maxStretch, drag.stretch);
      letOut = want >= letOut ? want : want + (letOut - want) * Math.exp(-dt / Math.max(0.001, config.pull.snapBack));
      ropes[0].solve(r.iterations, r.stiffness, letOut, r.compression, dt, r.springBack, r.springDamping);
      solve(ropes[1], drags[1].held, drags[1].stretch, dt);
      assert.equal(JSON.stringify(ropes[1].points), JSON.stringify(ropes[0].points));
    }
  }
});

test("optional held rotation is upright above/below and strongest at either side", () => {
  const { heldRotation } = rig();
  const max = Math.PI / 2, amount = 0.65, peak = max * amount;
  assert.ok(heldRotation([0, 100], amount, 50, max) === 0);
  assert.ok(heldRotation([0, -100], amount, 50, max) === 0);
  assert.equal(heldRotation([-100, 0], amount, 50, max), peak);
  assert.equal(heldRotation([100, 0], amount, 50, max), -peak);
  assert.equal(heldRotation([0, 0], amount, 50, max), 0);
  assert.ok(heldRotation([100, 0], 0, 50, max) === 0);
  // The upper quadrants ease back toward upright instead of staying pinned at maximum tilt.
  const lowLeft = heldRotation([-60, 80], amount, 50, max);
  const highLeft = heldRotation([-60, -80], amount, 50, max);
  const nearlyAbove = heldRotation([-1, -100], amount, 50, max);
  assert.equal(lowLeft, highLeft);
  assert.ok(0 < nearlyAbove && nearlyAbove < highLeft && highLeft < peak);
  assert.equal(heldRotation([60, -80], amount, 50, max), -highLeft);
});

test("circling clockwise or anticlockwise has no top/bottom flip or rotation jump", () => {
  const { heldRotation } = rig();
  const max = Math.PI / 2, amount = 0.65;
  for (const direction of [-1, 1]) {
    let previous = 0;
    for (let i = 0; i <= 720; i++) {
      const angle = direction * i * Math.PI / 360;
      const rotation = heldRotation([100 * Math.sin(angle), 100 * Math.cos(angle)], amount, 50, max);
      assert.ok(Number.isFinite(rotation) && Math.abs(rotation) <= max * amount + 1e-12);
      assert.ok(Math.abs(rotation - previous) < 0.01, "the orbit must stay continuous across the top");
      if (i % 360 === 0) assert.ok(Math.abs(rotation) < 1e-12, "both vertical positions must be level");
      previous = rotation;
    }
  }
  assert.ok(Math.abs(heldRotation([0.01, 0], 1, 50, max)) < 1e-6, "tiny motions at the anchor must not cause a large turn");
});

test("movement tilt settles level, responds symmetrically and keeps the accepted stretch", () => {
  const { movementRotation, pullScale, config, homeSchema, applySpiderTuning } = rig({ "grabRotation.mode": "off", "grabRotation.amount": 0.1 });
  applySpiderTuning();
  assert.equal(config.grabRotation.mode, "motion", "the approved style is now the runtime default");
  assert.equal(config.grabRotation.amount, 0.8, "retired saved tuning cannot replace the approved turn amount");
  assert.equal(Object.keys(homeSchema).length, 0);
  assert.equal(config.pull.style, "whole");
  assert.equal(config.pull.bodyStretch, 0.35);
  const amount = config.grabRotation.amount, max = config.body.tiltMax * Math.PI / 180;
  assert.equal(movementRotation(0, amount, max), 0, "a still hold has no built-in lean");
  for (const speed of [0.01, 1, 4, 20, 1e6]) {
    const right = movementRotation(speed, amount, max);
    assert.ok(right > 0 && right <= max * amount, "movement adds a bounded inertial tilt");
    assert.equal(movementRotation(-speed, amount, max), -right);
  }
  assert.ok(movementRotation(0.001, amount, max) < 0.001, "small motions must not snap to a fixed tilt");
  assert.ok(movementRotation(1, amount, max) < movementRotation(4, amount, max));
  assert.equal(movementRotation(4, 0, max), 0);
  assert.equal(movementRotation(0, amount, max), 0, "stopping removes the target angle after any previous movement");
  const stretch = pullScale(1, config.pull.bodyStretch);
  assert.ok(stretch.along > 1 && stretch.across < 1, "a level horizontal hold still stretches");
});

for (const style of ["grip", "motion"]) test(`${style}: turning during a real corner grab keeps that material point under the cursor`, () => {
  const { config, window, Rope, createDrag, rotatePoint } = rig();
  config.grabRotation.mode = style;
  let angle = 0.3;
  const rope = new Rope(24), a = { x: 400, y: 100, unit: 50 };
  rope.setLength(90); rope.reset(a.x, a.y);
  const root = Object.assign(new EventTarget(), { dataset: {}, hasAttribute: () => false });
  const bob = Object.assign(new EventTarget(), { contains: target => target === bob });
  const drag = createDrag(root, bob, rope, () => angle);
  const pointer = (type, x, y, time) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, {
      button: { value: 0 }, pointerId: { value: 1 }, clientX: { value: x }, clientY: { value: y },
      timeStamp: { value: time }, target: { value: bob },
    });
    window.dispatchEvent(event);
  };
  drag.step(a, 1 / 240);
  pointer("pointerdown", rope.tail.x + 8, rope.tail.y + 18, 0);
  const material = [...drag.grip];
  pointer("pointermove", 370, 150, 80);
  angle = 1.1;
  for (let i = 0; i < 240; i++) { rope.setMass(config.rope.mass); drag.step(a, 1 / 240); }
  const onScreen = rotatePoint(material, angle);
  assert.ok(Math.abs(rope.tail.x + onScreen[0] - 370) < 1e-6);
  assert.ok(Math.abs(rope.tail.y + onScreen[1] - 150) < 1e-6);
  pointer("pointerup", 370, 150, 1100);
  assert.equal(drag.grip, null);
});

test("settled settings and abandoned experiments cannot return through old saved tuning", () => {
  const { config, applySpiderTuning } = rig({
    "recoil.mode": "elastic", "pull.style": "body", "body.tiltSource": "string", "blink.style": "lids",
    "anchor.offsetX": 0.8, "grabRotation.mode": "grip", "grabRotation.amount": 0.7,
    "constructor.x": true, "__proto__.polluted": true,
  });
  applySpiderTuning();
  assert.equal(config.grabRotation.mode, "motion");
  assert.equal(config.grabRotation.amount, 0.8);
  assert.equal(config.pull.style, "whole");
  assert.equal(config.body.tiltSource, "force");
  assert.equal(config.blink.style, "squash");
  assert.equal(config.anchor.offsetX, 0.045);
  assert.equal(config.recoil, undefined);
  assert.equal({}.polluted, undefined);
});

test("rotation preview applies after layout resets and a real grab cancels the test hold", () => {
  const { config, document, Rope, createDrag, createRigTests, createElasticity } = rig();
  const rope = new Rope(24), a = { x: 400, y: 100, unit: 50 };
  rope.setLength(90); rope.reset(a.x, a.y);
  const root = Object.assign(new EventTarget(), { dataset: {}, hasAttribute: () => false });
  const bob = Object.assign(new EventTarget(), { contains: () => false });
  const drag = createDrag(root, bob, rope), solve = createElasticity();
  const preview = createRigTests(rope, drag, () => {}, solve.reset);
  config.grabRotation.preview++;
  preview.update();
  rope.reset(a.x, a.y);
  preview.afterLayout(a);
  assert.equal(drag.held, 24);
  assert.ok(drag.grip[0] > 0 && drag.grip[1] > 0, "the test grabs the bottom-right corner");
  config.grabRotation.release++;
  preview.update();
  assert.equal(drag.held, null);
  document.dispatchEvent(new CustomEvent("spider:grab"));
  preview.afterLayout({ ...a, x: 500 });
  assert.equal(drag.held, null, "the preview must not reclaim the spider after user input");
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

test("homepage tuning is retired and the approved defaults are pinned", () => {
  const { config, homeSchema } = rig();
  assert.equal(config.anchor.offsetX, 0.045);
  assert.equal(config.drag.follow, 60);
  assert.equal(config.particles.count, 3);
  assert.equal(config.crisp.wholePixels, false);
  assert.equal(config.blink.style, "squash");
  assert.equal(homeSchema.faceHappy, undefined);
  assert.equal(homeSchema.dropIn, undefined);
  assert.equal(homeSchema.body, undefined);
  assert.equal(homeSchema.snapTest, undefined);
  assert.equal(config.anchor.snapDistance, 0.4);
  assert.equal(config.pull.style, "whole");
  assert.equal(config.pull.bodyStretch, 0.35);
  assert.equal(config.speedLines.opacity, 0.55);
  assert.equal(config.speedLines.rate, 35);
  assert.deepEqual(Object.keys(homeSchema), []);
  assert.equal(config.grabRotation.mode, "motion");
  assert.equal(config.grabRotation.amount, 0.8);
  assert.equal(config.recoil, undefined);
});

test("lid blinks leave the pupils in proportion and add no default outline", () => {
  const { config, drawEyes, neutralFace } = rig();
  config.blink.style = "lids";
  const scales = [];
  let strokes = 0;
  const ctx = new Proxy({ globalAlpha: 1, scale: (x, y) => scales.push([x, y]), stroke: () => strokes++ }, { get: (target, key) => key in target ? target[key] : () => {} });
  const eye = { side: "left", center: [0, 0], radius: 10, pupilCenter: [0, 0], look: [0, 0], slosh: [0, 0], white: {}, pupil: {} };
  drawEyes(ctx, [eye], neutralFace(), 0.6, { body: "#111", eyes: "#fff", pupils: "#111", mouth: "#fff" });
  assert.equal(config.eyelids.finish, "none");
  assert.equal(strokes, 0);
  assert.ok(scales.length > 0);
  assert.ok(scales.every(([x, y]) => x === y));
});

test("closed and nearly closed eyes paint no whites, pupils or covers in either blink mode", () => {
  const { config, drawEyes, neutralFace } = rig();
  const eye = { side: "left", center: [0, 0], radius: 10, extent: [10, 13], pupilCenter: [0, 0], look: [0, 0], slosh: [0, 0], white: {}, pupil: {} };
  for (const style of ["squash", "lids"]) {
    config.blink.style = style;
    let paints = 0;
    const ctx = new Proxy({ globalAlpha: 1, fill: () => paints++, stroke: () => paints++ }, { get: (target, key) => key in target ? target[key] : () => {} });
    for (const closed of [0.92, 0.97, 1]) {
      drawEyes(ctx, [eye], neutralFace(), closed, { body: "#111", eyes: "#fff", pupils: "#222", mouth: "#fff" });
    }
    assert.equal(paints, 0, `${style} must leave no antialiased eye rim when closed`);
  }
});

test("squash compresses the clip opening while the drawn pupil stays round", () => {
  const { config, drawEyes, neutralFace } = rig();
  config.blink.style = "squash";
  const white = {};
  const pupil = {};
  let matrix = [1, 1];
  const stack = [];
  const clips = [];
  const fills = [];
  const ctx = new Proxy({
    globalAlpha: 1,
    save() { stack.push([...matrix]); }, restore() { matrix = stack.pop(); },
    scale(x, y) { matrix = [matrix[0] * x, matrix[1] * y]; },
    clip() { clips.push([...matrix]); },
    fill(path) { fills.push({ path, scale: [...matrix] }); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  drawEyes(ctx, [{ side: "left", center: [0, 0], radius: 10, pupilCenter: [0, 0], look: [0, 0], slosh: [0, 0], white, pupil }], neutralFace(), 0.6,
    { body: "#111", eyes: "#fff", pupils: "#222", mouth: "#fff" });
  assert.ok(clips.some(([x, y]) => y < x));
  const paintedPupil = fills.find((fill) => fill.path === pupil);
  assert.ok(paintedPupil);
  assert.ok(Math.abs(paintedPupil.scale[0] - paintedPupil.scale[1]) < 1e-12);
  assert.equal(fills.length, 2, "no painted lid covers that can leave a fringe");
});
