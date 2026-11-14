Prompting

# FireSight build plan (in order)

Final app after this plan:
- /habitat  -> redesigned: square KNN grid + Fire Twin animation + SI panel with sources
- /explore  -> kept, plus new "Then vs Now" tab
- /earth    -> kept
- /about    -> kept (update model/method notes for the new grid)
- /graph, /scenarios, /ask -> removed

Pitch story: Then vs Now (why fire matters) -> square grid (is this air dangerous? do we have evidence?) -> Fire Twin (what would a fire look like?) -> Earth (how it helps at home)

---

## Step 0 - Decisions (DONE)
- [x] Grid colour source: the existing trained ignition model (probability per cell); hover still lists the nearest test runs as evidence
- [x] Grid size / untested rule: O2 15-100 %, pressure 3-15 psi; a cell is "untested" when no same-phase test runs are nearby
- [x] Colours: blue (fire unlikely) -> amber (in between) -> red (fire likely), grey striped = untested (colour-blind safe)
- [x] Fire Twin timings: full story (ignition -> smoke detected -> alarm -> suppression); ignition/spread from our models, detection/alarm/suppression clearly tagged "illustrative"
- [x] Source links: add a real, checked NASA page per investigation (19) to the data
- [x] Keep a small "ask about this cabin" box on /habitat (replaces the /ask page)
- [x] Materials: only fabric and plastic have ignition tests (foam / wire only appear in smoke-detection studies). Retrain the ignition model with a fabric vs plastic feature; foam and wire show as grey "never ignition-tested" in the grid and as "?" items in Fire Twin

## Step 1 - Cleanup: remove pages
- [x] Remove /graph (Investigation Network), /scenarios (Mission Readiness), /ask (Ask the data)
- [x] Remove their components, nav links (lib/nav.ts), API routes and unused lib code
- [x] Fix any links that pointed to them (e.g. citations, about page)
- [x] Run typecheck, lint and tests; app must still start

## Step 2 - Habitat page: simple square KNN grid (core feature)
- [x] Remove the old complex scatter graph (flammability-map) and the sensitivity line chart if no longer needed
- [x] Square grid: O2 % on one axis, pressure (psi) on the other
- [x] Each cell coloured by the KNN result: flammable / not flammable / untested (no nearby tests)
- [x] Material toggle (fabric / plastic / foam / wire) to compare flammable vs non-flammable materials
- [x] User's cabin = highlighted cell; presets (ISS, lunar base, Mars transit, spacesuit) as labelled markers
- [x] Existing sliders/presets drive the grid
- [x] Hover a cell -> show the K nearest test runs that decided its colour
- [x] Tests for the grid/KNN logic

## Step 3 - Habitat page: SI panel with sources
- [x] Panel next to the grid: plain-words explanation of the selected cabin
- [x] Cites the investigations used, each with a link straight to the original NASA source on the web
- [x] Works from cache when USE_CACHE_ONLY=true / no API key (demo safety)

## Step 4 - Habitat page: Fire Twin animation (demo centerpiece)
- [x] Top-down 2D view of one habitat module with items: fabric bag, foam seat, wire bundle, plastic panel, vents, smoke detector, crew position
- [x] Uses the same atmosphere as the grid (sliders/presets); user clicks an item to start a fire
- [x] Microgravity-style flame: slow, round glowing ball (no upward flame), drifting with vent airflow; smoke spreads as a soft cloud
- [x] Behaviour from existing models: ignition chance = ignition model, spread speed = KNN flame spread, airflow = vent direction/strength
- [x] Fire jumps to nearby items only if they would ignite at this atmosphere; non-flammable items stay safe
- [x] Timeline bar: ignition -> smoke detected -> alarm -> suppression (vent shutdown / extinguisher), with timings
- [x] Controls: play / pause / restart, speed, vents on/off, switch habitat to compare (e.g. ISS 21% vs lunar 34% O2)
- [x] SI narrator: explains each step in plain words, cites investigations (e.g. FLEX, BASS, SPICE) with source links
- [x] End card: confidence (tested / extrapolated / untested) + "what NASA should test next"
- [x] Keep it simple: 2D canvas/SVG, no 3D, no physics engine; show the synthetic-data banner

## Step 5 - Explorer: "Then vs Now" tab (pitch opener)
- [x] New tab inside /explore next to the existing table
- [x] Vertical timeline of real events: Apollo 1 (1967, pure-O2 cabin fire on the pad), Mir (1997, oxygen-generator fire), milestone experiments (Saffire on Cygnus, BASS / FLEX on ISS)
- [x] Each event card: what happened, cabin atmosphere at the time (O2 % + pressure), what went wrong
- [x] "Now" side: what research learned since and what changed (e.g. NASA-STD-6001 material testing, lower-O2 cabins)
- [x] Link each event to related investigations (click -> opens that investigation's detail sheet)
- [x] SI summary per event with cited sources and links to real NASA pages
- [x] Only well-documented historical facts; clearly mark real history vs synthetic demo data

## Step 6 - Polish and demo prep
- [x] Update /about (new grid method, Fire Twin assumptions, removed pages) and README (features, demo script)
- [ ] Prewarm SI cache for presets (npm run prewarm) so the demo works offline -> NEEDS ANTHROPIC_API_KEY in .env.local (script now also covers Fire Twin narrations and history lessons)
- [ ] Check phone width and dark mode in the browser (app is dark-only)
- [x] Run typecheck, lint, tests (69 passing), build
- [ ] Rehearse the pitch flow: Then vs Now -> grid -> Fire Twin -> Earth

---

## Original notes (kept for reference)
- we need to chnahe the habitat page - the graph is to complex to explaoin or even pitch to, we need a simpler graph as we are using KNN for this one we just need to a graph wher ewe can compare it with the flam mable and inflammable piececs etc more likls a square space and a then a SI integration explaning and refrencing to places where we took the info from and then user can go to the web straight after
- get rid of inversitgation network, misson readiness and ask the data
