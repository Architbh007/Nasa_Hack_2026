# FireSight: Habitat & Experiment Planner Guide

A guide to the two main pages of FireSight: **what they show, how they work technically, and how to explain them to anyone.**

| Page | URL | The one question it answers |
|---|---|---|
| **Habitat Flammability Explorer** | `/habitat` | *"Has NASA ever actually tested fire in cabin air like this?"* |
| **Experiment Planner** | `/planner` | *"Which fire tests should NASA fly next?"* |

**Contents**

1. [Background you need first](#1-background-you-need-first)
2. [Habitat page: simple explanation](#2-habitat-page--simple-explanation)
3. [Habitat page: how it works technically](#3-habitat-page--how-it-works-technically)
4. [Experiment Planner: simple explanation](#4-experiment-planner--simple-explanation)
5. [Experiment Planner: how it works technically](#5-experiment-planner--how-it-works-technically)
6. [How to read the graphs](#6-how-to-read-the-graphs)
7. [How to explain it to someone else (scripts)](#7-how-to-explain-it-to-someone-else)
8. [FAQ: questions people will ask](#8-faq--questions-people-will-ask)
9. [Limitations to state honestly](#9-limitations-to-state-honestly)

---

## 1. Background you need first

### Why fire in space is a problem

- On Earth, hot air rises, so flames are tall and pull in fresh air from below.
- In **microgravity** (floating in orbit), hot air doesn't rise. Flames become **slow, round and blue**, and they only get fresh oxygen if a **fan blows air** over them.
- Future Moon and Mars habitats plan to use **thinner air with more oxygen**. That's good for spacewalks and lighter structures, but **more oxygen makes things catch fire more easily**.
- NASA has tested fire in space, but **mostly in normal space station air**. Moon/Mars-style air is **barely tested**.

### The cabin presets (types of spacecraft air)

| Preset | Oxygen | Pressure | Gravity | What it is |
|---|---|---|---|---|
| **Earth sea level** | 21% | 14.7 psi | Earth | Normal Earth air |
| **ISS cabin** | 21% | 14.7 psi | Microgravity | Air on the International Space Station, the same as Earth |
| **Lunar exploration atmosphere** | 34% | 8.2 psi | Moon | NASA's planned air for Moon habitats |
| **Staged-decompression cabin** | 26.5% | 10.2 psi | Microgravity | "Halfway" air used to prepare for spacewalks |
| **Spacesuit** | 100% | 4.3 psi | Microgravity | Pure oxygen inside a spacewalk suit |

**Why thinner air?** Spacesuits run at low pressure. Going from full Earth pressure straight into a suit risks "the bends", like a diver surfacing too fast, so astronauts must pre-breathe pure oxygen for hours first. A lower cabin pressure cuts that wait, and the walls carry less load.

**Why more oxygen %?** With thinner air, a higher share of oxygen is needed so the crew still gets enough to breathe.

**The pattern:** Earth → ISS → staged → Moon → suit means **thinner air, a higher oxygen share, more fire risk and fewer tests**.

The actual oxygen available (**oxygen partial pressure** = oxygen % × pressure) stays roughly similar:

| Preset | Oxygen partial pressure |
|---|---|
| Earth / ISS | 3.09 psi |
| Moon | 2.79 psi |
| Staged | 2.70 psi |
| Suit | 4.3 psi |

So the crew can breathe in all of them, but the **oxygen share** is what changes fire behaviour.

### Where the data comes from

**772 real fire tests**, all done in space (microgravity):

- **764** from **NASA PSI (Physical Science Informatics)**, NASA's official archive of ISS experiment data
- **8** hand-copied from **published NASA papers** (Saffire IV–VI), labelled "published paper" in the app

| Experiment | What it was | Fuel type |
|---|---|---|
| **BASS / BASS-II** (Burning and Suppression of Solids) | Small material samples burned in a sealed box **inside the ISS**, with a fan controlling airflow. Studied how materials burn and how flames go out. | Solid |
| **Saffire I–VI** (Spacecraft Fire Safety) | **Large** fires lit on purpose inside an **empty Cygnus cargo ship after it left the ISS**. With no crew nearby, NASA could burn big samples. Saffire IV–VI tested Moon/Mars-like oxygen and pressure. | Solid |
| **FLEX** (Flame Extinguishment) | Tiny burning fuel droplets | Liquid |
| **CFI** (Cool Flames Investigation) | Liquid fuel droplets burning as "cool flames" | Liquid |
| **ACME** series | Gaseous fuel flames; held as NASA metadata and summaries only, no run-level tests | Gas |

**Trust rules built into the app:**

- Every value links back to the NASA file and row it came from.
- **Missing values stay missing.** Nothing is filled in or invented.
- If a test didn't record a pressure, it's placed at the cited ISS nominal (14.7 psi) and **marked as assumed**.

---

## 2. Habitat page: simple explanation

> **In one line:** describe a space home's air, and the page shows whether NASA has tested fire there, what happened, and where nobody has tested yet.
> **It never predicts.** It only reports real test results and clearly marks the gaps.

The running example used below:

> **Lunar base:** 34% oxygen, 8.2 psi, fabric, ventilated airflow, Moon gravity.

### Section by section

| # | Section | Input | Output |
|---|---|---|---|
| 1 | **Cabin condition** (left panel) | Preset, oxygen %, pressure, material (fabric, plastic, foam, wire insulation, liquid fuel, gas leak), airflow (still, low, ventilated), gravity | The whole page updates instantly. The URL updates so the cabin can be shared. |
| 2 | **Partial gravity warning** | Gravity | For Moon or Mars: "every test in the data was in microgravity". |
| 3 | **Readouts and verdicts** | Oxygen, pressure, material | Oxygen partial pressure (e.g. 2.79 psi); oxygen vs Earth (e.g. +62%); a traffic light per fuel type: ✅ Has test data / 🟡 Test data nearby / ❌ No test data nearby. |
| 4 | **Coverage map** (heatmap) | Oxygen, pressure, material tab, clicking a square | A grid of every cabin air, coloured by what real tests recorded there. Stripes mean untested. |
| 5 | **Nearest real experiments** | Oxygen, pressure, fuel type | The 5 closest real tests, with their results and sources. |
| 6 | **Never tested in this data** | Oxygen, pressure, gravity | A list of blind spots, e.g. "No run in lunar gravity". |
| 7 | **SI explanation and sources** | Automatic (cabin + results), plus an optional question | A plain-English AI summary, gaps, recommended tests, design advice and NASA source links. |
| 8 | **Fire Twin** | Air, which item burns first, vents on/off, crew on/off | An animated room fire showing which items catch, alarm, vents and crew. |
| 9 | **Most relevant investigations** | Cabin + 4 weight sliders | The top 6 NASA experiments to read, each with a visible score breakdown. |

### The coverage map

- **Left to right is oxygen** (15–51%). **Bottom to top is pressure** (3–15 psi).
- **Each square is a small range of air**, e.g. 33–36% oxygen and 8–9 psi.
- Each square shows **what happened in the real NASA tests done in that air, for that material**:
  - burned
  - went out (or never lit)
  - mixed
  - outcome not stated
  - faint fill: none inside, but one nearby
  - **striped: never tested**
- Dark stripes mean a bigger unknown, **not** more danger.

### The SI (AI) explanation

**SI** is the app's name for its AI. It reads the results already on the page and explains them.

- It's given **only** data the server recomputes from the dataset.
- It may **only cite** the experiments it was given. Anything else is rejected.
- **Output:** a plain summary, atmosphere factors, knowledge gaps, relevant evidence, recommended tests, and prevention / detection / suppression advice.

### The Fire Twin

A top-down animated room with five items:
- stowage bag (fabric)
- sleeping bag (fabric)
- plastic panel
- wire bundle
- foam seat

It also has a supply vent, a return vent with a smoke detector, and a crew member.

> **The question it answers:** "If this one item catches fire, what else could catch, and what happens next?"

| | What | Source |
|---|---|---|
| ✅ Real | **Whether each item ignites** | The nearest real NASA tests of that material at this air |
| ❓ Untested | Items with no nearby test (foam, wires) | Marked "untested", **never guessed** |
| 🎬 Illustrative | Spread speed, smoke travel, alarm and crew timing | Example values, labelled as such |

**How gravity changes the ending:**
- **Microgravity:** when the vents stop, the flame starves of oxygen and goes out.
- **Moon or Mars:** no self-extinguishing, so only the crew can put it out.

---

## 3. Habitat page: how it works technically

### Architecture

```
app/habitat/page.tsx  (Server Component)
   getDataset() → investigations, runs, scenarios
   trims unused run fields (notes, flags, metrics except length)
        │
        ▼
components/habitat/habitat-view.tsx  (Client Component)
   state: { presetId, inputs }, weights
   assessment = useMemo(() => assessHabitat(inputs, data, weights))
        │
        ├── Readouts / verdicts     ← assessment.pO2, o2IncreasePct, verdicts
        ├── FlammabilityGrid        ← lib/flammability-grid.ts
        ├── NearestRuns, Never tested ← assessment.verdicts[*].nearest, neverTested
        ├── InterpretationPanel → POST /api/habitat-interpret → lib/ai/operations.ts
        ├── CabinAsk           → POST /api/ask
        ├── FireTwin           ← lib/fire-twin.ts → POST /api/fire-twin (narration)
        └── RankingPanel            ← lib/ranking.ts
```

| File | Role |
|---|---|
| `lib/habitat.ts` | `assessHabitat()`, **one pure function** that produces everything the page shows. It's used by the UI, the AI route and the prewarm script, so the AI sees exactly what the user sees. |
| `lib/metrics.ts` | Distance, tolerances, partial pressure, nearest runs |
| `lib/flammability-grid.ts` | 12×12 coverage grid |
| `lib/fire-twin.ts` | Deterministic fire timeline |
| `lib/ranking.ts` | Transparent weighted scoring |
| `lib/ai/*` | Prompts, Zod output schemas, citation guard, cache |

### Core maths (`lib/metrics.ts`)

**Oxygen partial pressure:**
```
pO2 = (oxygen% / 100) × pressure
```

**Distance between two airs** (10 oxygen points count the same as 3 psi):
```
distance = √( (ΔO2 / 10)² + (Δpsi / 3)² )
```

| Constant | Value | Meaning |
|---|---|---|
| `TESTED_TOLERANCE` | ±2% O₂, ±1 psi | "Tested" |
| `NEAR_DISTANCE` | 0.6 | "Near" |

### Verdict logic (`categoryVerdict`)

For each fuel category (solid, liquid, gas):

1. No runs with both oxygen and pressure → **no-runs**
2. Any run within ±2% / ±1 psi → **tested**
3. Nearest run distance ≤ 0.6 → **near**
4. Otherwise → **untested**

### Coverage grid (`lib/flammability-grid.ts`)

- Oxygen 15–51% in steps of 3 and pressure 3–15 psi in steps of 1, giving **144 squares**.
- Runs are filtered to the chosen material: solids match on exact material, liquids and gases on category.
- Each square's status:
  - **tested**: it contains runs
  - **near**: the nearest run to its centre is ≤ 0.6 away
  - **untested**: otherwise
- Each tested square's tone, from the outcome counts:
  - **burned**: every stated outcome burned
  - **extinguished**: every stated outcome is extinguished, blowoff or no-ignition
  - **mixed**: anything else
  - **unstated**: only unknown outcomes
- Untested squares are shaded by distance (0.6 → 2.5) to show **how big the gap is**, not risk.

### Ranking (`lib/ranking.ts`)

```
score = Σ (weight × componentValue) / Σ weight
```

| Component | Value | Default weight |
|---|---|---|
| Tested range overlap | 1 if the investigation's tested box contains the point, else `exp(−d / 0.15)` | 0.35 |
| Fuel category match | 1 same material · 0.75 same category · 0.1 different | 0.35 |
| Airflow match | 1 if the flow is in the tested range, else `exp(−gap / 10)`; 0.5 if not recorded | 0.15 |
| Data detail | By data level (runs 0.6 + up to 0.4 by run count … metadata 0) | 0.15 |

### Fire Twin (`lib/fire-twin.ts`)

**1. Ignition (data-backed):** for each item:
- take the 6 nearest real runs of its material that have a stated outcome
- keep those within 0.6
- if none are left → **untested**
- if any burned → **ignites**

**2. Timeline (illustrative constants in `ILLUSTRATIVE`):**

| Event | Timing |
|---|---|
| Smoke reaches the detector | Travels at the vent flow speed, or 1.2 cm/s in still air, plus a 5 s detector delay |
| Alarm | 4 s after detection |
| Vents shut down | 15 s after the alarm |
| Extinguisher arrives | 45 s after the alarm |
| Microgravity self-extinguish | 25 s after the airflow stops |
| Spread | 0.5 mm/s, only to items within a 30 cm gap; up to +50% faster downstream of the vents |

Spread order is computed with a Dijkstra-style search on ignition time. Every event carries an `illustrative` flag.

### AI layer: `/api/habitat-interpret`

1. The request body is validated with Zod.
2. Inputs are normalised (O₂ to the nearest 0.5, psi to 0.1) so similar requests **share a cache entry**.
3. The server **recomputes** `assessHabitat()`. The client never sends numbers to the AI.
4. The top 6 ranked investigations and their runs are sent as context.
5. The output must match a strict schema. The **citation guard** rejects any `[id]` that wasn't provided.
6. Results are cached in `data/cache/`. `USE_CACHE_ONLY=true` makes the app serve the cache only, and `npm run prewarm` fills it.

### URL state

`?o2=34&p=8.2&m=fabric&a=ventilated&g=lunar` (or `?preset=lunar-base`). It's debounced by 300 ms and written with `history.replaceState`, so moving a slider doesn't trigger a page navigation.

---

## 4. Experiment Planner: simple explanation

> **In one line:** you say which space home you care about and how many tests you can afford, and it tells you exactly where to run each test to fill the biggest gaps.

**Think of it as stepping stones across a river:**
- You stand on the **known bank**: the places NASA has tested.
- The **Moon base** is on the far bank.
- You have **5 stones** (tests).
- Each stone goes where it gets you **closest to the far bank**, and (in careful mode) never further than one safe step.

### What you set

| Setting | Meaning | Default |
|---|---|---|
| **Mission targets** | The air you need to be sure about: Lunar base, Staged-decompression cabin, Spacesuit, or a custom air | Lunar base + Staged-decompression cabin |
| **Material** | Which tests count as existing evidence | All solids |
| **Test budget** | How many tests you can afford (1–8) | 5 |
| **Campaign style** | **Stepping stones** (each test stays close to existing evidence) or **Direct** (may jump straight to the target) | Stepping stones |

### What it shows

| Section | Output |
|---|---|
| **Before and after** | Each target's status now and after the plan, e.g. *Not tested → Tested after test 3*, plus "map squares covered: X → Y of 144". |
| **The campaign on the map** | Real tests as dots, targets as dashed rings, new tests as orange numbers, with arrows showing which test each one steps from. Toggle Before / After. |
| **Proposed tests** | One card per test: oxygen, pressure, oxygen partial pressure, **why it was chosen**, the real tests it builds on, NASA hardware that has flown at this pressure, a boundary flag, and a partial-gravity flag. |
| **Experiment proposal** | One click has the AI write a cited proposal. **Copy as Markdown** exports the plan. |

### What it uses from each test in the database

| Used to **choose** tests | Used only to **describe** tests | Not used at all |
|---|---|---|
| Oxygen %, pressure, material (as a filter) | Test ID and experiment, result (burned or out), source file and row, assumed-pressure flag, recorded pressure (for the hardware note) | Airflow, sample size, flame measurements, notes |

**The new tests are new oxygen and pressure points**, placed where nobody has tested yet.

---

## 5. Experiment Planner: how it works technically

All of the logic is in **`lib/planner.ts` → `planExperiments(runs, options)`**. It's a pure and **deterministic** function: the same input always gives the same plan.

### The algorithm (greedy, one test at a time)

```
evidence = all real runs of the chosen material (as (O2, psi) points)
candidates = every 1% O2 (15–51) × every 0.5 psi (3–15)  → 925 points
             + each exact target point

repeat budget times:
    for each candidate c:
        skip if c is within ±2% O2 / ±1 psi of any evidence      (already tested)
        if mode == stepping: skip if distance(c, nearest evidence) > 0.6   (too far)

        gain = 0
        for each target t not yet tested:
            before = distance(t, nearest evidence)
            after  = distance(t, c)
            if after < before: gain += before − after

        coverage = number of grid-square centres currently > 0.6 from evidence
                   that would be ≤ 0.6 from c

        score = gain + 0.01 × coverage
        (if no score > 0 → stop early)

    pick the highest score   (ties → lower O2, then lower pressure)
    add it to the evidence   ← later tests can step from it
```

### Worked example (made-up numbers)

- **Target:** Lunar base (34%, 8.2 psi).
- **Pretend** the nearest real run is at (21%, 14.7 psi):
  ```
  distance = √((13/10)² + (6.5/3)²) ≈ 2.53   → not tested
  ```
- **Candidate** at (24%, 13.5 psi):

| Check | Calculation | Result |
|---|---|---|
| Distance from the real run | √(0.3² + 0.4²) = 0.5 | ✅ Within 0.6, a safe step |
| Already tested? | Oxygen differs by 3% (> 2%) | ✅ No, new ground |
| Distance to the target | ≈ 2.03 | |
| Gain | 2.53 − 2.03 | **0.50** |

The planner compares every candidate's gain and picks the best one, usually about one safe step toward the target. It then repeats from there: 2.53 → ~1.9 → ~1.3 → … until the target is within tolerance.

### Extra information computed for each chosen test

| Card field | How |
|---|---|
| **Steps from** | The nearest evidence point (a real run or an earlier planned test). This is the arrow on the map. |
| **Builds on** | The 3 nearest real runs, with outcomes and source file and row |
| **Boundary flag** | Runs within 0.6 include **both** burned and went-out, so the burn / no-burn line is nearby |
| **Flown hardware** | Investigations that **recorded** a pressure within ±0.75 psi (assumed ISS pressure doesn't count) |
| **Partial gravity flag** | The test helps a Moon or Mars target, but all evidence is microgravity |
| **Reason** | "Tests the X itself", or "Moves the nearest evidence closer to X (distance a → b)", or "Brings N untested squares within reach" |

### Before and after

- **Before:** `verdictAt(target, realRunsOnly)`
- **After:** `verdictAt(target, realRuns + plannedTests)`
- **Coverage:** `coverageCount()` over the 144 squares (tested / near / untested), before and after
- **testedAfterTest:** the first test that brings a target within ±2% / ±1 psi

It uses **the same distance and thresholds as the Habitat page**, so both pages agree.

---

## 6. How to read the graphs

### Habitat coverage map

| Element | Meaning |
|---|---|
| X axis | Oxygen % (15–51). Earth is 21%. |
| Y axis | Pressure (3–15 psi). Earth is 14.7. |
| Coloured square | Real tests here; the colour shows what happened (burned, went out, mixed, not stated) |
| Faint square | No test inside, one nearby |
| Striped square | Never tested (darker means further from any test) |
| Markers | Your cabin and the presets |
| Click a square | Moves your cabin there and shows the tests inside |

### Planner campaign map

| Element | Meaning |
|---|---|
| Green square | Real tests inside |
| Grey square | Near a test |
| Striped square | Untested |
| Small dots | Real NASA tests, coloured by result (burned, extinguished, never lit, not recorded). **Hollow** means pressure not recorded, placed at 14.7 psi. |
| Dashed ring + label | Mission target (e.g. Lunar base) |
| Orange numbers | Proposed new tests (1, 2, 3…) |
| Orange arrows | Which evidence each test steps from |
| Before / After toggle | The map without and with the planned tests |
| Bar above the map | Squares covered: today (dark) → after the plan (light) |

**What to notice first:** the dots cluster **near the top, around 21% oxygen**. That's normal ISS air, where most tests happened. The Moon target sits **lower and to the right, in the striped area**.

---

## 7. How to explain it to someone else

### The 30-second pitch

> "Future Moon and Mars habitats will use thinner air with more oxygen, which makes fire more dangerous. NASA has run hundreds of fire tests in space, but almost all in normal space-station air. FireSight shows, in seconds, whether a proposed cabin's air has ever actually been tested, what happened, and where the blind spots are. Then it plans the fewest new tests needed to close those gaps."

### Habitat page script (about 1 minute)

> "You describe the space home's air here: oxygen, pressure, what's inside. Instantly you get a traffic light: has NASA tested fire in this air?
>
> This map shows every possible cabin air. Coloured squares are where NASA actually tested, and the colour shows if things burned. **Striped squares mean nobody has ever tested there.**
>
> Below are the five closest real experiments, and an honest list of what's never been tested, like 'no test has ever been done in Moon gravity'.
>
> The AI section explains it in plain English with NASA sources. The Fire Twin shows a virtual room fire, where whether each item catches comes from real tests. Finally, it ranks which NASA experiments matter most."

### Planner page script (about 1 minute)

> "This is a map of every type of air a spacecraft could have. Right means more oxygen; up means thicker air.
>
> Each dot is a real NASA fire test. See how they're bunched at the top? That's space-station air.
>
> The dashed circle is where we want to go: the Moon base air, sitting in the striped, untested area.
>
> The orange numbers are the tests the planner recommends. Each is one safe step from something already tested, following the arrows, building a path to the Moon base.
>
> Click 'After', and the gaps fill in. With 5 tests, the Moon base goes from **not tested** to **tested**."

### Demo flow that works well

1. **Habitat → ISS cabin:** mostly coloured, well tested.
2. **Switch to Lunar base:** the marker lands near the stripes, and the "never tested" list grows.
3. **Open the Fire Twin:** start a fire at the stowage bag, then toggle the vents off.
4. **Go to the Planner:** show the dot cluster, then the target ring, then follow the orange arrows.
5. **Toggle Before / After**, then drop the budget to 2 to show the plan falling short.

### Tips

- **Point at the dot cluster first:** "this is all we know".
- **Say "it doesn't predict, it shows evidence and gaps"** early. It builds trust.
- Use **analogies**: a traffic light (verdicts), a chessboard (the map), stepping stones (the planner), a digital twin (the Fire Twin).

### One-line summaries

| Thing | One line |
|---|---|
| Habitat page | "Describe a space home's air and see whether NASA has tested fire there, what happened, and what's never been tested." |
| Coverage map | "For this air and this material, here's what NASA's real tests recorded, or a clear note that nobody tested it." |
| SI explanation | "The AI explains the results in plain English and may only cite the NASA experiments it was given." |
| Fire Twin | "Light one item and see what else catches. Whether things burn is real data; timing is illustrative." |
| Planner | "Pick your target air and budget, and it lays out the stepping-stone tests that close the gap." |
| Planner graph | "Dots are what NASA tested, stripes are what nobody has, rings are where we're going, orange numbers get us there." |

---

## 8. FAQ: questions people will ask

**Does it predict whether a cabin will catch fire?**
No. It only shows what real tests recorded and where data is missing. The Fire Twin's ignition comes from real tests; its timing is illustrative.

**Why should I trust the numbers?**
Every value traces back to a NASA PSI file and row, or to a cited paper. Missing values are left blank, and the AI can only cite the experiments it was given.

**Why does Moon gravity show as untested?**
Every test in the dataset was done in microgravity. Nobody has run these fire tests in lunar or Mars gravity.

**Why "10% oxygen = 3 psi"?**
It's a scaling choice so oxygen and pressure can be compared on one distance scale. It's used consistently across both pages.

**What does "tested" mean exactly?**
A real test of the same fuel type within ±2% oxygen and ±1 psi. "Near" means within distance 0.6.

**Why are foam and wires "untested" in the Fire Twin?**
The dataset has no foam or wire-insulation runs, so the app refuses to guess.

**Is the planner's plan optimal?**
It's a **greedy** method: it picks the best test one at a time. It's simple, transparent and deterministic, but it doesn't search every possible combination.

**What does the planner ignore?**
Airflow, sample size and cost. It plans on oxygen and pressure only; gravity is flagged, not optimised.

**Does the app need an AI key?**
Only for the SI sections (explanation, ask, narration, proposal). Everything else works without one, and cached answers can be served with `USE_CACHE_ONLY=true`.

---

## 9. Limitations to state honestly

- **All 772 tests are microgravity.** Moon and Mars results are flagged, not extrapolated.
- **No foam or wire-insulation tests** in the data.
- **Some runs have no recorded pressure.** They're placed at the ISS nominal 14.7 psi and marked.
- **Fire Twin timing is illustrative**, not measured.
- **The planner** is greedy, uses only oxygen and pressure, and doesn't model cost or difficulty.
- **Not for flight certification.** FireSight supports engineering judgement and does **not** replace NASA flammability standards such as **NASA-STD-6001**.
