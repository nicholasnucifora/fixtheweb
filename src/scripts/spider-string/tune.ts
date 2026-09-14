import {
  config,
  groups,
  schema,
  type ActionParam,
  type ChoiceParam,
  type ColorParam,
  type NumberParam,
  type Param,
  type Section,
  type ToggleParam,
} from "./config";

type Value = number | boolean | string;
type Values = Record<string, Record<string, Value>>;
type AnySection = Omit<Section, "group"> & { group: string };

/** A set of settings the panel edits: the spider's own (config.ts), or a page's, like the Spider Den's. */
export interface Tuning {
  /** The live values, edited in place. */
  values: Values;
  schema: Record<string, AnySection>;
  /** Tabs, in order. */
  groups: Record<string, { label: string; info: string }>;
  /** Where its changes and the panel's own state are kept in this browser. */
  key: string;
  title: string;
  intro: string;
  /** Tabs whose sections are things to play (with `spider:play`), picked one at a time. */
  playable?: string[];
}

/** The spider's own settings, shared by every page. */
const SPIDER: Tuning = {
  values: config as unknown as Values,
  schema: schema as Record<string, AnySection>,
  groups,
  key: "spider-string:tune",
  title: "Tuning",
  intro:
    "Changes apply instantly and are saved in this browser, but only while ?tune is in the URL. " +
    "Sizes are in b (the height of the letter b), so they scale with the logo. " +
    "Copy changes and paste them to Claude (or into config.ts) to make them the defaults.",
  playable: ["animation", "expression"],
};

/** Puts this browser's saved changes to the spider's settings into effect, without the panel (for pages with a panel of their own). */
export function applySpiderTuning() {
  applySaved(SPIDER);
}

const isChoice = (p: Param): p is ChoiceParam => "options" in p;
const isToggle = (p: Param): p is ToggleParam => typeof p.value === "boolean";
const isColor = (p: Param): p is ColorParam => "kind" in p && p.kind === "color";
const isAction = (p: Param): p is ActionParam => "kind" in p && p.kind === "action";

/**
 * Live tuning panel, loaded only when the page URL has ?tune.
 *
 * Built entirely from a schema (config.ts's, unless another is passed), so new params show up here
 * automatically. Edits the values in place (the sim reads them every frame) and remembers changes
 * in this browser.
 */
export function mountTuner(tuning: Tuning = SPIDER) {
  const { values, schema: sections, groups } = tuning;
  const STORAGE_KEY = tuning.key;
  const COLLAPSED_KEY = `${tuning.key}-collapsed`;
  const SIDE_KEY = `${tuning.key}-side`;
  const TAB_KEY = `${tuning.key}-tab`;
  const ANIMATION_KEY = `${tuning.key}-animation`;
  applySaved(tuning);

  // Shadow DOM keeps the page's styles and the panel's apart.
  const host = document.createElement("div");
  host.dataset.spiderIgnore = "";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${styles}</style>`;
  document.body.append(host);

  const panel = h("div", "panel");
  const pill = h("button", "pill", tuning.title);
  shadow.append(panel, pill);

  const status = h("span", "status");
  const copy = h("button", "btn", "Copy changes");
  const resetAll = h("button", "btn", "Reset all");
  const side = h("button", "btn", "⇄");
  side.title = "Move the panel to the other side";
  const hide = h("button", "btn", "Hide");
  const titleRow = h("div", "title-row");
  titleRow.append(h("strong", "title", tuning.title), status);
  const actions = h("div", "actions");
  actions.append(copy, resetAll, side, hide);
  const tabs = h("nav", "tabs");
  const head = h("header", "head");
  head.append(titleRow, actions, tabs);

  const intro = h("p", "intro", tuning.intro);
  const fallback = h("textarea", "fallback");
  fallback.readOnly = true;
  fallback.hidden = true;

  // One tab (and pane) per group in config.ts.
  const panes: Record<string, HTMLElement> = {};
  const tabButtons: Record<string, HTMLButtonElement> = {};
  for (const [g, group] of Object.entries(groups)) {
    const tab = h("button", "tab");
    tab.onclick = () => showTab(g);
    tabs.append(tab);
    tabButtons[g] = tab;
    panes[g] = h("div", "pane");
    panes[g].append(h("p", "group-info", group.info));
  }

  const body = h("div", "body");
  body.append(intro, fallback, ...Object.values(panes));
  panel.append(head, body);

  const showTab = (g: string) => {
    for (const [k, pane] of Object.entries(panes)) {
      pane.hidden = k !== g;
      tabButtons[k].classList.toggle("active", k === g);
    }
    body.scrollTop = 0;
    store(TAB_KEY, g);
  };

  const changes = () => {
    const out: [string, Value][] = [];
    for (const [s, section] of Object.entries(sections)) {
      for (const [k, param] of Object.entries(section.params)) {
        // Buttons aren't settings: they bump a counter and nothing else.
        if (!isAction(param) && values[s][k] !== param.value) out.push([`${s}.${k}`, values[s][k]]);
      }
    }
    return out;
  };

  const rows: (() => void)[] = [];
  const refresh = () => {
    rows.forEach((update) => update());
    const changed = changes();
    status.textContent = changed.length ? `${changed.length} changed` : "all defaults";
    for (const [g, group] of Object.entries(groups)) {
      const n = changed.filter(([path]) => sections[path.split(".")[0]].group === g).length;
      tabButtons[g].textContent = n ? `${group.label} · ${n}` : group.label;
    }
  };
  const save = () => store(STORAGE_KEY, JSON.stringify(Object.fromEntries(changes())));
  const set = (s: string, k: string, v: Value) => {
    values[s][k] = v;
    save();
    refresh();
  };

  const playable: Record<string, { key: string; label: string; el: HTMLElement; pick: HTMLButtonElement }[]> = {};
  for (const [s, section] of Object.entries(sections)) {
    const details = h("details", "section");
    details.open = true;
    details.append(h("summary", "", section.label), h("p", "section-info", section.info));
    for (const [k, param] of Object.entries(section.params)) {
      const r = row(param, (v) => set(s, k, v));
      rows.push(() => r.update(values[s][k]));
      details.append(r.el);
    }
    panes[section.group].append(details);
    if (tuning.playable?.includes(section.group)) {
      (playable[section.group] ??= []).push({ key: s, label: section.label, el: details, pick: h("button", "pick", section.label) });
    }
  }

  // Animations and faces are lists you pick from: play the one you've picked, and see only its settings.
  for (const [group, items] of Object.entries(playable)) {
    const list = h("div", "list");
    const bar = h("div", "play-bar");
    const play = h("button", "btn play");
    const back = h("button", "btn", "↺  Back to default");
    back.title = "Stop everything, and put the spider back the way it was";
    bar.append(play, back);

    const remembered = group === "animation" ? ANIMATION_KEY : `${ANIMATION_KEY}:${group}`;
    const choose = (key: string) => {
      const picked = items.find((p) => p.key === key) ?? items[0];
      for (const p of items) {
        p.el.hidden = p !== picked;
        p.pick.classList.toggle("active", p === picked);
      }
      play.textContent = `▶  Play ${picked.label.toLowerCase()}`;
      play.onclick = () => document.dispatchEvent(new CustomEvent("spider:play", { detail: { id: picked.key } }));
      store(remembered, picked.key);
    };
    for (const p of items) {
      p.pick.onclick = () => choose(p.key);
      list.append(p.pick);
    }
    back.onclick = () => document.dispatchEvent(new CustomEvent("spider:reset"));

    const pane = panes[group];
    pane.insertBefore(list, items[0].el);
    pane.insertBefore(bar, items[0].el);
    choose(read(remembered) ?? items[0].key);
  }

  copy.onclick = async () => {
    const text = JSON.stringify(Object.fromEntries(changes()), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      flash(copy, "Copied!");
    } catch {
      fallback.value = text;
      fallback.hidden = false;
      fallback.select();
      flash(copy, "Copy below");
    }
  };

  resetAll.onclick = () => {
    for (const [s, section] of Object.entries(sections)) {
      for (const [k, param] of Object.entries(section.params)) if (!isAction(param)) values[s][k] = param.value;
    }
    fallback.hidden = true;
    save();
    refresh();
  };

  const setCollapsed = (collapsed: boolean) => {
    panel.hidden = collapsed;
    pill.hidden = !collapsed;
    store(COLLAPSED_KEY, collapsed ? "1" : "");
  };
  hide.onclick = () => setCollapsed(true);
  pill.onclick = () => setCollapsed(false);

  // Starts on the left: the string hangs from the right end of the logo.
  const setSide = (s: string) => {
    host.dataset.side = s;
    store(SIDE_KEY, s);
  };
  side.onclick = () => setSide(host.dataset.side === "right" ? "left" : "right");

  setSide(read(SIDE_KEY) === "right" ? "right" : "left");
  setCollapsed(read(COLLAPSED_KEY) === "1");
  const savedTab = read(TAB_KEY);
  showTab(savedTab && savedTab in panes ? savedTab : Object.keys(panes)[0]);
  refresh();
}

/** localStorage can be unavailable (private mode, blocked site data): then settings just don't persist. */
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** One control: label, input, reset, description and default. */
function row(param: Param, set: (v: Value) => void) {
  const el = h("div", "row");
  const head = h("div", "row-head");
  const reset = h("button", "reset", "↺");
  reset.title = "Reset to default";
  reset.onclick = () => set(param.value);
  head.append(h("span", "label", param.label));
  let sync: (v: Value) => void;

  if (isAction(param)) {
    // A button: clicking bumps the counter that the animation code watches.
    const button = h("button", "action", param.label);
    let now = Number(param.value);
    button.onclick = () => set(now + 1);
    el.append(button, h("p", "info", param.info));
    return {
      el,
      update(v: Value) {
        now = Number(v);
      },
    };
  }

  if (isChoice(param)) {
    const select = h("select");
    for (const [value, text] of Object.entries(param.options)) select.append(new Option(text, value));
    select.onchange = () => set(select.value);
    head.append(reset);
    el.append(head, select);
    sync = (v) => (select.value = String(v));
  } else if (isColor(param)) {
    const input = h("input");
    input.type = "color";
    input.oninput = () => set(input.value);
    head.append(reset, input);
    el.append(head);
    sync = (v) => (input.value = String(v));
  } else if (isToggle(param)) {
    const box = h("input");
    box.type = "checkbox";
    box.onchange = () => set(box.checked);
    head.append(reset, box);
    el.append(head);
    sync = (v) => (box.checked = Boolean(v));
  } else {
    const p = param as NumberParam;
    const range = h("input");
    range.type = "range";
    range.min = String(p.min);
    range.max = String(p.max);
    range.step = String(p.step);
    range.oninput = () => set(Number(range.value));

    // Typed values may go beyond the slider's range.
    const num = h("input", "num");
    num.type = "number";
    num.step = String(p.step);
    num.onchange = () => {
      const v = parseFloat(num.value);
      if (Number.isFinite(v)) set(v);
    };

    head.append(num, h("span", "unit", p.unit ?? ""), reset);
    el.append(head, range);
    sync = (v) => {
      range.value = String(v);
      if (!num.matches(":focus")) num.value = format(Number(v));
    };
  }

  el.append(h("p", "info", param.info), h("p", "default", `Default: ${describe(param, param.value)}`));

  return {
    el,
    update(v: Value) {
      el.classList.toggle("changed", v !== param.value);
      sync(v);
    },
  };
}

function applySaved({ values, schema: sections, key }: Tuning) {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(read(key) ?? "{}");
  } catch {
    return;
  }
  for (const [path, v] of Object.entries(saved)) {
    const [s, k] = path.split(".");
    const param = sections[s]?.params[k];
    if (!param || isAction(param) || typeof v !== typeof param.value) continue;
    if (isChoice(param) && !(String(v) in param.options)) continue;
    if (isColor(param) && !/^#[0-9a-f]{6}$/i.test(String(v))) continue;
    values[s][k] = v as Value;
  }
}

function describe(param: Param, v: Value) {
  if (isChoice(param)) return param.options[String(v)] ?? String(v);
  if (isAction(param)) return "a button";
  if (isToggle(param)) return v ? "on" : "off";
  if (isColor(param)) return String(v);
  const unit = (param as NumberParam).unit;
  return `${format(Number(v))}${unit ? ` ${unit}` : ""}`;
}

const format = (v: number) => String(+v.toFixed(4));

function flash(button: HTMLButtonElement, text: string) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => (button.textContent = original), 1400);
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

const styles = `
  :host { all: initial; }
  .panel, .pill {
    --bg: #ffffff; --fg: #1b1e29; --muted: #6b6f7b; --line: #e4e4df;
    --field: #f4f4f1; --accent: #2f9a79; --soft: rgba(106, 199, 167, 0.13);
    color: var(--fg);
    font: 12px/1.4 system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    .panel, .pill {
      --bg: #232634; --fg: #f2f2ee; --muted: #9ca0ad; --line: #363a4a;
      --field: #2c3040; --accent: #6ac7a7; --soft: rgba(106, 199, 167, 0.14);
    }
  }
  [hidden] { display: none !important; }
  .panel, .pill { position: fixed; top: 12px; left: 12px; z-index: 1000; }
  :host([data-side="right"]) .panel, :host([data-side="right"]) .pill { left: auto; right: 12px; }
  .panel {
    width: min(340px, calc(100vw - 24px)); max-height: calc(100vh - 24px);
    display: flex; flex-direction: column;
    background: var(--bg); border: 1px solid var(--line); border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  }
  .head { padding: 10px 12px; border-bottom: 1px solid var(--line); }
  .title-row { display: flex; align-items: baseline; gap: 8px; }
  .title { font-size: 13px; }
  .status { color: var(--muted); }
  .actions { display: flex; gap: 6px; margin-top: 8px; }
  .tabs { display: flex; flex-wrap: wrap; margin: 8px -12px -11px; }
  .tab {
    flex: 1 0 auto; font: 600 12px/1 system-ui, sans-serif; color: var(--muted); background: none;
    border: none; border-bottom: 2px solid transparent; padding: 9px 4px; cursor: pointer;
  }
  .tab:hover { color: var(--fg); }
  .tab.active { color: var(--fg); border-bottom-color: var(--accent); }
  .group-info { margin: 0; padding: 8px 12px; color: var(--muted); border-bottom: 1px solid var(--line); }
  .list { display: flex; flex-wrap: wrap; gap: 5px; padding: 10px 12px 0; }
  .pick {
    font: 600 12px/1 system-ui, sans-serif; color: var(--muted); background: var(--field);
    border: 1px solid var(--line); border-radius: 999px; padding: 6px 10px; cursor: pointer;
  }
  .pick:hover { color: var(--fg); border-color: var(--accent); }
  .pick.active { color: var(--fg); background: var(--soft); border-color: var(--accent); }
  .play-bar { display: flex; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
  .play-bar .btn { flex: 1; padding: 7px 8px; font-weight: 600; }
  .play { background: var(--soft); border-color: var(--accent); }
  .btn {
    font: inherit; color: inherit; background: var(--field);
    border: 1px solid var(--line); border-radius: 6px; padding: 3px 7px; cursor: pointer; white-space: nowrap;
  }
  .btn:hover { border-color: var(--accent); }
  .body { overflow-y: auto; overscroll-behavior: contain; padding-bottom: 8px; }
  .intro { margin: 0; padding: 8px 12px; color: var(--muted); border-bottom: 1px solid var(--line); }
  .fallback { display: block; box-sizing: border-box; margin: 8px 12px 0; width: calc(100% - 24px); height: 110px; font: 11px ui-monospace, monospace; }
  .section + .section { border-top: 1px solid var(--line); }
  summary { padding: 10px 12px 2px; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; }
  .section-info { margin: 0 12px 4px; color: var(--muted); }
  .row { padding: 7px 12px 7px 9px; border-left: 3px solid transparent; }
  .action {
    display: block; width: 100%; margin: 2px 0 4px; padding: 7px 10px; cursor: pointer;
    font: 600 12px/1 system-ui, sans-serif; text-align: left; color: var(--fg);
    background: var(--field); border: 1px solid var(--line); border-radius: 7px;
  }
  .action:hover { border-color: var(--accent); }
  .action:active { background: var(--soft); }
  .row.changed { border-left-color: var(--accent); background: var(--soft); }
  .row-head { display: flex; align-items: center; gap: 6px; }
  .label { flex: 1; font-weight: 600; }
  .num {
    width: 60px; font: inherit; color: inherit; background: var(--field);
    border: 1px solid var(--line); border-radius: 5px; padding: 2px 4px;
    text-align: right; font-variant-numeric: tabular-nums;
  }
  .unit { min-width: 30px; color: var(--muted); }
  .reset { font: 14px/1 system-ui, sans-serif; color: var(--accent); background: none; border: none; padding: 0 2px; cursor: pointer; }
  .row:not(.changed) .reset { visibility: hidden; }
  input[type="range"] { display: block; width: 100%; margin: 6px 0 3px; accent-color: var(--accent); }
  input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: var(--accent); }
  input[type="color"] {
    width: 38px; height: 22px; padding: 0 2px; cursor: pointer;
    background: var(--field); border: 1px solid var(--line); border-radius: 5px;
  }
  select {
    display: block; width: 100%; margin-top: 6px; font: inherit; color: inherit;
    background: var(--field); border: 1px solid var(--line); border-radius: 5px; padding: 3px 4px;
  }
  .info { margin: 3px 0 0; color: var(--muted); }
  .default { margin: 2px 0 0; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; opacity: 0.8; }
  .pill {
    font-weight: 600; background: var(--bg); border: 1px solid var(--line);
    border-radius: 999px; padding: 6px 12px; cursor: pointer;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`;
