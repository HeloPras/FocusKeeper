# FocusKeeper

A Manifest V3 Chromium extension that tracks time on distracting sites, enforces configurable daily limits, manages daily TODOs and shows behavioural statistics in the browser side panel. All data stays in `chrome.storage.local`; nothing leaves the device.

## Run locally

```bash
npm install
npm run dev        # Extension.js opens Chrome with the extension and hot reload
npm run build      # production bundle in dist/chrome
npm run typecheck
```

To load the production build manually: `chrome://extensions` -> Developer mode -> Load unpacked -> `dist/chrome`. Click the toolbar icon to open the side panel.

## Structure

```
manifest.json                 permissions: tabs, storage, idle, alarms, notifications, sidePanel (no host permissions)
src/
  constants.ts                storage keys, alarm names, timing constants, validation limits
  background/
    background.ts             entry; registers listeners synchronously
    listeners.ts              all chrome.* event wiring
    sessionTracker.ts         reconcile(): the single tracking pipeline
    tabTracker.ts             asks Chrome which tab/window is focused
    idleTracker.ts            idle detection + idle rewind
    thresholdChecker.ts       runs limit checks and records/notifies events
    alarms.ts                 heartbeat alarm + exact-crossing scheduling
    notifier.ts               notifications (one per rule per check)
  thresholds/rules.ts         PURE rule building + evaluation (no chrome.*)
  categories/categories.ts    default categories, domain matching, colours
  storage/                    typed access: settings, time logs (per day), todos, tracker state
  statistics/                 pure aggregation + rule-based insights
  hooks/                      useAppData (storage subscription), useNow, useStatistics
  components/                 dashboard, todos, timer, statistics (SVG charts), settings, common
  pages/sidepanel/            React entry, App shell, CSS
  types/ utils/
```

## How tracking works

Every relevant event (tab activated/updated/removed, window focus, idle change, 30 s heartbeat alarm, settings change) calls one serialised `reconcile()`:

1. Ask Chrome for ground truth: focused window, its active tab, idle state.
2. Close the running segment: write `[segmentStart, end)` to the day's time log (split at midnight).
3. Start or continue a session for the current tab, or pause.
4. Run threshold checks and schedule the next crossing.

Because state is re-derived from Chrome each time, missed or reordered events cannot double-count. Not counted: unfocused window, idle/locked screen, non-http(s) pages (chrome://, extension pages), invalid URLs. When idle is detected, the idle timeout that already elapsed is rewound. Tabs playing audio keep counting while idle (setting).

**Service worker lifecycle.** The running session lives in `chrome.storage.session` (survives worker suspension, cleared on browser restart). Each session stores `lastSeen`; if the worker was unreachable longer than 75 s (sleep, crash), the gap is not credited. The heartbeat alarm wakes the worker every 30 s and re-validates everything.

## How threshold detection works

`evaluateThresholds` uses **persisted time + the uncommitted running segment**, so a limit is detected the moment the active session crosses it, independent of storage writes. After every pass the checker computes the time until the next level is crossed and schedules a one-shot `chrome.alarms` alarm for that instant (plus an in-memory timer for sub-30 s precision while the worker is alive). Events are keyed `date:rule:level`; recording is atomic, so each level notifies once per day. Rules: category limits and per-website limits; levels default to 80% and 100% and are configurable.

## Data storage

| Key | Area | Content |
|---|---|---|
| `fk:settings` | local | categories, limits, tracking/warning/todo preferences (sanitised on read and write) |
| `fk:day:YYYY-MM-DD` | local | `{ timeLog: domain -> ms, events: ThresholdEvent[] }`, pruned after the retention period |
| `fk:todos` | local | `Todo[]` |
| `fk:tracker` | session | running session, pause reason |

Categories are resolved at read time, so re-categorising a site immediately re-classifies history. Storage modules are the only code that touches `chrome.storage`; React reads through hooks. Corrupted values are repaired by the sanitisers instead of throwing.

## How the dashboard gets statistics

`useAppData` loads settings, todos, the last 30 day records and the tracker state, and reloads on any `fk:*` change. `applyLive` adds the running segment to today's log, and `computeDailyStatistics` derives per-day totals, categories, sites, warnings and task completion. Charts are plain SVG; trend lines appear only with at least two days of data.

## Moving to a backend later

Only `src/storage/*` reads or writes persistence. Replace `timeStorage`/`todoStorage`/`settingsStorage` with API-backed implementations (keeping `chrome.storage` as a cache) and nothing else changes.

## Visual design

The panel is designed as "the keeper's instrument panel": FocusKeeper lives in a sidebar next to the very feeds it's measuring, so it's built to read like a logbook gauge — ink, brass and verdigris, engraved rules instead of drop shadows — rather than another soft SaaS dashboard. Dark is the native mode; light is the same system by daylight, not an afterthought.

- **Palette:** harbor-ink backgrounds, a brass/bronze accent (`--accent`), verdigris for "good" states, a dim lamp-red for alerts (`--bad`), all as CSS custom properties with full light/dark variants, including the chart category colours (`--cat-*`) so every chart re-themes automatically.
- **Type:** Newsreader (serif, oldstyle numerals) carries the dial, hero figures and brand mark; IBM Plex Sans carries all UI text — two clearly distinct, deliberately chosen families, both self-hosted (latin + latin-ext subsets only, ~290 KB total) so the panel has no runtime network dependency.
- **Hero:** today's tracked time is an engraved gauge (`FocusRing`) — a ticked rim, bezel, and one coloured arc per category — rather than a flat bar or generic donut chart.
- **Navigation:** tabs are cut like ledger index cards, the active one raised and merged into the content below; pure CSS, no indicator math.
- **Structure:** a short brass rule marks every section heading instead of an all-caps eyebrow label; primary grouped panels (category editor, daily limits) get a brass top rule as a "plate," while today's alert log is a plain timestamped list — distinct treatments for interpretive content versus a literal record.
- **Motion:** one entrance animation per view on mount, a breathing live-indicator dot, smooth easing on progress bars, toggles and checkboxes, all gated behind `prefers-reduced-motion`.
- **Controls:** settings booleans render as sliding toggle switches and todo checkboxes as an animated check mark, both pure CSS on the existing `<input type="checkbox">` elements.

## Known limitations

- Optional site blocking is not implemented; limits warn and notify only.
- Domains collapse to the registrable domain using a small built-in multi-part suffix list (not the full Public Suffix List).
- Up to ~30 s of tracked time can be lost if the browser is force-quit; a browser restart discards the open segment.
- Alarms are clamped to 30 s in packed extensions, so the exact-crossing alarm can fire up to 30 s late if the worker was suspended; the in-memory timer covers the case where it is alive.
- Chromium only. If several windows are open, only the last focused normal window counts.
- No automated UI tests; core pure logic (URL parsing, day splitting, threshold evaluation, settings repair) was verified with a scripted check.
