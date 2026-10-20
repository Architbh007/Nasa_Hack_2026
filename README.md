# Flame in Freefall
**AI-powered fire safety insights from microgravity combustion data**
2026 NASA Space Apps Challenge · Difficulty: Intermediate/Advanced · Subject: Space Exploration

> Status: **planning only. Nothing is built yet.** This document pins down what we are making so the team can agree before writing code.

---

## 1. The challenge, in one paragraph

NASA has run decades of flame and fire experiments in microgravity (drop towers, parabolic flights, the ISS, free-flying spacecraft). The results are scattered across papers, experiment pages and data repositories. They are hard to find, compare and interpret. As crews return to the Moon and head to Mars, that knowledge decides how we design cabins, choose materials and plan fire response.

**The ask:** build an **interactive, AI-powered dashboard** that **summarizes, ranks and interprets** those findings to deliver **fire safety insights for human space exploration**.

The three verbs are the judging rubric. Every feature should serve one of them:

| Verb | What it means for us |
|---|---|
| **Summarize** | Plain-language digests of each experiment and of the whole body of work |
| **Rank** | Transparent, adjustable scoring of materials, conditions and experiments by fire risk and by relevance to mission scenarios |
| **Interpret** | Turn numbers into "so what for a crew on the Moon/Mars/ISS", with cited evidence |

## 2. The core idea (our pitch)

> **"Pick a spacecraft scenario, get the fire risk, and see the evidence behind it."**

Instead of a data browser, we build a **decision-support tool**. A user sets mission conditions (gravity level, oxygen %, pressure, airflow, material) and the dashboard answers three questions:

1. **How dangerous is fire here?** A ranked risk view of materials and conditions.
2. **Why?** The experiments that support the answer, summarized and linked back to source.
3. **What should we do?** Design and operations recommendations (material choice, atmosphere, suppression, detection).

The AI layer is what makes this "super intelligence" rather than a chart page: it reads across all experiments, explains trends, answers questions and flags where the evidence is thin. It is powered by an **open-weight model** (see section 6), so the whole stack can run without a paid proprietary API.

**Second hook: the Live Fire Lab.** Users don't just read about fire in space, they **play with it**. A simulated spacecraft environment streams live telemetry, and the user can **drag objects around** (an ignition source, a material sample, a crew module, a vent) and watch temperature, flame behavior, the heatmap and the risk score update in real time.

## 3. Why microgravity fire is different (the story the dashboard tells)

These are the scientific hooks. **Verify each against NASA sources before it goes in the demo.**

- **No buoyancy.** On Earth, hot gas rises and pulls fresh oxygen in, giving the familiar teardrop flame. In microgravity there is no buoyant flow, so flames are often **spherical and dimmer**, and they depend on slow diffusion and whatever airflow the ventilation system provides.
- **Materials can burn at lower oxygen** and in weak flow than Earth-based flammability tests predict. Standard tests (e.g. NASA-STD-6001 Test 1, which is upward burning in 1g) may not be conservative for space. This is the biggest safety insight.
- **Low-speed airflow can make some fires worse.** There is a "quenching" flow regime at very low speed, so ventilation shutdown is not automatically safe, and flow rate matters.
- **Cool flames and soot behave differently**, which affects detection (smoke detectors tuned on Earth smoke) and toxic products.
- **Lunar and Martian gravity** are partial-gravity regimes with far less data. This is the **evidence gap** we should highlight.
- **Spacecraft atmosphere trade-offs:** lower pressure and higher oxygen (e.g. for EVA prep) change flammability sharply.

## 4. Data plan

### 4.1 Sources (to confirm and collect)

| Source | What it gives | Notes |
|---|---|---|
| NASA **Physical Sciences Informatics (PSI)** repository | Public experiment metadata and data from ISS physical science investigations | Primary real-data target; check export formats and licensing |
| NASA Glenn **Zero Gravity Research Facility / 2.2 s Drop Tower** | Short-duration microgravity combustion results | Mostly papers and reports |
| ISS combustion experiments: **SoFIE, FLEX/FLEX-2, ACME, BASS, Cool Flames, Candle Flame** | Solid fuels, droplets, gaseous flames, suppression | Names to verify; build one record per experiment |
| **Saffire I-VI** (Spacecraft Fire Safety Demonstration) | Large-scale unmanned spacecraft fire tests | Closest to real cabin fires |
| NASA-STD-6001 and related flammability standards | Test method context for "ground vs space" comparison | Reference only |
| NTRS (NASA Technical Reports Server) papers | Abstracts and findings for the summarizer | Check reuse terms |

### 4.2 Phased approach (agreed in this session)

- **Phase A, curated seed dataset.** Hand-build a structured dataset of ~15-30 experiments/results from public NASA material, with a source URL on every record. This is what powers the demo.
- **Phase B, real-data loader.** Write an import script/schema so real PSI/NTRS exports can replace or extend the seed data without changing the UI.

> **Integrity rule:** no invented numbers. Every value shown must trace to a source URL, or be clearly labelled `illustrative` / `estimated`. Judges will check, and it protects our credibility.

### 4.3 Proposed data schema (draft)

```jsonc
{
  "id": "saffire-iv-001",
  "title": "Saffire-IV large-scale fire in Cygnus",
  "program": "Saffire",
  "platform": "Free-flying spacecraft",         // drop tower | parabolic | ISS | spacecraft
  "year": 2019,
  "gravity_g": 0.0,                              // 0, 0.16 (Moon), 0.38 (Mars), 1 (ground baseline)
  "fuel_material": "Cotton-fiberglass fabric (SIBAL)",
  "fuel_state": "solid",                         // solid | liquid | gas | dust
  "oxygen_pct": 21,
  "pressure_kpa": 101.3,
  "flow_speed_cm_s": 20,
  "geometry": "flat sheet",
  "key_metrics": {                               // only fields with a source
    "flame_spread_rate_cm_s": null,
    "extinction_limit_o2_pct": null,
    "peak_temp_c": null
  },
  "finding": "One-sentence takeaway",
  "safety_implication": "Why a crew should care",
  "source_url": "https://...",
  "data_quality": "measured | published-summary | illustrative"
}
```

## 5. Features

### 5.1 MVP (must be demo-ready)

1. **Overview / "state of knowledge" page**: counts by platform, gravity, fuel type; timeline of experiments; **evidence-gap heatmap** (gravity level x oxygen level, showing where we have data and where we don't).
2. **Experiment explorer**: filter/search by gravity, fuel, O2, pressure, flow; each card shows an AI summary plus source link.
3. **Risk ranking engine**: ranked list of materials/conditions by fire risk. Scoring weights are **visible and adjustable** by the user (sliders), with the formula explained. Ranking is rule-based and transparent; the AI explains it but does not invent it.
4. **Scenario simulator ("Mission Scenario")**: choose ISS cabin / lunar habitat / Mars transit / EVA-prep atmosphere. Dashboard returns risk level, supporting experiments and recommendations.
5. **AI analyst (open-weight model)**: chat grounded only in the dataset; answers cite experiment IDs; says "insufficient evidence" when appropriate.
6. **Auto-generated briefing**: one-click "fire safety brief" for the selected scenario (exportable to PDF/Markdown).
7. **Live Fire Lab (simulated telemetry + draggable objects)**: see section 5.4. This is the interactive centerpiece.

### 5.4 Live Fire Lab: details

**What the user sees:** a simulated spacecraft compartment (2D top-down for MVP, 3D as stretch) with a live telemetry panel and a live heatmap overlay.

**What the user can do:**
- **Drag and drop** objects in the space: ignition source (hot wire / overheated electronics), fuel sample (cotton fabric, Nomex, silicone, acrylic, etc.), crew module / equipment rack, ventilation inlet and outlet, smoke detector.
- **Change the environment live:** gravity (0g / lunar 0.16g / Mars 0.38g / 1g baseline), O2 %, pressure, fan speed and airflow direction.
- **Trigger events:** ignite, shut down ventilation, activate suppression (CO2 / water mist), then watch the response.
- **Play, pause, rewind** the run and compare two runs side-by-side.

**What updates in real time:**

| Output | Description |
|---|---|
| Heatmap | Temperature field across the compartment, recomputed as objects move |
| Flame visual | Spherical vs teardrop flame, size and brightness driven by gravity, O2 and flow |
| Telemetry stream | Time-series charts: peak temperature, O2 %, CO / smoke obscuration, flame spread rate, heat flux at the crew module |
| Detector response | Whether and when the smoke detector would trigger, so slow microgravity smoke can be missed |
| Risk score | The same transparent score as the Risk Ranking page, live |
| Linked evidence | Which seed-dataset experiments support what you are seeing, with citations |
| AI commentary | The open-weight model narrates what just happened and suggests mitigations |

**How it works (and the honesty rule):**
- The "telemetry" is **simulated, not real NASA flight data**, and the UI must label it **SIMULATED**.
- Engine: a lightweight, simplified model running in the browser (e.g. a 2D grid with heat diffusion plus buoyancy-free advection and a flame-spread rule). It is **calibrated to trends from the seed dataset** (spread rate vs O2, vs flow, vs gravity), not CFD. Exact formulas and calibration sources go in `docs/sim-model.md`.
- The telemetry panel is fed by a stream interface (a worker or WebSocket-style event feed), so a real data source could be plugged in later.
- Whenever the sim is outside the range our data covers, show an **"extrapolating, low confidence"** badge.

### 5.2 Stretch

- Compare two experiments or conditions side-by-side, including 1g vs 0g.
- 3D version of the Live Fire Lab (three.js / react-three-fiber) with orbit camera.
- Voice or text commands to the Lab through the AI ("move the heater next to the vent").
- Shareable link that saves a Lab setup and run.
- Detection and suppression panel: what works in microgravity.
- "Confidence" badge per insight based on number and quality of supporting experiments.
- Upload your own CSV and have the AI parse it into the schema.
- Light/dark and mission-control themed UI; keyboard accessible.

### 5.3 Explicit non-goals

- Not a validated physics or CFD tool. The Live Fire Lab is an **educational, simplified, data-calibrated model**, not a prediction engine.
- Telemetry is simulated and never presented as real flight data.
- Not a certification tool; it is decision support only, and we say so in the UI.
- No claims beyond what the data supports.

## 6. How the AI layer works (the "SI" part)

**Principle: retrieval first, generation second. The model only talks about data we hand it.**

| AI job | Approach |
|---|---|
| Per-experiment summary | Pre-generate at build time from the record plus abstract; cache; show source |
| Cross-experiment synthesis ("what do we know about low-O2 flame spread?") | Retrieve relevant records by filter/embedding, pass to the open-weight model, require cited IDs |
| Chat analyst | Structured retrieval / function-calling over the dataset; refuses or flags gaps instead of guessing |
| Scenario briefing | Rule-based risk score computed in code, then the model writes the interpretation around the computed numbers |
| Evidence-gap detection | Computed from the data grid, narrated by the model |
| **Live Fire Lab commentary** | Sim state (positions, temps, flame size, detector status) is sent as a compact JSON snapshot every few seconds or on events; the model narrates what changed, why (citing records), and suggests a mitigation |

### Model choice: open-weight

We use an **open-weight instruction-tuned LLM** instead of a proprietary API. Reasons: no API cost or key leakage risk, reproducible for judges, can run offline, and fits the NASA open-science spirit.

- **Candidates (pick after a quick bake-off; check current versions and licenses):** Llama family, Qwen family, Mistral family, Gemma family, gpt-oss.
- **Selection criteria:** license allows our use, good instruction following and JSON/function-calling, fits our hardware, and low hallucination on our grounded Q&A test set.
- **Serving options (choose one primary, one fallback):**
  1. **Local server** (Ollama / llama.cpp / vLLM) for dev and offline demo.
  2. **Hosted open-model inference** (e.g. Hugging Face Inference, Together, Groq, OpenRouter) for the public demo link, behind our proxy.
  3. **In-browser** small model (WebLLM / transformers.js) as a no-backend fallback.
- **Embeddings:** an open embedding model (e.g. BGE / E5 / nomic class) for retrieval over the seed dataset; at our dataset size an in-memory vector index is enough.
- **Eval:** build a 20-30 question test set from the seed data with known answers; measure citation correctness and "I don't know" behavior for each candidate model.

Safeguards:
- Show **citations** on every AI statement; clicking opens the source record.
- Show a **confidence / evidence-strength** indicator.
- The model never computes risk scores or sim physics. Code does, and the model only explains the results.
- Keep any hosted-inference key **server-side** via a tiny proxy; never ship it in the browser bundle.
- **Fallback mode** with pre-generated summaries so the demo still works if the model server is down.
- Cap output length and rate-limit the commentary loop so a live sim doesn't flood the model.

## 7. Proposed architecture & stack (confirmed: open-weight LLM, curated seed data, simulated live telemetry)

```
[ Seed JSON / real-data importer ]
            |
   [ Data layer + scoring engine ]  <- transparent risk formula (code)
        |                    |
        |            [ Sim engine (Web Worker) ] <- calibrated to seed data
        |               grid heat/flow/flame model, objects, events
        |                    |  telemetry stream (state snapshots @ ~10-30 Hz)
        |                    v
        |            [ Live Fire Lab UI: canvas + heatmap + telemetry charts ]
        |                    |  compact state JSON (throttled)
        v                    v
   [ Thin API proxy ] -> open-weight LLM (Ollama/vLLM local or hosted) + embeddings
            |
   [ Web dashboard: React + Vite + Tailwind + charts ]
```

- **Frontend:** React + Vite + Tailwind; charting via Recharts/D3/ECharts; animated UI polish with ReactBits components (MCP available in this workspace).
- **Live Fire Lab:** HTML canvas/WebGL (pixi.js or plain canvas for MVP; three.js for stretch), drag-and-drop via pointer events, simulation in a **Web Worker** so the UI stays smooth, state pushed to React through a throttled store.
- **Backend:** minimal Node proxy in front of the model server; holds any hosted-inference key.
- **Hosting:** Vercel or Netlify for the public demo link (Space Apps requires a shareable project).
- Stack is a recommendation; the "Next.js" or "Streamlit" alternatives remain open if the team prefers.

## 8. Screens (rough layout)

1. **Home / Mission control**: headline stats, evidence-gap heatmap, "Start a scenario" call to action.
2. **Explorer**: filter rail + experiment cards + detail drawer with AI summary and metrics.
3. **Risk Ranking**: ranked table with weight sliders and "why this rank" explainer.
4. **Scenario Lab**: pick environment, see risk gauge, supporting evidence, recommendations, flame visual.
5. **Live Fire Lab**: center canvas with draggable objects and heatmap overlay; left toolbox (objects, events); right telemetry charts, detector status, live risk score; bottom AI commentary strip and timeline scrubber; top bar for gravity / O2 / pressure / airflow controls and a SIMULATED badge.
6. **Ask the Analyst**: chat panel with citations (also available as a side panel inside the Lab).
7. **Brief export**: printable one-pager, including a snapshot of a Lab run.

## 9. How we'll be judged (and how we respond)

NASA Space Apps typically weighs: **Impact, Creativity, Validity, Relevance, Presentation**.

| Criterion | Our answer |
|---|---|
| Impact | Directly serves Artemis/Mars cabin and material decisions |
| Creativity | Scenario-first decision support, evidence-gap map, and a hands-on Live Fire Lab where you drag objects and watch heat respond |
| Validity | Every number sourced; transparent scoring; AI constrained to retrieved evidence; sim clearly labelled simulated and calibrated to seed data; open-weight model so results are reproducible |
| Relevance | Hits all three verbs: summarize, rank, interpret |
| Presentation | 2-minute demo flow below; clean, accessible UI |

### 2-minute demo script
1. "Fire behaves differently in space." Show teardrop vs sphere flame.
2. Open the evidence-gap map: "Here is what we know and where we are blind (Moon/Mars gravity)."
3. Pick **Lunar habitat, 34% O2, 70 kPa**: risk gauge, top risky materials, supporting experiments.
4. **Enter the Live Fire Lab:** drag a heater next to a fabric panel, ignite it, watch the heatmap and telemetry react. Flip gravity from 1g to 0g and see the flame go spherical and the smoke detector respond late. Drag the heater next to the vent and watch the risk score change.
5. The open-weight AI narrates the change and cites the experiments behind it; ask it a follow-up question.
6. Export the brief. Close with the impact statement.

## 10. Work plan (suggested split for a small team)

| Track | Owner | Deliverables |
|---|---|---|
| Data research & curation | TBD | Seed dataset + sources list + schema validation |
| Scoring & logic | TBD | Risk formula, scenario presets, evidence-gap computation |
| AI layer | TBD | Model bake-off, serving setup, prompts, retrieval, proxy, fallback summaries, eval set |
| Simulation / Live Fire Lab | TBD | Sim engine in a Web Worker, calibration to seed data, drag-and-drop objects, telemetry stream, `docs/sim-model.md` |
| Frontend / UX | TBD | Screens in section 8, charts, flame visual, heatmap rendering |
| Story & submission | TBD | Demo script, slides/video, project write-up, NASA data credits |

Milestones: (1) schema + 10 records, (2) explorer + ranking working, (3) Live Fire Lab MVP (one object type draggable, heatmap + 3 telemetry charts), (4) open-weight AI chat + briefs + Lab commentary, (5) polish, deploy, record demo.

Cut line if time runs short: keep **Explorer + Ranking + Live Fire Lab MVP + AI chat**. Drop 3D, run comparison and exports first.

## 11. Open questions for the team

- [ ] Final team roles and deadline (check the Space Apps submission date).
- [ ] Which exact NASA datasets can we legally redistribute? Confirm licensing and cite properly.
- [ ] How deep on risk scoring: simple weighted index (recommended) vs a fitted model?
- [ ] Which open-weight model, and where is it served for the public demo (local GPU, hosted inference, in-browser)? What hardware do we have?
- [ ] Sim fidelity: 2D grid model for MVP (recommended) vs 3D? What is the minimum set of draggable objects for the demo?
- [ ] Do we have a hosting account for the web app and, if needed, for hosted model inference?
- [ ] Is a video/pitch required by the submission format?

## 12. Credits & disclaimers

Data and imagery belong to NASA and the cited researchers. This project was created for the 2026 NASA Space Apps Challenge and is not affiliated with or endorsed by NASA. Outputs are informational and must not be used for flight certification or safety-critical decisions.
