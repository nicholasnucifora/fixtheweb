import { demoCurve, demoScenes, hoursForDays } from '../lib/villow-demo-curve';

const names = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const list = new Intl.ListFormat('en-AU', {style:'long',type:'conjunction'});

export function initialiseReflectionDemos() {
  document.querySelectorAll<HTMLElement>('[data-reflection-demo]').forEach(root=>{
    const chosenDays = new Set<number>();
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-pattern-day]')];
    const all = root.querySelector<HTMLButtonElement>('[data-pattern-all]')!;
    root.querySelector<HTMLFieldSetElement>('fieldset')!.disabled=false;

    const updatePattern = () => {
      const curve=demoCurve(hoursForDays(chosenDays));
      // Update paths and geometry in place, preserving the animation's phase.
      root.querySelectorAll<SVGPathElement>('[data-demo-area]').forEach(path=>path.setAttribute('d',curve.area));
      root.querySelectorAll<SVGPathElement>('[data-demo-line]').forEach(path=>path.setAttribute('d',curve.line));
      root.querySelectorAll<HTMLElement>('.watch-free-demo-scene').forEach(scene=>{
        const definition=demoScenes[scene.dataset.variant as keyof typeof demoScenes];
        scene.style.setProperty('--wfd-y0',`${curve.point(definition.start).y}%`);
        scene.style.setProperty('--wfd-from-y',`${curve.point(definition.from).y}%`);
        scene.style.setProperty('--wfd-y1',`${curve.point(definition.end).y}%`);
      });
      const selectedNames=[...chosenDays].sort((a,b)=>a-b).map(day=>names[day]);
      const everyDay=!chosenDays.size || chosenDays.size===7;
      const label=everyDay?'for every day':`for ${list.format(selectedNames)}`;
      root.querySelectorAll<HTMLElement>('[data-watch-free-days]').forEach(text=>text.textContent=label);
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(chosenDays.has(Number(button.dataset.patternDay)))));
      all.setAttribute('aria-pressed',String(everyDay));
      root.querySelector<HTMLElement>('[data-pattern-status]')!.textContent=`${everyDay?'All days':list.format(selectedNames)} shown. New watch-free time ${label}.`;
    };
    buttons.forEach(button=>button.addEventListener('click',()=>{
      const day=Number(button.dataset.patternDay);
      chosenDays.has(day)?chosenDays.delete(day):chosenDays.add(day);
      updatePattern();
    }));
    all.addEventListener('click',()=>{chosenDays.clear();updatePattern();});
  });
}
