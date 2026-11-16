import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: 'export {createRenderer} from "./src/scripts/spider-string/render.ts";', resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, format: "cjs", write: false,
});

test("zoom keeps the rendered spider in CSS coordinates even when device dimensions stay unchanged", () => {
  const window = Object.assign(new EventTarget(), { scrollX: 20, scrollY: 70, devicePixelRatio: 1 });
  const module = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module, exports: module.exports, window,
    document: { documentElement: { dataset: {} } },
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
    getComputedStyle: () => ({ color: "#000" }),
    ResizeObserver: class { observe() {} },
  });
  let rect = { width: 1200, height: 900 };
  let transform;
  const ctx = {
    setTransform: (...values) => { transform = values; },
    clearRect() {}, save() {}, restore() {}, translate() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  };
  const canvas = { width: 0, height: 0, get clientWidth() { return rect.width; }, get clientHeight() { return rect.height; }, getBoundingClientRect: () => rect, getContext: () => ctx };
  const renderer = module.exports.createRenderer({}, canvas);
  const points = [{ x: 300, y: 200 }, { x: 430, y: 450 }];
  const rope = { points, at: i => points[i] };
  for (const zoom of [1, 1.25, 0.8, 1.5, 2, 1]) {
    window.devicePixelRatio = zoom;
    rect = { width: 1200 / zoom, height: 900 / zoom };
    assert.equal(renderer.pixelRatio, zoom);
    assert.equal(canvas.width, 1200);
    assert.equal(canvas.height, 900);
    renderer.draw(rope, { draw() {} }, { unit: 60 }, 1, () => {
      const [sx, , , sy, tx, ty] = transform;
      // The canvas point and DOM hit target must occupy the same CSS position.
      assert.ok(Math.abs((430 * sx + tx) * rect.width / canvas.width - (430 - window.scrollX)) < 1e-8);
      assert.ok(Math.abs((450 * sy + ty) * rect.height / canvas.height - (450 - window.scrollY)) < 1e-8);
    });
  }
  // Moving between screens can change DPR without changing the CSS viewport.
  window.devicePixelRatio = 1.75;
  assert.equal(renderer.pixelRatio, 1.75);
  assert.equal(canvas.width, 2100);
});
