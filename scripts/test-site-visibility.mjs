import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { dev, preview } from "astro";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = { host: "127.0.0.1", port: 0 };
const get = (port, route) => fetch(`http://127.0.0.1:${port}${route}`);
const developmentRoutes = [
  "/den", "/life", "/design", "/old-pages", "/old-pages/den", "/old-pages/life",
  "/work/villow", "/notes/design-and-access",
  "/ideas", "/about",
];
const removedRoutes = ["/notes/digital-duty-of-care"];

test("production contains only the coming-soon screen and refuses development routes", async () => {
  const nodeEnv = process.env.NODE_ENV;
  const directory = await mkdtemp(path.join(os.tmpdir(), "fixtheweb-public-"));
  let production;
  try {
    await promisify(execFile)(process.execPath, [
      path.join(root, "node_modules/astro/bin/astro.mjs"), "build", "--outDir", directory, "--silent",
    ], { cwd: root, env: { ...process.env, NODE_ENV: "production" }, timeout: 30000, windowsHide: true });
    production = await preview({ root, outDir: directory, server, logLevel: "silent" });
    for (const route of ["/", "/?tune&unlock-all&preview=1", "/?preset=a", "/?preset=b"]) {
      const response = await get(production.port, route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<title>Fix the Web · Coming soon<\/title>/);
      assert.match(html, /data-coming-soon="true"/);
      assert.match(html, /Coming soon\./);
      assert.match(html, /data-spider-string/);
      assert.match(html, /<canvas\b/);
      assert.equal((html.match(/data-spider-string/g) ?? []).length, 1);
      assert.doesNotMatch(html, /<header\b|<nav\b|<a\b|class="section\b|TBD|Villow|Your life on screens|To be decided|preset-bar|page-preset/i);
    }
    for (const route of [...developmentRoutes, ...removedRoutes].flatMap(route => [route, `${route}/`, `${route}/index.html`, `${route}?preview=1&tune`])) {
      assert.equal((await get(production.port, route)).status, 404, route);
    }
    assert.ok(!(await readdir(directory)).some(name => ["den", "life", "design", "old-pages", "work", "notes", "ideas", "about"].includes(name)));
    const assets = await readdir(path.join(directory, "_astro"));
    assert.ok(assets.some(name => name.startsWith("SpiderString.") && name.endsWith(".js")));
    assert.ok(!assets.some(name => /villow|Header\.|den\.astro|life\.astro|design\.astro|DevelopmentHero|Fredoka|Nunito|tune|PresetSwitch|PreviewState|proposals/i.test(name)));
    // Scroll lock is part of the shipped page, including with JavaScript disabled.
    assert.match(await readFile(path.join(directory, "index.html"), "utf8"), /html\[data-coming-soon\][^{]*\{[^}]*overflow:hidden/);
  } finally {
    await production?.stop();
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("fixtheweb-public-"));
    await rm(directory, { recursive: true });
  }
});

test("development serves the new direction and keeps earlier experiments in Old pages", async () => {
  const development = await dev({ root, server, devToolbar: { enabled: false }, logLevel: "silent" });
  try {
    const home = await get(development.address.port, "/?tune");
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /<header\b/);
    assert.match(html, /Villow/);
    assert.match(html, /href="\/work\/villow/);
    assert.doesNotMatch(html, /To be decided/);
    assert.doesNotMatch(html, /<html[^>]*\bdata-coming-soon/);
    for (const route of developmentRoutes) {
      const response = await get(development.address.port, route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /<main\b/);
    }
    for (const route of removedRoutes.flatMap(route => [route, `${route}/`, `${route}?preset=a`, `${route}?preset=b`])) {
      assert.equal((await get(development.address.port, route)).status, 404, route);
    }
    // Every comparison has independently addressable, meaningfully different pages.
    const comparisons = [
      ["/", "There’s a lot worth", "We shouldn’t have to give up"],
      ["/work/villow", "What if there were a natural place to stop?", "Our blueprint for"],
      ["/notes/design-and-access", "Better designs need", "Let people build"],
      ["/ideas", "Explore the proposal and trade-offs", "What needs working through"],
      ["/about", "Read the full message", "I’ve spent months iterating on Villow"],
    ];
    const rendered = new Map();
    for (const [route, aText, bText] of comparisons) {
      const a = await (await get(development.address.port, `${route}?preset=a`)).text();
      const b = await (await get(development.address.port, `${route}?preset=b`)).text();
      assert.ok(a.includes(aText), `${route} A retains its content`);
      assert.ok(b.includes(bText), `${route} B contains its revision`);
      assert.notEqual(a, b, `${route} has distinct presets`);
      assert.match(a, /data-preset="a"/);
      assert.match(b, /data-preset="b"/);
      assert.match(a, /Preset A/);
      assert.match(b, /Preset B/);
      assert.doesNotMatch(a, /digital[ -]duty[ -]of[ -]care/i);
      assert.doesNotMatch(b, /digital[ -]duty[ -]of[ -]care/i);
      const defaultPage = await (await get(development.address.port, route)).text();
      assert.match(defaultPage, /data-preset="b"/);
      rendered.set(`${route}?preset=a`, a);
      rendered.set(`${route}?preset=b`, b);
    }
    // Mixed presets must not strand visitors on missing section anchors.
    for (const [address, html] of rendered) {
      for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
        if (/\bdownload\b/.test(match[0])) continue;
        const url = new URL(match[1].replaceAll("&amp;", "&"), `http://preview.local${address}`);
        if (url.origin !== "http://preview.local" || !url.hash) continue;
        const targetPath = url.pathname.replace(/\/$/, "") || "/";
        if (!comparisons.some(([route]) => route === targetPath)) continue;
        const presets = url.searchParams.has("preset") ? [url.searchParams.get("preset")] : ["a", "b"];
        for (const preset of presets) {
          const target = rendered.get(`${targetPath}?preset=${preset}`);
          assert.ok(target?.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${address} -> ${targetPath} preset ${preset}${url.hash}`);
        }
      }
    }
    const archive = await (await get(development.address.port, "/old-pages")).text();
    assert.match(archive, /href="\/old-pages\/den"/);
    assert.match(archive, /href="\/old-pages\/life"/);
    for (const route of ["/old-pages/den", "/old-pages/life", "/den", "/life"]) {
      const html = await (await get(development.address.port, route)).text();
      assert.match(html, /Old pages · Fix the Web/);
      assert.match(html, /href="\/old-pages"/);
    }
  } finally {
    await development.stop();
  }
});
