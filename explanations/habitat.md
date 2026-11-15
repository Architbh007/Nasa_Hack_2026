# Habitat Flammability Explorer (`/habitat`)

> **The one question this page answers:** *"Has NASA ever actually tested fire in cabin air like this?"*

This document explains the Habitat page twice:

1. **[In simple terms](#part-1--in-simple-terms):** what each section does, its input, an example and its output. Use this part for stakeholders.
2. **[In technical terms](#part-2--how-it-works-technical):** how it's built, the files, the formulas and the data flow. Use this part for developers.

---

# Part 1: In simple terms

## The big idea

In space or on the Moon, the air inside a habitat is different from Earth's. To save weight and make spacewalks easier, future habitats will likely use **lower pressure and more oxygen**, and more oxygen means things catch fire more easily.

NASA has run hundreds of fire experiments in space, but the results are spread across many reports. This page lets you **describe a space home's air** and instantly see:

- whether NASA has tested fire in that air
- what happened in those tests (did things burn or go out?)
- where **nobody has tested yet** (the blind spots)
- which experiments NASA should run next

**It never predicts or guesses.** It only reports what real experiments recorded, and says clearly where data is missing.

### Running example used throughout

> **"Lunar base" preset:** 34% oxygen, 8.2 psi pressure, fabric, ventilated airflow, Moon gravity.
> In plain words: a Moon habitat with thinner air but a higher share of oxygen, with fabric items like bags and clothing inside.

---

## Section 1: Cabin condition (settings on the left)

**What it is:** where you describe the space home. Every other section reacts to it.

**Input:**

| Control | Options |
|---|---|
| Preset | Earth sea level, ISS cabin, Lunar base, Staged-decompression cabin (10.2 psi), Spacesuit |
| Oxygen % | 15–100% |
| Pressure | 3–15 psi (Earth is 14.7) |
| Material | Fabric, Plastic, Foam, Wire insulation, Liquid fuel, Gas leak |
| Airflow | Still (quiescent), Low (5 cm/s), Ventilated (20 cm/s) |
| Gravity | Microgravity (orbit), Lunar (0.16 g), Mars |

**Example:** click "Lunar base", or drag the sliders to 34% and 8.2 psi.

**Output:** the whole page updates instantly. The web address also updates, so you can copy and share the link to this exact cabin.

---

## Section 2: Partial gravity warning

**What it is:** a caution banner that appears only for Moon or Mars gravity.

**Input:** the gravity setting.

**Output:** a reminder that **every experiment in the dataset was done in microgravity (orbit)**. None of them shows how fire behaves at Moon or Mars gravity.

---

## Section 3: Readouts and verdicts (the row of cards)

**What it is:** the headline answer, like a traffic light.

**Input:** oxygen %, pressure and material.

**Output (example: Lunar base):**

| Card | Example | Meaning |
|---|---|---|
| O₂ partial pressure | 2.79 psi (19.2 kPa) | How much oxygen is actually available. Earth is 3.09 psi. |
| O₂ vs Earth | +62% | The air is 62% richer in oxygen than Earth's 21%. |
| Solid fuels | ✅ / 🟡 / ❌ | Whether fabric, plastic and similar materials have been tested here. Highlighted, because fabric is a solid. |
| Liquid fuels | ✅ / 🟡 / ❌ | Same check for liquid fuels. |
| Gas fuels | ✅ / 🟡 / ❌ | Same check for gas leaks. |

The verdicts mean:

- ✅ **Has test data:** a real NASA test was done in very similar air.
- 🟡 **Test data nearby:** tested in somewhat similar air.
- ❌ **No test data nearby:** the nearest test is far away.
- **No run data:** NASA has no tests at all for this fuel type.

---

## Section 4: Coverage map ("Is this air covered by real tests?")

**What it is:** a heatmap of **every possible cabin air**, showing where NASA has tested fire.

**How to read it:** it's a grid of squares, like a chessboard.

- **Left to right is oxygen:** 15% to 51%. Earth is 21%.
- **Bottom to top is pressure:** thin air (3 psi) to Earth-like air (15 psi).
- **Each square is a small range of air**, for example 33–36% oxygen and 8–9 psi.
- Your cabin and the presets are marked on the map.

**Input:** oxygen, pressure and material (chosen with tabs above the map). You can also **click a square**.

**Output:** each square is coloured by **what happened in the real NASA tests done in that air, for that material**:

| Square | Meaning |
|---|---|
| Burned colour | Every test there that recorded a result burned. |
| Went-out colour | The flame died or never lit. |
| Mixed colour | Some burned and some went out. |
| Outcome-not-stated colour | Tests were done, but the report doesn't say what happened. |
| Faint fill | No test in this exact square, but one close by. |
| **Striped** | **Nobody has ever tested here.** |

Pale stripes mean tested air is nearby. Dark stripes mean a big unknown. A darker square means **"we know less here"**, not **"more dangerous"**.

Clicking a square moves your cabin there and shows the tests inside it, plus the 5 nearest real tests.

> **In one sentence:** "For this air and this material, here's what happened when NASA actually tested it, or a clear note that they never did."

---

## Section 5: Nearest real experiments

**What it is:** the 5 real NASA tests closest to your cabin's air.

**Input:** oxygen, pressure and fuel type.

**Output:** a table showing, for each test:
- the experiment name
- its oxygen and pressure
- how far it is from your cabin
- what happened (burned or went out)
- a source link

These are **neighbours to read, not a prediction.**

---

## Section 6: Never tested in this data

**What it is:** an honest list of blind spots.

**Input:** oxygen, pressure and gravity.

**Output (example):**

- "Every run in this dataset was in microgravity; none at Lunar (0.16 g)."
- "No solid-fuel run at 40% O2 or higher (highest: X%)."
- "No solid-fuel run combines this much O2 with this low a pressure."

**Why it matters:** this list tells NASA exactly **which experiment to run next**.

---

## Section 7: SI explanation and sources

**SI** is what the app calls its AI. This section is the AI **reading the results above and explaining them in plain English.**

**Input:**
- You don't type anything for the explanation itself. The AI is given your cabin settings plus the same results the page already worked out: the verdicts, the nearest tests, the "never tested" list and the top 6 ranked experiments.
- It can **only cite experiments from that list**. If it cites anything else, the app rejects the answer.

**Output:**

| Part | What it says |
|---|---|
| In plain words | A 2–3 sentence summary anyone can understand. |
| Atmosphere factors | What about this air affects fire, e.g. "high oxygen makes fabric burn more easily". |
| Knowledge gaps | What we don't know, e.g. "never tested in Moon gravity". |
| Relevant evidence | Which NASA experiments back this up, and why. |
| Recommended tests | The experiments NASA should run next, and why. |
| Prevention / Detection / Suppression | Design advice: stop a fire starting, spot it early, put it out. |
| Sources | Links to the original NASA pages. |

### "Ask about this cabin" (chat box)

- **Input:** your own question. Your cabin settings are sent with it automatically. Ready-made example questions are also available.
- **Example:** "Would a foam seat be safe in this Moon base air?"
- **Output:** an answer based on the NASA data, with sources.

> This section needs an AI API key. Every other part of the page works without one.

---

## Section 8: Where the data comes from (sources)

All data comes from **real NASA fire experiments done in space**:

1. **NASA PSI (Physical Science Informatics):** NASA's official archive of ISS experiment data. **764 tests** come from its tables.
2. **NASA research papers:** **8 tests** copied by hand from published papers on the Saffire IV–VI flights. The app labels these "published paper".

**Total: 772 real fire tests.**

| Experiment | What NASA burned | Fuel type |
|---|---|---|
| **BASS / BASS-II** (Burning and Suppression of Solids) | Small fabric and plastic samples on the ISS | Solid |
| **Saffire I–VI** (Spacecraft Fire Safety) | Large material sheets, burned inside an empty cargo spacecraft after it left the ISS | Solid |
| **FLEX** (Flame Extinguishment) | Tiny fuel droplets | Liquid |
| **CFI** (Cool Flames Investigation) | Liquid fuel droplets (cool flames) | Liquid |
| **ACME** series (gas flames) | Gaseous fuel flames; metadata and summaries only, no run-level tests | Gas |

**Why it can be trusted:**
- **Nothing is made up.** Every number traces back to a specific NASA file and row.
- **Missing data stays missing.** Gaps are left blank, never filled in.
- **The AI can only cite these experiments.**

> ⚠️ This tool **supports engineering judgement**. It does **not** replace NASA's official fire-safety standards (such as NASA-STD-6001) and must not be used for flight certification.

---

## Section 9: Fire Twin ("What would a fire look like?")

**What it is:** a small animated **"what if" fire simulation**, a top-down view of one room in a space home. "Twin" comes from **digital twin**: a virtual copy of a real place you can safely experiment on.

**In one line:** *"If this one item catches fire, what else in the room could catch fire, and what happens after that?"*

**What's in the room:**

| Item | Material |
|---|---|
| Stowage bag | Fabric |
| Sleeping bag | Fabric |
| Plastic panel | Plastic |
| Wire bundle | Wire insulation |
| Foam seat | Foam |

The room also has an air vent blowing in on the left wall, an air return with a smoke detector on the right wall, and a crew member.

**Input:**
- **The air:** from the cabin settings at the top of the page, or from preset buttons.
- **Fire starts at:** which item catches fire first.
- **Vents:** on or off.
- **Crew response:** on or off.
- **Play, pause, restart and speed controls.**

**Output:** an animation and a timeline:
1. The first item catches fire, or **doesn't catch**, or is **untested**.
2. The flame spreads to nearby items, or doesn't.
3. Smoke reaches the detector and the alarm sounds.
4. The vents shut down.
5. The crew arrives with an extinguisher.
6. The fire is out, or the items burn out.

Beside the animation:
- **How sure are we?** Which real NASA tests the result is based on, and how big their samples were.
- **What NASA should test next.**
- **SI narration (optional):** the AI retells the fire in plain words, with sources.

### What's real and what's pretend

| | What | Where it comes from |
|---|---|---|
| ✅ **Real** | Whether each item **catches fire** | The nearest real NASA tests of that material at this air |
| ❓ **Untested** | Items with no nearby NASA test, e.g. foam and wires | The app **does not guess**; it marks them "untested" |
| 🎬 **Illustrative** | How **fast** fire spreads, smoke travel, alarm and crew timing | Example values, because NASA's data doesn't record them; labelled as such |

### How gravity changes the ending

- **Microgravity (orbit):** hot air doesn't rise in space, so a flame only gets fresh oxygen if a fan blows it in. **Once the vents stop, the flame starves and goes out by itself.**
- **Moon or Mars:** the app does **not** assume the fire puts itself out. Only the crew can stop it. With crew response off, items burn until they're used up.

### Example

> Moon base air, fire starts at the **stowage bag**, vents on, crew on:
> The bag catches (from real fabric tests near this air) → the flame spreads toward the sleeping bag → the smoke detector triggers → the alarm sounds → the vents shut off → the crew arrives with an extinguisher → the fire is out.

---

## Section 10: Most relevant investigations

**What it is:** a ranked list of the NASA experiments that matter most for your cabin.

**Input:** your cabin settings, plus four **weight sliders** you can adjust:

| Weight | Meaning | Default |
|---|---|---|
| Tested range overlap | Did the experiment cover this oxygen and pressure? | 35% |
| Fuel category match | Same fuel type (solid, liquid, gas)? | 35% |
| Airflow match | Similar air movement? | 15% |
| Data detail | Does the source include individual test runs, or only a summary? | 15% |

**Output:** the top 6 experiments, each with a score and a **visible breakdown** of why it scored that way. The list re-orders live as you move the weights.

---

## The whole page in one flow

**Describe the cabin** → **see whether it's tested** (cards and map) → **look at the closest real evidence** → **see the blind spots** → **get a plain explanation** (SI) → **watch what a fire could look like** (Fire Twin) → **find the experiments to read** (ranking)

### Pitch for stakeholders

> "Before anyone designs a Moon base, they need to know whether fire has ever been tested in that air. This page answers that in seconds using NASA's real experiment records, and it's honest about where the data runs out. Coloured squares are tested; striped squares mean you're designing in the dark."

**Demo tip:** start on **ISS cabin** (well tested, mostly coloured), then switch to **Lunar base** or drag oxygen up. The stakeholder watches the map turn striped and the "never tested" list grow. The **Spacesuit** preset (100% O₂, 4.3 psi) is beyond the edge of the map entirely.

---

# Part 2: How it works (technical)

## Architecture overview

```
app/habitat/page.tsx                (Server Component)
  │  getDataset() → investigations, runs, scenarios
  │  strips unused fields from runs (notes, flags) to shrink the client payload
  ▼
components/habitat/habitat-view.tsx (Client Component, owns all state)
  │  state: { presetId, inputs: HabitatInputs }, weights: RankingWeights
  │  assessment = useMemo(() => assessHabitat(inputs, data, weights))
  ▼
  ├─ HabitatHero / HabitatControls       → set preset / inputs
  ├─ PartialGravityCallout               → gravity !== "micro"
  ├─ HabitatReadouts                     → assessment.pO2, o2IncreasePct, verdicts
  ├─ FlammabilityGrid                    → lib/flammability-grid.ts
  ├─ NearestRuns + "Never tested" list   → assessment.verdicts[cat].nearest, neverTested
  ├─ InterpretationPanel  ──POST──►  /api/habitat-interpret → lib/ai/operations.interpretHabitat
  ├─ CabinAsk             ──POST──►  /api/ask
  ├─ FireTwin             → lib/fire-twin.ts (planFire)  ──POST──► /api/fire-twin (narration)
  └─ RankingPanel                        → assessment.ranked (lib/ranking.ts)
```

### Key files

| File | Role |
|---|---|
| `app/habitat/page.tsx` | Server entry. Loads the dataset, trims runs, wraps the view in `<Suspense>` with a skeleton. |
| `components/habitat/habitat-view.tsx` | Client orchestrator. State, URL sync, layout of every section. |
| `lib/habitat.ts` | `assessHabitat()`, **the single pure function** that turns inputs into everything shown. |
| `lib/metrics.ts` | Distance maths, tolerances, partial pressure, nearest runs. |
| `lib/flammability-grid.ts` | Builds the 12×12 coverage grid. |
| `lib/fire-twin.ts` | Deterministic fire timeline (`itemRisks`, `planFire`). |
| `lib/ranking.ts` | Transparent weighted relevance scoring. |
| `lib/ai/operations.ts` | `interpretHabitat`, `narrateFireTwin` (structured AI calls). |
| `lib/ai/schemas.ts` | Zod schemas for AI output, including citation validation. |
| `app/api/habitat-interpret/route.ts` | POST endpoint for the SI explanation. |
| `app/api/fire-twin/route.ts` | POST endpoint for the Fire Twin narration. |
| `scripts/prewarm-cache.ts` | Pre-generates AI outputs for presets so the demo works offline. |

---

## State and URL sync

`HabitatInputs`:

```ts
type HabitatInputs = {
  o2Percent: number;      // 15–100 (slider step 0.5)
  pressurePsi: number;    // 3–15   (slider step 0.1)
  materialClass: MaterialClass; // fabric | plastic | foam | wire-insulation | liquid-fuel | gas-leak
  airflow: Airflow;       // quiescent | low (5 cm/s) | ventilated (20 cm/s)
  gravity: HabitatGravity;// micro | lunar | mars | earth
};
```

- **Initial state** is read from the URL (`initialState()`): `?preset=lunar-base` or `?o2=34&p=8.2&m=fabric&a=ventilated&g=lunar`. Values are clamped and validated with Zod schemas. The default preset is `iss-cabin`.
- **URL write-back** is debounced by 300 ms and uses `window.history.replaceState`, so moving a slider doesn't trigger a Next.js navigation.
- **Preset matching:** `matchingScenario()` checks whether the current inputs equal a preset's O₂, pressure and gravity. If not, `presetId` becomes `"custom"`.
- **Hash scroll:** a `useEffect` honours `#fire-twin` and similar anchors after client render.

---

## Core engine: `assessHabitat()` (`lib/habitat.ts`)

A pure function. The **UI, the AI route and the prewarm script all call it**, so the AI always sees exactly what the user sees.

```ts
assessHabitat(inputs, { investigations, runs }, weights) → {
  category,        // fuel category from MATERIAL_CATEGORY[materialClass]
  flowCmS,         // AIRFLOW_CM_S[airflow]
  pO2,             // oxygen partial pressure (psi, kPa)
  o2IncreasePct,   // relative change vs 21% Earth air
  verdicts,        // per fuel category: tested | near | untested | no-runs
  coverage,        // investigation-level envelope check
  neverTested,     // string[] of checkable gap statements
  ranked,          // rankInvestigations(...)
  partialGravity,  // gravity is lunar or mars
}
```

### Formulas (`lib/metrics.ts`)

**Oxygen partial pressure:**
```
pO2 = (o2Percent / 100) × pressurePsi        (also converted to kPa)
```

**Run distance** (normalised Euclidean, where 10 points of O₂ count the same as 3 psi):
```
distance = √( ((runO2 − o2) / 10)² + ((runPsi − psi) / 3)² )
```

**Constants:**

| Constant | Value | Meaning |
|---|---|---|
| `RUN_SCALE` | `{ o2: 10, psi: 3 }` | Axis scaling for distance |
| `TESTED_TOLERANCE` | `{ o2: 2, psi: 1 }` | "Tested" box: ±2% O₂ and ±1 psi |
| `NEAR_DISTANCE` | `0.6` | "Near" threshold in run-distance units |

**Placing runs:** a run can be placed on the O₂–pressure plane only if it has O₂ and a pressure. The pressure is either measured, taken from a paper, or, when the source doesn't record it, the **cited ISS nominal of 14.7 psi**. In that last case the run is flagged `assumedPressure` and shown with an asterisk.

### Verdict logic (`categoryVerdict`)

For each fuel category (solid, liquid, gas):

1. No placeable runs → **`no-runs`**
2. At least one run inside the ±2% / ±1 psi box → **`tested`** (also reports how many runs had measured pressure and how many had assumed pressure)
3. Nearest run distance ≤ 0.6 → **`near`**
4. Otherwise → **`untested`**

It also returns the 5 nearest runs (used in the "Nearest real experiments" table).

### Never-tested statements (`neverTestedStatements`)

For each fuel category, it compares the cabin point with the placed runs:
- O₂ above the highest tested O₂ → statement
- pressure below the lowest tested pressure → statement
- no run with O₂ ≥ (o2 − 2) **and** pressure ≤ (psi + 1) while the point is still inside the overall range → "No run combines this much O2 with this low a pressure."
- gravity is not `micro` → "Every run in this dataset was in microgravity…"

Every statement can be checked directly against the data.

---

## Coverage map (`lib/flammability-grid.ts`)

- **Window:** O₂ 15–51% in steps of 3 (12 columns), pressure 3–15 psi in steps of 1 (12 rows), so **144 squares**.
- **Scope:** the runs for the chosen material. Solids match on exact material class; liquids and gases match on category. An "all-solids" scope also exists.
- **Per square:**
  - `runs` = placed runs inside the square's bounds
  - `status`:
    - `tested` if any runs are inside
    - `near` if the nearest run to the square's centre is within 0.6
    - `untested` otherwise
  - `tone` (tested squares only), from outcome counts:
    - `burned`: every stated outcome is `burned`
    - `extinguished`: every stated outcome is `extinguished`, `blowoff` or `no-ignition`
    - `mixed`: anything else that has stated outcomes
    - `unstated`: only `unknown` outcomes
- **Gap shading:** untested squares are shaded by `gapShade(distance)`, which runs linearly from 0 at distance 0.6 to 1 at distance 2.5. This shows how big the gap is, **not risk**.
- `offChartRunCount` counts runs that exist but lie outside the drawn window.
- `coverageSummary()` produces the headline sentence ("X of 144 squares have a real run…").
- Clicking a square calls `onMove(o2, psi)`, which snaps to the slider steps and updates the global inputs.

---

## Ranking (`lib/ranking.ts`)

Each investigation gets four component scores, each between 0 and 1. The total is the **weight-normalised sum**:

```
score = Σ (weight_k × value_k) / Σ weight_k
```

| Component | How it's scored |
|---|---|
| **rangeOverlap** | 1 if the investigation's tested O₂/pressure box contains the point. Otherwise `exp(−d / 0.15)`, where `d` is the normalised distance to the box. 0 if there is no run-level envelope. |
| **categoryMatch** | 1 if same category and a matching material was tested; 0.75 if same category only; 0.1 if a different category. |
| **flowMatch** | 1 if the tested flow range includes the cabin flow. Otherwise `exp(−gap / 10)`. 0.5 if airflow is not recorded. Quiescent cabins match runs with flow ≤ 2 cm/s. |
| **evidenceLevel** | Base value by data level: runs 0.6, planned-matrix or day-summary 0.4, log-summary or schedule 0.2, metadata-only 0. Run-level data gets an extra `+0.4 × min(1, runCount / 100)`. |

Every component also returns a plain-text `detail` string, so the UI can show exactly why a record ranks where it does. Ties are broken by investigation ID, so the ordering is deterministic.

---

## Fire Twin (`lib/fire-twin.ts`)

A **deterministic** simulation: no randomness, no physics solver.

### Room

300 × 180 cm, top-down. Five items (`ROOM_ITEMS`), a supply vent on the left, a return vent with the detector on the right, and a crew position.

### Step 1: Which items can ignite (`itemRisks`), the data-backed part

For each item:
1. Take the evidence runs for its material, **dropping runs with an `unknown` outcome**.
2. Take the 6 nearest runs, keeping only those within `NEAR_DISTANCE` (0.6).
3. If none are left, the item is `tested: false` (**untested**, no guess).
4. Otherwise, `ignites = (number of burned runs > 0)`. The item also keeps the counts, investigation IDs, run IDs and sample lengths for the "How sure are we?" panel.

### Step 2: Timeline (`planFire`), the illustrative part

- If the start item is untested, the timeline is a single `untested-start` event. If it doesn't ignite, a single `no-ignition` event.
- **Detection:** smoke travels to the detector at the vent flow speed, or 1.2 cm/s in still air, then a 5 s detector delay → alarm 4 s later.
- **Suppression schedule:**
  - with vents on, the vents shut down 15 s after the alarm
  - the extinguisher arrives 45 s after the alarm, if crew response is on
- **Microgravity self-extinguish:** if gravity is `micro`, all flames go out 25 s after forced flow stops:
  - vents off → flow was never on, so 25 s after the start
  - vents on with crew → 25 s after vent shutdown
  - vents on without crew → flow never stops, so no self-extinguish

  Moon and Mars **do not self-extinguish**.
- **Spread:** a shortest-path search on ignition time (Dijkstra-style).
  - Base spread speed is **0.5 mm/s** (illustrative).
  - Fire can only jump to items within a **30 cm gap**.
  - With vents on, spread toward items downstream of the airflow is boosted by up to +50%.
  - A neighbour only ignites if its `itemRisks` says `ignites: true`. Reaching an untested item produces an `untested-contact` event.
- **Horizon:** 900 s.
- Every `FireEvent` carries an `illustrative` flag, so the UI can label timing-based events.

All illustrative constants are in one object: `ILLUSTRATIVE` in `lib/fire-twin.ts`.

---

## AI layer ("SI")

### Habitat interpretation: `POST /api/habitat-interpret`

1. **Validation:** the request body is checked with Zod (O₂ and pressure ranges, enums, optional weights in 0–1).
2. **Normalisation:** `normalizeHabitatInputs()` rounds O₂ to the nearest 0.5 and pressure to 0.1, so nearby slider positions **share a cache entry**.
3. **Server-side recompute:** `interpretHabitat()` calls `assessHabitat()` again on the server. **The client never sends numbers to the AI**; the AI only sees values derived from the dataset.
4. **Context:** the assessment plus the **top 6 ranked investigations** with their runs.
5. **Structured output:** `habitatInterpretationSchema(allowedIds)` requires:
   - `plainSummary`, `summary`
   - `riskDrivers[]`
   - `relevantEvidence[]`, where `investigationId` **must be in the allowed set**
   - `knowledgeGaps[]`
   - `recommendedTests[]`
   - `designImplications { prevention, detection, suppression }`
6. **Citation guard:** any `[id]` citation in the text that isn't one of the provided investigations fails validation, so the AI cannot invent sources.
7. **Caching:** results are cached on disk under `data/cache/` (keyed by a hash). `USE_CACHE_ONLY=true` serves only cached results. `npm run prewarm` pre-generates an interpretation for every preset.
8. `maxDuration = 60` on the route, to allow for slow model calls.

### Fire Twin narration: `POST /api/fire-twin`

The body is the inputs plus `startItemId`, `ventsOn` and `crewResponse`. `narrateFireTwin()` returns `{ narration, takeaway, testNext }`, each passed through the same citation guard.

### Ask about this cabin: `POST /api/ask`

Sends the user's question with a one-line cabin context (`cabinContextLine(inputs)`). The UI supports stop, clear and starter questions.

---

## Data

- **Location:** `data/runs.json`, `data/investigations.json`, `data/scenarios.json`, plus raw source tables in `data/real/`.
- **Size:** 772 run-level tests:
  - 764 from NASA PSI tables (BASS, BASS-II, FLEX, CFI, Saffire I–III)
  - 8 hand-transcribed from papers (Saffire IV–VI)
- Each run keeps its source file and row reference, the pressure basis (measured, paper or not-recorded) and the outcome basis.
- **Presets** (`data/scenarios.json`):

| ID | O₂ % | psi | Gravity | Airflow |
|---|---|---|---|---|
| `earth-sea-level` | 21 | 14.7 | earth | quiescent |
| `iss-cabin` | 21 | 14.7 | micro | ventilated |
| `lunar-base` | 34 | 8.2 | lunar | ventilated |
| `mars-transit` | 26.5 | 10.2 | micro | ventilated |
| `spacesuit` | 100 | 4.3 | micro | ventilated |

---

## Design principles

1. **No predictions.** Everything shown is a real recorded outcome, a distance to real data, or an explicitly labelled illustrative value.
2. **One source of truth.** `assessHabitat()` is pure and shared by the UI, the API and the prewarm script.
3. **Show the gaps.** "Untested" is a first-class result, not an error.
4. **Transparent scoring.** Every ranking component and weight is visible and adjustable.
5. **Grounded AI.** The AI is given server-recomputed data only, uses a strict output schema, and may only cite the provided investigations.
6. **Shareable.** The full cabin state lives in the URL.

## Limitations

- Every run is in **microgravity**. Moon and Mars results are extrapolations the page flags rather than hides.
- There are no foam or wire-insulation runs in the dataset, so those items show as untested.
- Fire Twin spread speed, smoke travel and crew timing are **illustrative**, not measured.
- Some runs have no recorded pressure. They are placed at the ISS nominal 14.7 psi and marked.
- **Not for flight certification.** This tool doesn't replace NASA-STD-6001.
