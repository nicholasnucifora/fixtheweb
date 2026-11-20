// Adapted from the Villow app illustration; fictional activity, no account data.
import { demoCurve, demoScenes, hoursForDays } from "./watch-pattern-geometry.js";
const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const list = new Intl.ListFormat("en-AU", { style: "long", type: "conjunction" });
function initialiseReflectionDemos() {
  document.querySelectorAll("[data-reflection-demo]").forEach((root) => {
    const chosenDays = /* @__PURE__ */ new Set();
    const buttons = [...root.querySelectorAll("[data-pattern-day]")];
    const all = root.querySelector("[data-pattern-all]");
    root.querySelector("fieldset").disabled = false;
    const updatePattern = () => {
      const curve = demoCurve(hoursForDays(chosenDays));
      root.querySelectorAll("[data-demo-area]").forEach((path) => path.setAttribute("d", curve.area));
      root.querySelectorAll("[data-demo-line]").forEach((path) => path.setAttribute("d", curve.line));
      root.querySelectorAll(".watch-free-demo-scene").forEach((scene) => {
        const definition = demoScenes[scene.dataset.variant];
        scene.style.setProperty("--wfd-y0", `${curve.point(definition.start).y}%`);
        scene.style.setProperty("--wfd-from-y", `${curve.point(definition.from).y}%`);
        scene.style.setProperty("--wfd-y1", `${curve.point(definition.end).y}%`);
      });
      const selectedNames = [...chosenDays].sort((a, b) => a - b).map((day) => names[day].slice(0, 3));
      const everyDay = !chosenDays.size || chosenDays.size === 7;
      const label = everyDay ? "for every day" : `for ${list.format(selectedNames)}`;
      root.querySelectorAll("[data-watch-free-days]").forEach((text) => text.textContent = label);
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(chosenDays.has(Number(button.dataset.patternDay)))));
      all.setAttribute("aria-pressed", String(everyDay));
      root.querySelector("[data-pattern-status]").textContent = `${everyDay ? "All days" : list.format(selectedNames)} shown. New watch-free time ${label}.`;
    };
    buttons.forEach((button) => button.addEventListener("click", () => {
      const day = Number(button.dataset.patternDay);
      chosenDays.has(day) ? chosenDays.delete(day) : chosenDays.add(day);
      updatePattern();
    }));
    all.addEventListener("click", () => {
      chosenDays.clear();
      updatePattern();
    });
  });
}
initialiseReflectionDemos();
export {
  initialiseReflectionDemos
};
