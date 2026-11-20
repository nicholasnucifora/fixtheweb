import { demoCurve, demoScenes, hoursForDays } from '../lib/villow-demo-curve';

const names = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const recorded = [40,70,55,35,80,65,50];
const roundQuarter = (hour:number) => Math.round(hour*4)/4;
const asTime = (hour:number) => `${String(Math.floor(hour)%24).padStart(2,'0')}:${String(Math.round(hour%1*60)).padStart(2,'0')}`;
const asHour = (value:string) => { const [h,m]=value.split(':').map(Number); return h+m/60; };
const readableTime = (hour:number) => new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:hour%1?'2-digit':undefined}).format(new Date(2000,0,1,Math.floor(hour),Math.round(hour%1*60)));

export function initialiseReflectionDemos() {
  document.querySelectorAll<HTMLElement>('[data-reflection-demo]').forEach(root=>{
    const find = <T extends Element=HTMLElement>(selector:string) => root.querySelector<T>(selector)!;
    const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-example-tab]')];
    const panels=[...root.querySelectorAll<HTMLElement>('[data-example-panel]')];
    const modeButton=find<HTMLButtonElement>('[data-demo-mode]');
    const playButton=find<HTMLButtonElement>('[data-demo-play]');
    let paused=false;
    let manual=false;
    root.dataset.enhanced='true';
    find<HTMLElement>('.reflection-tabs').hidden=false;
    find<HTMLElement>('.reflection-actions').hidden=false;
    root.querySelectorAll<HTMLFieldSetElement>('fieldset').forEach(fieldset=>fieldset.disabled=false);

    // Visibility/inert preserve both mounted CSS timelines across tab switches.
    const selectPanel=(name:string)=>{
      root.dataset.active=name;
      tabs.forEach(tab=>{ const selected=tab.dataset.exampleTab===name; tab.setAttribute('aria-selected',String(selected)); tab.tabIndex=selected?0:-1; });
      panels.forEach(panel=>{ const active=panel.dataset.examplePanel===name; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-hidden',String(!active)); panel.inert=!active; });
      modeButton.hidden=name!=='pattern';
      playButton.hidden=name==='pattern' && manual;
    };
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>selectPanel(tab.dataset.exampleTab!));
      tab.addEventListener('keydown',event=>{
        const next=event.key==='ArrowRight'?(index+1)%2:event.key==='ArrowLeft'?(index+1)%2:event.key==='Home'?0:event.key==='End'?1:null;
        if(next===null)return;
        event.preventDefault(); selectPanel(tabs[next].dataset.exampleTab!); tabs[next].focus({preventScroll:true});
      });
    });
    selectPanel('pattern');
    playButton.addEventListener('click',()=>{
      paused=!paused;
      root.dataset.paused=String(paused);
      playButton.setAttribute('aria-pressed',String(paused));
      find('[data-play-label]').textContent=paused?'Play animation':'Pause animation';
      find('[data-play-icon]').textContent=paused?'▷':'Ⅱ';
    });

    const chosenDays=new Set<number>();
    let curve=demoCurve(hoursForDays(chosenDays));
    const dayLabel=()=>!chosenDays.size || chosenDays.size===7?'All days':[...chosenDays].sort().map(day=>names[day].slice(0,3)).join(', ');
    const manualChart=find<HTMLElement>('[data-manual-chart]');
    const plot=find<HTMLElement>('[data-manual-plot]');
    const form=find<HTMLFormElement>('[data-manual-form]');
    const from=find<HTMLInputElement>('[data-manual-from]');
    const until=find<HTMLInputElement>('[data-manual-until]');
    const add=find<HTMLButtonElement>('[data-manual-add]');
    const caption=find('[data-pattern-caption]');
    type Band={start:number;end:number;days:number[]};
    let saved:Band|null=null;
    let draft:Band|null=null;
    const currentDays=()=>chosenDays.size?[...chosenDays]:names.map((_,i)=>i);
    const updateManual=()=>{
      const band=draft??saved;
      const showing=currentDays();
      const coverage=band?showing.filter(day=>band.days.includes(day)).length:0;
      manualChart.dataset.hasBand=String(!!band && !!coverage);
      manualChart.dataset.coverage=coverage===showing.length?'all':'some';
      manualChart.dataset.editing=String(!!draft);
      if(band){
        const start=curve.point(band.start),end=curve.point(band.end);
        manualChart.style.setProperty('--manual-start',`${start.x}%`);
        manualChart.style.setProperty('--manual-end',`${end.x}%`);
        const first=find<HTMLElement>('[data-manual-start]'),last=find<HTMLElement>('[data-manual-end]');
        first.style.left=`${start.x}%`;first.style.top=`${start.y}%`;
        last.style.left=`${end.x}%`;last.style.top=`${end.y}%`;
      }
      if(manual){
        const text=draft?'Adjust the range, then add it. This stays in the example.':saved?`${readableTime(saved.start)}–${readableTime(saved.end)} added for ${saved.days.length===7?'every day':saved.days.map(day=>names[day].slice(0,3)).join(', ')}. ${coverage===0?'No watch-free time on the days shown.':coverage<showing.length?'Applies to some days shown.':'Changes stay in this example.'}`:'Drag on the chart or choose Add watch-free time. Changes stay in this example.';
        caption.textContent=text;
      }
      form.hidden=!draft;add.hidden=!!draft;add.textContent=saved?'Edit watch-free time':'Add watch-free time';
    };
    const updatePattern=()=>{
      curve=demoCurve(hoursForDays(chosenDays));
      root.querySelectorAll<SVGPathElement>('[data-demo-area]').forEach(path=>path.setAttribute('d',curve.area));
      root.querySelectorAll<SVGPathElement>('[data-demo-line]').forEach(path=>path.setAttribute('d',curve.line));
      root.querySelectorAll<HTMLElement>('.watch-free-demo-scene').forEach(scene=>{
        const definition=demoScenes[scene.dataset.variant as keyof typeof demoScenes];
        scene.style.setProperty('--wfd-y0',`${curve.point(definition.start).y}%`);
        scene.style.setProperty('--wfd-from-y',`${curve.point(definition.from).y}%`);
        scene.style.setProperty('--wfd-y1',`${curve.point(definition.end).y}%`);
      });
      root.querySelectorAll<HTMLButtonElement>('[data-pattern-day]').forEach(button=>button.setAttribute('aria-pressed',String(chosenDays.has(Number(button.dataset.patternDay)))));
      find('[data-pattern-all]').setAttribute('aria-pressed',String(!chosenDays.size));
      find('[data-pattern-days]').textContent=dayLabel();
      find('[data-pattern-status]').textContent=`Viewing pattern for ${dayLabel()}. The animation continues at the same point.`;
      if(draft)draft.days=currentDays();
      updateManual();
    };
    root.querySelectorAll<HTMLButtonElement>('[data-pattern-day]').forEach(button=>button.addEventListener('click',()=>{
      const day=Number(button.dataset.patternDay);chosenDays.has(day)?chosenDays.delete(day):chosenDays.add(day);updatePattern();
    }));
    find('[data-pattern-all]').addEventListener('click',()=>{chosenDays.clear();updatePattern();});

    modeButton.addEventListener('click',()=>{
      manual=!manual;root.dataset.mode=manual?'manual':'animation';
      const manualPanel=find<HTMLElement>('.manual-watch-free');manualPanel.inert=!manual;manualPanel.setAttribute('aria-hidden',String(!manual));
      playButton.hidden=manual;modeButton.textContent=manual?'Watch animation ↗':'Try it yourself ↗';
      if(!manual)caption.textContent='Pick days to see your pattern. Watch how a time becomes watch-free.';
      updateManual();
    });
    const syncInputs=()=>{if(draft){from.value=asTime(draft.start);until.value=asTime(draft.end);until.setCustomValidity('');}};
    add.addEventListener('click',()=>{draft=saved?{...saved,days:currentDays()}:{start:12,end:13,days:currentDays()};syncInputs();updateManual();from.focus({preventScroll:true});});
    find('[data-manual-cancel]').addEventListener('click',()=>{draft=null;updateManual();add.focus({preventScroll:true});});
    const readInputs=()=>{
      const start=asHour(from.value),end=until.value==='00:00'?24:asHour(until.value);
      const valid=Number.isFinite(start)&&Number.isFinite(end)&&end>start;
      until.setCustomValidity(valid?'':'Choose an end after the start for this example.');
      if(valid){draft={start,end,days:currentDays()};updateManual();}
      return valid;
    };
    [from,until].forEach(input=>input.addEventListener('input',readInputs));
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!readInputs()||!draft||!form.reportValidity())return;
      saved={...draft};draft=null;updateManual();find('[data-pattern-status]').textContent=caption.textContent;add.focus({preventScroll:true});
    });
    let dragging:{id:number;origin:number;edge:'new'|'start'|'end'}|null=null;
    const pointerHour=(event:PointerEvent)=>{const rect=plot.getBoundingClientRect();return Math.max(0,Math.min(24,roundQuarter((event.clientX-rect.left)/rect.width*24)));};
    plot.addEventListener('pointerdown',event=>{
      if(!manual || event.button!==0 || (event.pointerType==='touch'&&!draft))return;
      const hour=pointerHour(event);
      const target=event.target as HTMLElement;
      const edge=target.hasAttribute('data-manual-start')?'start':target.hasAttribute('data-manual-end')?'end':'new';
      if(edge==='new')draft={start:Math.min(23.75,hour),end:Math.min(24,hour+.25),days:currentDays()};
      dragging={id:event.pointerId,origin:hour,edge};plot.setPointerCapture(event.pointerId);syncInputs();updateManual();
    });
    plot.addEventListener('pointermove',event=>{
      if(!dragging||event.pointerId!==dragging.id||!draft)return;
      const hour=pointerHour(event);
      if(dragging.edge==='start')draft.start=Math.min(draft.end-.25,hour);
      else if(dragging.edge==='end')draft.end=Math.max(draft.start+.25,hour);
      else{draft.start=Math.min(23.75,Math.min(dragging.origin,hour));draft.end=Math.min(24,Math.max(draft.start+.25,Math.max(dragging.origin,hour)));}
      syncInputs();updateManual();
    });
    const endDrag=()=>{dragging=null;};
    plot.addEventListener('pointerup',endDrag);plot.addEventListener('pointercancel',endDrag);

    root.querySelectorAll<HTMLButtonElement>('[data-daily-day]').forEach(button=>button.addEventListener('click',()=>{
      const day=Number(button.dataset.dailyDay);
      find<HTMLElement>('.daily-limit-demo').style.setProperty('--daily-day',String(day));
      root.querySelectorAll<HTMLButtonElement>('[data-daily-day]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
      root.querySelectorAll<HTMLElement>('[data-daily-column]').forEach((column,index)=>column.dataset.selected=String(index===day));
      find('[data-daily-name]').textContent=names[day];
      find('[data-daily-status]').textContent=`${names[day]} selected. The animation lowers its limit from 60 to 45 minutes. Recorded use remains ${recorded[day]} minutes.`;
    }));
  });
}
