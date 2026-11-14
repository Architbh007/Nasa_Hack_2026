# Proposal: Future Experiment Planner

**Status:** proposed · **Page:** `/planner` · **Project:** FireSight (NASA Space Apps 2026, *Flame in Freefall*)

## In one paragraph

We build a **Future Experiment Planner**. You choose an upcoming mission atmosphere, such as the lunar base (34% O2, 8.2 psi), Mars transit or a pressurized rover, and how many tests you can afford, for example five. FireSight then uses the 772 real NASA fire runs to work out exactly which oxygen and pressure each new test should use, so those few tests close as much of the untested gap as possible. Each test stays one safe step away from existing evidence, so the campaign walks from proven air toward the mission atmosphere. For every proposed test, the planner shows the real runs it builds on, whether it would pin down the line between "burned" and "went out", and which flown NASA hardware has already worked at that pressure, so the test is realistic. A map and a before-and-after view show each mission going from "Not tested" to "Tested", and one click has the AI write a cited experiment proposal. This gives us the closing line for the demo: *"Here are the experiments NASA should fly next to make a lunar base fire-safe."*

## The problem

The Habitat Flammability grid shows **where the gaps are**: in the data we examined, no solid-material run reaches the 34% O2, 8.2 psi lunar exploration atmosphere. It does not say **what to do about it**. Engineers planning the next flight experiment need to know which conditions to test, in what order, and with what hardware. FireSight currently stops one step short of that.

## What the user does

1. **Pick target missions:** lunar base, pressurized rover, Mars transit, or a custom habitat atmosphere.
2. **Pick the material:** all solids, fabric, plastic or liquid fuel.
3. **Set a test budget:** 1 to 8 tests.
4. **Choose a campaign style:**
   - *Stepping stones* (default): each test stays near existing or already-planned evidence.
   - *Direct*: tests can go straight to the target.

## What the planner returns

**A test campaign:** numbered tests, each with oxygen %, pressure (psi and kPa) and oxygen partial pressure.

**For each test:**
- **Why it's here:** which missions it serves, and how much closer each one gets to tested air.
- **Builds on:** the nearest real runs, with their ids, recorded outcomes and sources, or the earlier test in the campaign it extends.
- **Boundary flag:** set when the nearby runs include both "burned" and "went out". A test here would locate a flammability limit.
- **Hardware precedent:** flown investigations that have operated at this pressure with any fuel, for example CFI at 7.35 psi. This shows the test is feasible.
- **Gravity note:** lunar and Mars targets need a partial-gravity platform, because every run in the data is microgravity.

**Before and after:**
- For each mission: verdict now → verdict after the plan, for example "Lunar base: Not tested → Tested (after Test 3)".
- The share of the grid that is tested or near tested, before and after.

**A map:** old runs coloured by outcome, gap shading, mission targets as rings, and the numbered test path with arrows showing what each test builds on. A toggle switches between before and after the plan.

**AI proposal (OpenAI):** an experiment write-up built from the plan, with:
- title and objective
- the purpose of each test and what to measure
- open questions and limitations

It cites only real investigation and run ids. There is also a **Copy as Markdown** button.

## How it works (no predictions)

Everything is calculated from the existing data; the AI only writes the explanation.

- **Distance:** the same measure the Habitat grid uses, where 10 points of O2 count the same as 3 psi.
- **Thresholds:** the same "tested" and "near" thresholds as the Habitat grid (±2% O2 and ±1 psi, and a distance of 0.6).
- **Candidates:**
  - points every 1% O2 across 15–51%
  - points every 0.5 psi across 3–15 psi
  - the exact target atmospheres
- **Greedy selection**, repeated for each test in the budget:
  1. Pick the candidate that most reduces the distance from each mission target to its nearest evidence.
  2. Use overall grid coverage as a smaller tie-breaker.
  3. Treat the chosen test as new evidence before picking the next one.
- **Stepping-stones mode** only allows candidates within 0.6 of existing or planned evidence, which produces a step-by-step path.
- **The server recomputes the plan** before calling the AI, so the AI only ever sees numbers derived from the dataset.

The plan says where new data would be most useful. It does not predict whether anything will ignite or how fast a flame will spread, and it does not replace NASA-STD-6001.

## Build plan

| Piece | File |
| --- | --- |
| Planning logic (pure and tested) | `lib/planner.ts` |
| Unit tests | `tests/planner.test.ts` |
| Page and UI (controls, map, test cards, before/after) | `app/planner/page.tsx`, `components/planner/*` |
| AI proposal route | `app/api/experiment-plan/route.ts`, plus a prompt and zod schema in `lib/ai/` |
| Navigation | sidebar item "Experiment Planner", and a final step in the home page demo path |

It reuses `runDistance`, `placeRuns`, `scopeRuns`, the existing AI layer and the existing UI components.

## Demo script addition (about 40 seconds)

1. Open `/planner`. Select the **Lunar base** and **Mars transit** targets, all solids, 5 tests, stepping stones.
2. Show the numbered path walking from the Saffire-VI runs toward 34% O2 at 8.2 psi.
3. Open one test card and point out the runs it builds on and its hardware precedent.
4. Show the before and after: "Lunar base: Not tested → Tested."
5. Click **Write proposal** and read the objective aloud.
6. Close: "These are the experiments NASA should fly next."

## Limitations

- The plan covers oxygen and pressure only. Airflow, sample geometry and gravity are flagged but not optimised.
- Runs without a recorded pressure are placed at the 14.7 psi ISS nominal, as they are everywhere else in the app.
- Hardware precedent shows that something ran at that pressure. It doesn't show the hardware can reach the target oxygen level.
- The AI proposal can be wrong. Check the cited ids.
