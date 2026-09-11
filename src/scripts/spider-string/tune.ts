import { config, schema, type ChoiceParam, type NumberParam, type Param, type Section, type ToggleParam } from "./config";

const STORAGE_KEY = "spider-string:tune";
const COLLAPSED_KEY = "spider-string:tune-collapsed";
const SIDE_KEY = "spider-string:tune-side";

type Value = number | boolean | string;
type Values = Record<string, Record<string, Value>>;

const isChoice = (p: Param): p is ChoiceParam => "options" in p;
const isToggle = (p: Param): p is ToggleParam => typeof p.value === "boolean";

/**
 * Live tuning panel, loaded only when the page URL has ?tune.
 *
 * Built entirely from `schema` in config.ts, so new params show up here
 * automatically. Edits `config` in place (the sim reads it every frame) and
 * remembers changes in this browser.
 */
export function mountTuner() {
  const values = config as unknown as Values;
  const sections = schema as Record<string, Section>;
  applySaved(values, sections);

  // Shadow DOM keeps the page's styles and the panel's apart.
  const host = document.createElement("div");
  host.dataset.spiderIgnore = "";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${styles}</style>`;
  document.body.append(host);

  const panel = h("div", "panel");
  const pill = h("button", "pill", "Tune spider");
  shadow.append(panel, pill);

  const status = h("span", "status");
  const copy = h("button", "btn", "Copy changes");
  const resetAll = h("button", "btn", "Reset all");
  const side = h("button", "btn", "⇄");
  side.title = "Move the panel to the other side";
  const hide = h("button", "btn", "Hide");
  const titleRow = h("div", "title-row");
  titleRow.append(h("strong", "title", "Spider tuning"), status);
  const actions = h("div", "actions");
  actions.append(copy, resetAll, side, hide);
  const head = h("header", "head");
  head.append(titleRow, actions);

  const intro = h(
    "p",
    "intro",
    "Changes apply instantly and are saved in this browser, but only while ?tune is in the URL. " +
      "Sizes are in b (the height of the letter b), so they scale with the logo. " +
      "Copy changes and paste them to Claude (or into config.ts) to make them the defaults.",
  );
  const fallback = h("textarea", "fallback");
  fallback.readOnly = true;
  fallback.hidden = true;

  const body = h("div", "body");
  body.append(intro, fallback);
  panel.append(head, body);

  const changes = () => {
    const out: [string, Value][] = [];
    for (const [s, section] of Object.entries(sections)) {
      for (const [k, param] of Object.entries(section.params)) {
        if (values[s][k] !== param.value) out.push([`${s}.${k}`, values[s][k]]);
      }
    }
    return out;
  };

  const rows: (() => void)[] = [];
  const refresh = () => {
    rows.forEach((update) => update());
    const n = changes().length;
    status.textContent = n ? `${n} changed` : "all defaults";
  };
  const save = () => store(STORAGE_KEY, JSON.stringify(Object.fromEntries(changes())));
  const set = (s: string, k: string, v: Value) => {
    values[s][k] = v;
    save();
    refresh();
  };

  for (const [s, section] of Object.entries(sections)) {
    const details = h("details", "section");
    details.open = true;
    details.append(h("summary", "", section.label), h("p", "section-info", section.info));
    for (const [k, param] of Object.entries(section.params)) {
      const r = row(param, (v) => set(s, k, v));
      rows.push(() => r.update(values[s][k]));
      details.append(r.el);
    }
    body.append(details);
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
      for (const [k, param] of Object.entries(section.params)) values[s][k] = param.value;
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

  if (isChoice(param)) {
    const select = h("select");
    for (const [value, text] of Object.entries(param.options)) select.append(new Option(text, value));
    select.onchange = () => set(select.value);
    head.append(reset);
    el.append(head, select);
    sync = (v) => (select.value = String(v));
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

function applySaved(values: Values, sections: Record<string, Section>) {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(read(STORAGE_KEY) ?? "{}");
  } catch {
    return;
  }
  for (const [path, v] of Object.entries(saved)) {
    const [s, k] = path.split(".");
    const param = sections[s]?.params[k];
    if (!param || typeof v !== typeof param.value) continue;
    if (isChoice(param) && !(String(v) in param.options)) continue;
    values[s][k] = v as Value;
  }
}

function describe(param: Param, v: Value) {
  if (isChoice(param)) return param.options[String(v)] ?? String(v);
  if (isToggle(param)) return v ? "on" : "off";
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
