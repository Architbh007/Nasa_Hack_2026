# FireSight: page guide and debrief

FireSight is a web app over real NASA microgravity combustion data: 20 investigations and 772 run-level tests
(764 from NASA Physical Science Informatics tables, 8 hand-transcribed from the published Saffire IV–VI papers).
It answers one question for cabin designers and crews: **for a proposed Moon or Mars cabin atmosphere, what have
real fire tests actually covered, and what has never been tested?**

Ground rules that apply to every page:
- Only real data. Missing values stay missing. Nothing is generated, filled in or predicted.
- Every number links back to its source file and place in it (sheet and row, or paper, table and page).
- The SI (AI) layer only explains the records it is given, cites them by id, and is cached for offline demos.
- It supports engineering judgment. It does not replace NASA-STD-6001 or certified materials testing.

---

## 1. Home (`/`)

**What it does.** Introduces the problem (fire behaves differently without gravity), states three headline findings,
and gives a five-step demo tour.

**How.** The findings are computed from the dataset when the page is built, not typed in:
- Lunar exploration atmosphere (34% O2, 8.2 psi): solid-fuel runs within ±2% O2 and ±1 psi.
- "Fans off": coded crew actions where airflow was stopped, and how many flames went out.
- "Nitrogen jet": coded nitrogen-jet actions, fully out vs partly out.
- A quoted investigator note (BASS run `bass-asrun-45`) on how 1 g ground tests differ from orbit.

**Outcome.** 0 solid-fuel runs at the lunar atmosphere (nearest: Saffire-VI-2 at 31% O2, 7.85 psi). 22 of 22 flames
went out when airflow was stopped. 2 of 16 were fully put out by a nitrogen jet, 8 more partly.

**Value for the stakeholder.** In 30 seconds a scientist or astronaut sees the core gap: exploration atmospheres are
not covered by the solid-material tests we hold.

**Enhance.**
- Add a "last data update" stamp and a one-line statement of the data cut-off.
- Let the headline atmosphere be chosen (lunar, Mars transit, spacesuit) instead of fixed to lunar.

---

## 2. Habitat Flammability Explorer (`/habitat`) – the main tool

**What it does.** You set a cabin atmosphere (O2 %, total pressure, material, airflow, gravity) or pick a preset
(Earth sea level, ISS cabin, Lunar exploration 34%/8.2 psi, Staged decompression 26.5%/10.2 psi, Spacesuit 100%/4.3 psi).
The page tells you how well real tests cover that air and shows the evidence.

**How.**
- **Readouts:** O2 partial pressure (psi and kPa) and O2 increase vs Earth's 21%.
- **Coverage verdict per fuel category** (solid, liquid, gas):
  - *Has test data*: a same-category real run within ±2% O2 and ±1 psi.
  - *Test data nearby*: the nearest run is within run distance 0.6, where distance = √((ΔO2/10)² + (Δpsi/3)²),
    so 10 points of O2 count the same as 3 psi.
  - *No test data nearby*: runs exist in the category, none close.
  - *No run data*: the category has no runs recording both O2 and pressure (true for gaseous fuels).
- **Flammability grid:** a 12 × 12 map, 15–51% O2 by 3–15 psi. Each square is coloured by what real runs inside it
  recorded (burned, went out, mixed, not stated), or striped if untested. Darker stripes mean further from any run,
  i.e. a bigger gap, not a higher risk. Click a square to move the cabin there.
- **Nearest real experiments:** the five closest runs of your material, with their recorded outcome and source.
- **Never tested in this data:** plain statements checkable against the dataset.
- **SI explanation:** a structured interpretation (atmosphere factors, knowledge gaps, evidence, recommended tests,
  prevention/detection/suppression notes) that may only cite the ranked records sent to it. Plus a cabin Q&A box.
- **Fire Twin:** a top-down cabin module. Whether each item ignites comes from what the nearest real runs of its
  material recorded. Spread speed, smoke travel, detection and crew response times are illustrative and labelled so.
- **Most relevant investigations:** a transparent ranking with adjustable weights.
- **Partial-gravity callout:** for lunar or Mars gravity it states that every run in the data was in microgravity.

**Outcome.** Cabin air at ISS conditions is well covered (129 real runs in the ISS cabin square). Exploration
atmospheres are not covered for solids. Liquids (FLEX, CFI) reach some higher-O2, lower-pressure points. Gaseous fuels
have no run-level data with both O2 and pressure.

**Value for the stakeholder.** A habitat scientist can see the evidence boundary for a design atmosphere in seconds and
open the exact runs behind it. An astronaut can see what a fire in a module would look like and which items have real
test backing. Nothing claims a probability, so it can be trusted in a review.

**Enhance.**
- Add NASA-STD-6001 Test 1 (upward flame propagation) results as a separate evidence layer, clearly labelled as ground tests.
- Add a "what test would close this gap" export: the atmosphere, material and airflow of the most valuable next run.
- Show Maximum Oxygen Concentration (MOC) or limiting O2 values where papers publish them.
- Compare two cabin atmospheres side by side (for example ISS vs Lunar).
- Let users save and share a named cabin configuration (the URL already encodes it).

---

## 3. Crew Response Evidence (`/response`)

**What it does.** Collects every time a crew turned the airflow down or off, turned it up, or used a nitrogen jet on
a real flame in orbit, and shows what the investigator's notes say happened next.

**How.**
- The team hand-coded 75 actions in 57 BASS runs from the "as run matrix" notes (BASS test matrix.xlsx, PSI-26).
  Each coded event keeps the exact words it came from.
- Tally per action: went out, partly out, kept burning.
- **Flow map:** 171 solid-fuel runs that record both O2 and airflow speed, plotted O2 vs airflow, coloured by outcome.
- **"Extinguished" breakdown:** splits extinguished runs by the crew action the note ties it to, or "not coded"
  (fuel ran out, no stated action, unclear note).
- **Consequences:** Saffire IV–VI burns (large samples in an uncrewed Cygnus, airflow left on), with published burn
  duration and related values from the Saffire VI paper, Table 2.

**Outcome.**
- Airflow stopped: 22 of 22 flames went out.
- Airflow turned down: 19 of 33 went out.
- Nitrogen jet: 2 of 16 fully out, 8 partly out.
- Airflow turned up: 0 of 4 went out.
- All of this evidence is from small BASS samples near ISS cabin air (about 21% O2, 14.7 psi). None exists at exploration atmospheres.

**Value for the stakeholder.** It supports the existing first step of the ISS fire response (stop ventilation) with
real orbital evidence, and shows clearly where that evidence stops. An astronaut sees why "fans off" matters. A
scientist sees how small the evidence base is, and how to audit every count against the source notes.

**Enhance.**
- Code the FLEX and Saffire notes the same way to widen the evidence beyond BASS.
- Add second-coder agreement (inter-rater check) on the coding to strengthen trust.
- Link each action to the cabin atmosphere on the Habitat page ("this response was tested here, not at your air").
- Add the time from action to extinguishment where notes or video give it.

---

## 3b. Experiment Planner (`/planner`) – what NASA should test next

**What it does.** You choose mission atmospheres (Lunar exploration, Staged-decompression/Mars transit, Spacesuit, or a
custom air), a material, a test budget (1–8) and a campaign style. It returns the exact O2 % and pressure for each new
test, so a small number of flights closes as much untested ground as possible.

**How.** Greedy selection over candidate points (every 1% O2 across 15–51% and every 0.5 psi across 3–15 psi, plus
each exact target), using the same distance and thresholds as the Habitat page. Each round picks the point that most
reduces the distance from still-uncovered targets to their nearest evidence, with grid coverage as a small tie-breaker,
then treats that test as new evidence. "Stepping stones" mode keeps every test within distance 0.6 of real runs or an
earlier test. Each test lists the runs it builds on, a "flammability limit nearby" flag when nearby runs both burned
and went out, flown investigations that recorded a similar pressure, and a partial-gravity flag. The SI writes a cited
proposal from the plan, recomputed on the server; Copy as Markdown exports the plan with sources.

**Outcome.** For all solids with Lunar + Mars-transit targets and 5 stepping-stone tests: Test 1 is the lunar
atmosphere itself (34% O2, 8.2 psi), one safe step from Saffire-VI-2, turning Lunar from Near tested to Tested. Mars
transit is already covered by Saffire-V runs. The five tests take map coverage (tested or near) from 35 to 71 of 144
squares.

**Value for the stakeholder.** It turns the gap map into a decision: a short, ranked, sourced list of flight tests a
scientist can take into a planning meeting.

**Enhance.**
- Optimise airflow and sample size as well as O2 and pressure.
- Add ground-test (NASA-STD-6001) points as cheaper stepping stones before flight.
- Weight targets by mission priority and show cost per test.

---

## 4. Investigation Explorer (`/explore`)

**What it does.** A searchable table of the 20 investigations, a detail sheet per investigation, a compare mode, and a
"Then vs Now" history tab.

**How.**
- Search (fuzzy) and filters: fuel category, data held, hardware, safety pillar, O2 range of real runs.
- Detail sheet: the PSI record text verbatim (objectives, approach, hypothesis, hardware, Earth benefits,
  publications), every real run with its source reference and caveats, known data issues, citation with DOI and licence,
  and an SI summary.
- **Compare mode (2–4 investigations):** overlays their real runs on one O2–pressure chart and adds an SI comparison
  (one paragraph plus similarities and differences), grounded in those records only.
- **Then vs Now:** six documented events (Apollo 1, Mir, FLEX, BASS, Saffire, the move to oxygen-richer Moon/Mars
  cabin air), each with NASA sources and an SI "lesson".

**Outcome.** A single place to check where any number comes from and which investigations hold run-level data
(BASS, BASS-II, FLEX, CFI, Saffire I–VI) versus descriptions or summaries only.

**Value for the stakeholder.** A scientist can audit the dataset quickly and compare test campaigns without opening
spreadsheets. The history tab gives context for non-specialist reviewers.

**Enhance.**
- Add quick-filter chips on the header (fuel category, "has run data") with live counts.
- Export the filtered runs as CSV with source references.
- Add the remaining five PSI ground investigations and flag them as ground tests.
- Show data completeness per investigation (share of runs with O2, pressure, flow, outcome).

---

## 5. Ask the Data (`/ask`)

**What it does.** Streaming question answering over the investigation records, with citations.

**How.** Each question retrieves the six most relevant records (fuzzy match plus keyword overlap, with boosts for fuel
category, low pressure or high O2, and safety pillar). The SI answers only from those records and their run statistics,
cites them by investigation and run id, and says plainly when the data does not cover the question.

**Outcome.** Fast answers to questions like "which runs burned solid materials below 10 psi?", each traceable to the cited records.

**Value for the stakeholder.** Lets a busy scientist or astronaut query the data in plain language without learning the UI.

**Enhance.**
- Show the six retrieved records next to the answer, with their retrieval scores.
- Allow follow-up questions that keep the same records in scope.
- Add a "this answer used only N runs" confidence line.

---

## 6. Earth Applications (`/earth`)

**What it does.** Shows what each PSI record says its research means on Earth.

**How.** Quotes the "Research Impacts/Earth Benefits" field of 19 records verbatim, grouped by keyword into smoke and
fire detection, fire safety and material flammability, and cleaner combustion. The grouping is ours; the words are NASA's.

**Outcome.** A clear, sourced link from microgravity combustion research to smoke detectors, suppression and
firefighter safety on Earth.

**Value for the stakeholder.** Useful for outreach and for justifying the research. Less important for design decisions.

**Enhance.**
- Link to confirmed NASA Spinoff entries where they exist, kept separate from the investigators' expected benefits.

---

## Comparisons: what was compared, why, outcome, usefulness

| Comparison | Compared with | Why | Outcome | Usefulness to a NASA scientist or astronaut |
| --- | --- | --- | --- | --- |
| **Cabin atmosphere vs real runs** (coverage verdict) | A chosen O2 % and pressure vs every real run of the same fuel category | To know whether a design atmosphere is inside tested conditions | ISS air: tested. Lunar 34%/8.2 psi: no solid run within ±2%/±1 psi; nearest is Saffire-VI-2 at 31%, 7.85 psi | **High.** Directly shows where the evidence boundary is for a design atmosphere, with no extrapolation |
| **Flammability grid** | Each 3% O2 × 1 psi square vs the runs inside or near it | To see the whole design space at once, not one point | PSI solid-material runs sit at about 14–23% O2 and 14.7 psi; only Saffire V–VI reach 25–31% O2 at 7.9–10.3 psi. Large untested areas at higher O2 and lower pressure | **High.** A clear picture of where tests are missing, to plan new ones |
| **Nearest real runs** | The cabin point vs individual runs, by run distance (10% O2 ≈ 3 psi) | To give concrete neighbours to read, not a model | Five closest runs with outcome and source | **High** for scientists (auditable). The weighting 10% O2 ≈ 3 psi is a team choice and should be reviewed |
| **Exploration presets vs ISS** | Lunar, Mars transit (staged decompression), spacesuit vs ISS cabin | Exploration habitats plan oxygen-richer, lower-pressure air | Coverage drops sharply away from ISS air for solids | **High.** Matches current exploration atmosphere trade studies |
| **Crew actions vs flame outcome** | Airflow stopped / reduced / increased / nitrogen jet vs went out / partly out / kept burning | To test the evidence behind "stop the ventilation first" | Stopped: 22/22 out. Reduced: 19/33. Nitrogen: 2/16 fully, 8 partly. Increased: 0/4 | **Medium–high.** Real orbital evidence for procedure, but small samples, BASS only, near cabin air |
| **Airflow vs O2 across solid runs** (flow map) | 171 solid runs by O2 and airflow speed, coloured by outcome | Airflow is what the solid-fuel tests mostly varied | Of 171 runs: 11 burned, 50 extinguished or blew off, 5 did not ignite, 105 outcome not stated. Most runs sit at 15–23% O2; the burned ones plotted are the Saffire samples at about 26–31% O2 | **Medium.** Shows which airflows were tested, but most outcomes are not stated in the source |
| **"Extinguished" breakdown** | Extinguished runs vs the crew action tied to them | "Extinguished" mixes different endings | Separates crew-action extinctions from fuel running out or unclear notes | **Medium.** Prevents over-reading outcome counts |
| **Small samples vs large fires** (consequences) | BASS small samples vs Saffire IV–VI large samples | Small strips may not show how large fires behave | Saffire shows burn durations for large samples with airflow on | **Medium–high.** Reminds reviewers that sample scale matters |
| **Candidate tests vs mission targets** (Experiment Planner) | Every candidate O2/pressure point vs the distance from each target to its nearest evidence | To choose where a limited number of new tests helps most | All solids, 5 tests: Lunar goes Near tested → Tested after test 1; map coverage 35 → 71 of 144 squares | **High.** A ranked, sourced test list for flight planning; it recommends where to test, never what will happen |
| **Investigation ranking** | Each investigation vs the cabin condition: range overlap 0.35, category match 0.35, flow match 0.15, evidence level 0.15 | To find which campaigns matter most for this cabin | Ranked list with every component visible and weights adjustable | **Medium.** Transparent and adjustable, but the weights are a team judgment |
| **Investigation vs investigation** (compare mode) | 2–4 investigations: runs overlaid on one chart plus an SI comparison | To see how campaigns differ in conditions and results | Shared and different conditions, materials and outcomes | **Medium.** Good for review meetings; the SI text must be checked against the cited runs |
| **Fire Twin: same fire, other habitat** | One cabin fire scenario under different presets | To show how ignition evidence changes with atmosphere | Shows which cabin items keep real-run backing as the atmosphere changes | **Medium** for astronauts (intuitive). Timings are illustrative, so **low** for engineering use |
| **Then vs Now** | Historic spacecraft fires vs the experiments that followed | Context for why the tests exist | Lessons tied to NASA sources | **Low–medium.** Context and outreach, not design data |
| **Investigation similarity** (used by retrieval and compare) | Weighted Jaccard over PSI-listed relations, hardware, project, materials, category | To group related campaigns | Related records surface together | **Low.** Supporting function; the network page was removed |

### Overall assessment for the stakeholder

- **Strongest value:** an honest, auditable map of what real orbital fire tests cover. For a NASA scientist, the
  coverage verdict, grid and nearest-runs evidence can be checked line by line. For an astronaut, the crew response
  page grounds the "stop the airflow" step in real flames.
- **Main limits to state up front:** all runs are in microgravity (no lunar or Mars gravity data); solid-material
  evidence sits near ISS air; crew-response evidence is small and BASS-only; Fire Twin timings are illustrative; the
  distance weighting and ranking weights are team choices.
- **Most valuable next steps:**
  1. Add NASA-STD-6001 ground test data as a separate, clearly labelled layer.
  2. Code FLEX and Saffire notes to widen the crew-response evidence.
  3. Extend the Experiment Planner to airflow and sample size, and add ground-test stepping stones.
  4. Have a NASA combustion scientist review the 10% O2 ≈ 3 psi distance weighting and the tolerance bands.
