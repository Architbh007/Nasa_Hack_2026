# New Feature Idea: **Invisible Flames**

*A cool-flame and droplet-fire lab built from NASA's measured microgravity fires.*

**Project:** FireSight (NASA Space Apps 2026, *Flame in Freefall*) · **Page:** `/flames` · **Nav label:** "Invisible Flames"

---

## The idea in one paragraph

Everything FireSight shows today uses only *where* each test was run (oxygen and pressure) and whether it burned. But our data also holds **hundreds of measured flame-physics values that the app never uses**: droplet sizes, burning rates, burn times, the size at which each flame went out, and 120 runs where a **cool flame** appeared. In freefall, a fuel droplet can keep reacting after its visible flame dies, in a flame too cool to see. **Invisible Flames** replays real microgravity fires from their measured numbers, shows the visible flame dying while the invisible cool flame carries on, and explains why a fire you can't see is a real hazard for a crewed habitat. It's new science in the app, very visual, and still 100% real data.

---

## Why this direction

| Today (built) | Invisible Flames (new) |
| --- | --- |
| Where tests were run (O2 × pressure) | **What the flames actually did** (measured physics) |
| Pass/fail outcome per run | Burning rate, burn time, extinction size, cool-flame phase |
| Coverage maps and gaps | Animated replays, trends per fuel, a quiz |
| Uses about 2 fields per run | Uses the unused measurement fields (about 1,600 values) |

It's not a wrapper on the existing coverage tools: it's a new view of a different part of the data.

---

## The data it uses (already in `data/runs.json`)

| Investigation | Measured values | Runs |
| --- | --- | --- |
| **FLEX** (droplets) | initial droplet diameter, burning rate (mm²/s), burn time, extinction diameter | ~260 |
| **CFI** (cool flames) | initial diameter, hot-flame extinction diameter, **cool-flame extinction diameter**, hot-flame burn time | ~150 (120 with cool flames) |
| **Saffire IV–VI** | peak and average heat release, outlet temperature, CO and CO₂ rise | 3–5 |

**Fuels:** methanol (157), heptane (117), n-dodecane (80), dodecane/iso-dodecane blends (103), farnesane (44).
**Recorded outcomes:** extinguished, burned, droplet disruption, cool flame.

---

## What we build (four parts)

### 1. Flame Replay (centrepiece)
- Pick a fuel, then a **real run** (FLEX or CFI), shown with its id and source.
- An animated droplet shrinks according to the run's **measured** starting diameter and burning rate (d² falls in a straight line over time: the classic d²-law), stopping at its **measured** extinction diameter and burn time.
- **Side by side:** the same flame in freefall (a perfect sphere) and on Earth (a teardrop pulled up by buoyancy, drawn as a labelled illustration).
- A live readout of time, droplet diameter and phase (*hot flame → extinction → cool flame → end*).
- Any value the run doesn't record is shown as "not recorded" and never filled in.

### 2. The Invisible Phase (the "wow")
- For CFI cool-flame runs, the bright flame **vanishes** at its measured hot-flame extinction diameter.
- The droplet keeps shrinking under a faint "ghost" flame until the **measured cool-flame extinction diameter**.
- A callout reads: *"The visible fire is out. The reaction is not."*

### 3. What the Data Shows (trends)
- **Burning rate vs oxygen** and **vs pressure**, one colour per fuel. Every dot is a real run you can click to see its source.
- **Which runs went cool:** cool-flame runs vs hot-only runs, by fuel, oxygen and pressure.
- **Extinction size vs starting size:** do bigger droplets go out later?
- These charts describe the measurements only. There are no fitted predictions beyond a clearly labelled trend line through the real points.

### 4. "Will It Vanish?" quiz (judge engagement)
- The app shows a real run's fuel, oxygen, pressure and droplet size.
- The user guesses: *burns out*, *goes out early*, *breaks apart*, or *turns invisible (cool flame)*.
- The app then reveals what the real run recorded, with a link to its source. It keeps a score.

### 5. Habitat safety angle (connects to the rest of FireSight)
- A short panel, *"Why invisible fire matters in a cabin"*:
  - A cool flame gives off little visible light, so crews may not see it.
  - Flame detectors that look for a bright flame may not detect it.
  - It keeps producing partly burned vapours.
- It lists the fuels and conditions in our data where cool flames occurred, with citations.
- The AI (OpenAI) explains any selected run in plain words, citing run and investigation ids only.

---

## Where it lives

| Piece | File |
| --- | --- |
| Physics helpers (d²-law replay timeline, phases, per-fuel stats) | `lib/flames.ts` |
| Tests on real FLEX/CFI runs | `tests/flames.test.ts` |
| Page | `app/flames/page.tsx` |
| UI | `components/flames/flame-replay.tsx`, `trends.tsx`, `quiz.tsx`, `safety-panel.tsx` |
| AI run explainer | `app/api/flame-explain/route.ts`, plus a prompt and schema in `lib/ai/` |
| Navigation | sidebar item **"Invisible Flames"**, and a new step in the home page demo path |

---

## Demo script addition (about 45 seconds)

1. Open **Invisible Flames** and pick **heptane**, then a CFI run.
2. Press play: the droplet shrinks in a perfect sphere, next to the Earth teardrop.
3. The bright flame **disappears**, and the ghost flame keeps going: *"The visible fire is out. The reaction is not."*
4. Show the trend chart: burning rate by fuel and oxygen, every dot a real run.
5. Let a judge try **"Will It Vanish?"** on one run.
6. Close: *"In freefall, fire can be invisible, and NASA's own data proves it."*

---

## Rules we keep

- **Real data only.** Every number shown comes from a FLEX, CFI or Saffire record, with its source.
- **The replay is a reconstruction** from measured values and the d²-law. It's labelled as such; it's not video.
- **Missing values stay missing.**
- **No predictions** of real-habitat fire behaviour. This shows what NASA measured.

## Open questions

- Check how many CFI runs have *both* hot-flame and cool-flame extinction diameters (needed for the full replay).
- Confirm burning-rate units and definitions per investigation before plotting them together.
- Choose which runs are featured in the quiz (a balanced mix of outcomes).
