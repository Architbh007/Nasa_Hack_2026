# FireSight sources

Every dataset, paper, web page, image, tool and service FireSight uses, with a public link for each. Data was accessed on 14 Nov 2026.

How each dataset was extracted and checked is recorded in [`data/real/source-registry.json`](../real/source-registry.json), and the per-investigation citation text is in [`data/real/citations.json`](../real/citations.json).

## NASA data: run-level tests (772 runs)

| Source | Used for | Link |
| --- | --- | --- |
| NASA Physical Science Informatics (PSI) Repository | Home of every PSI dataset below | https://psi.nasa.gov |
| PSI-26 BASS (Burning and Suppression of Solids), DOI 10.60555/58h4-dy80 | 121 solid-fuel runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-26 |
| PSI-25 BASS-II, DOI 10.60555/4qc4-de67 | 129 solid-fuel runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 |
| PSI-69 FLEX (Flame Extinguishment Experiment), DOI 10.60555/mbq8-0451 | 274 liquid-droplet runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 |
| PSI-39 CFI (Cool Flames Investigation), DOI 10.60555/m6pj-a914 | 227 liquid-droplet runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-39 |
| PSI-98 Saffire-I, DOI 10.60555/0t15-1z43 | 2 runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-98 |
| PSI-99 Saffire-II, DOI 10.60555/2chp-m469 | 9 runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-99 |
| PSI-100 Saffire-III, DOI 10.60555/040q-4h36 | 2 runs | https://psi.nasa.gov/physci/repo/data/investigations/PSI-100 |
| Preliminary Results from the Saffire VI Experiment (ICES-2024-365), NTRS 20240002981 | Saffire IV–VI runs (Tables 1 and 2) | https://ntrs.nasa.gov/citations/20240002981 |
| Preliminary Results from the Saffire VI Experiment, slide deck, NTRS 20240007488 | Saffire VI test matrix (slide 11) | https://ntrs.nasa.gov/api/citations/20240007488/downloads/Saffire%20ICES%202024%20Saffire%20presentation072124small.pdf |
| Fire Safety Implications of Preliminary Results from Saffire IV and V Experiments on Large Scale Spacecraft Fires (ICES 2021-266), NTRS 20210011521 | Saffire IV–V runs (Tables 1 and 2) | https://ntrs.nasa.gov/citations/20210011521 |
| Spacecraft Fire Safety Demonstration (Saffire) overview | Saffire flight dates and goals | https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf |

## NASA data: summaries and metadata (shown in the Explorer)

| Source | Data held | Link |
| --- | --- | --- |
| PSI-68 FLEX-2, DOI 10.60555/byp8-h018 | Planned test matrix | https://psi.nasa.gov/physci/repo/data/investigations/PSI-68 |
| PSI-20 ACME BRE | Day-level summary | https://psi.nasa.gov/physci/repo/data/investigations/PSI-20 |
| PSI-107 SPICE, DOI 10.60555/9kbh-e962 | Log summary | https://psi.nasa.gov/physci/repo/data/investigations/PSI-107 |
| PSI-106 SLICE, DOI 10.60555/pm12-rg61 | Schedule | https://psi.nasa.gov/physci/repo/data/investigations/PSI-106 |
| PSI-10 ACME Flame Design, DOI 10.60555/w4zy-bt45 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-10 |
| PSI-21 ACME CLD Flame, DOI 10.60555/23e1-9950 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-21 |
| PSI-22 ACME E-FIELD Flames | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-22 |
| PSI-23 ACME s-Flame, DOI 10.60555/k57n-p030 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-23 |
| PSI-159 ACME CFI-G, DOI 10.60555/cyt1-kh64 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-159 |
| PSI-47 DAFT / DAFT-2, DOI 10.60555/ztgj-d202 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-47 |
| PSI-101 SAME-R, DOI 10.60555/2np7-jv14 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-101 |
| PSI-102 SAME, DOI 10.60555/gd4k-8h62 | Metadata only | https://psi.nasa.gov/physci/repo/data/investigations/PSI-102 |
| PSI combustion-science search endpoint | Names, hardware, dates, objectives and publications for all 20 investigations | https://psi.nasa.gov/geode-py/ws/repo/search?data_source=psi&data_type=investigation&ffield=Research%20Area&fvalue=combustion%20science&size=200 |

## NASA references: cabin atmosphere presets

| Source | Used for | Link |
| --- | --- | --- |
| NASA Man-Systems Integration Standards (MSIS), Section 5 | Earth sea-level preset (14.7 psia, about 21% O2) | https://msis.jsc.nasa.gov/sections/section05.htm |
| NASA OCHMO ECLSS Technical Brief (NASA-STD-3001) | ISS cabin preset and the 14.7 psi used to place BASS-II runs | https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf |
| Operation and Development Status of the Spacecraft Fire Experiments (Saffire), NTRS 20170000230 | Lunar base preset (34% O2, 8.2 psi, page 7) | https://ntrs.nasa.gov/citations/20170000230 |
| Effects of the 8 psia / 32% O2 Atmosphere on the Human in the Spaceflight Environment, NTRS 20130013505 | Mars transit preset (26.5% O2, 10.2 psia) | https://ntrs.nasa.gov/citations/20130013505 |
| Designing an Exploration Atmosphere Prebreathe Protocol, NTRS 20140012830 | Spacesuit preset (4.3 psia) | https://ntrs.nasa.gov/citations/20140012830 |

## NASA references: Then vs Now (historical fires)

| Source | Link |
| --- | --- |
| 55 Years Ago: The Apollo 1 Fire and its Aftermath | https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/ |
| Apollo 1 mission page | https://www.nasa.gov/mission/apollo-1/ |
| NASA SP-350: Apollo Expeditions to the Moon, chapter 4 | https://history.nasa.gov/SP-350/ch-4-5.html |
| 25 Years Ago: Fire Aboard Space Station Mir | https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/ |
| Particle and Smoke Detection on ISS for Next Generation Smoke Detectors, NTRS 20070031686 | https://ntrs.nasa.gov/citations/20070031686 |
| Detailed Results from the Flame Extinguishment Experiment (FLEX), NTRS 20150023456 | https://ntrs.nasa.gov/citations/20150023456 |
| Multi-User Droplet Combustion Apparatus: Flame Extinguishment Experiment, NTRS 20090014812 | https://ntrs.nasa.gov/citations/20090014812 |
| Burning and Suppression of Solids-II (BASS-II) Summary Report, NTRS 20210011385 | https://ntrs.nasa.gov/citations/20210011385 |
| Combustion of Solids in Microgravity: Results from the BASS-II Experiment, NTRS 20160000593 | https://ntrs.nasa.gov/citations/20160000593 |
| The Flame of Discovery Grows as Saffire Sets New Fires in Space | https://www.nasa.gov/humans-in-space/the-flame-of-discovery-grows-as-saffire-sets-new-fires-in-space/ |
| Moon to Mars (M2M): Exploration Atmosphere, NTRS 20240003211 | https://ntrs.nasa.gov/citations/20240003211 |
| Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere, NTRS 20150021491 | https://ntrs.nasa.gov/citations/20150021491 |

## NASA images

All photographs are NASA imagery, used under [NASA's media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and searchable in the [NASA Image and Video Library](https://images.nasa.gov). No NASA logos are used.

| File (`public/images/`) | Page | NASA ID |
| --- | --- | --- |
| iss-module-night.jpg | Habitat | iss042e021318 |
| combustion-integrated-rack.jpg | Explorer | iss032e014574 |
| earth-night-aurora.jpg | Home, Back on Earth | iss058e005282 |
| earthset-over-moon.jpg | Planner | art002e021278 |
| flame-spread-solid-fuel.jpg | Crew Response | 9902618 |
| orbital-sunrise.jpg | Home | NASA (ID not recorded) |
| microgravity-candle-flame.jpg | Home | NASA (ID not recorded) |

## Other data and services

| Source | Used for | Link |
| --- | --- | --- |
| DataCite REST API | DOIs, citation text and licences for the PSI datasets | https://api.datacite.org |
| Creative Commons CC0 1.0 | Licence of 16 of the 19 PSI investigations | https://creativecommons.org/publicdomain/zero/1.0/ |
| OpenAI API | SI explanations inside the app (server-side, cached) | https://platform.openai.com |
| Claude Code | SI coding assistant used to write much of the code | https://www.anthropic.com/claude-code |
| Vercel | Hosting | https://vercel.com |

## Open-source code

| Tool | Link |
| --- | --- |
| Next.js | https://nextjs.org |
| React | https://react.dev |
| TypeScript | https://www.typescriptlang.org |
| Tailwind CSS | https://tailwindcss.com |
| shadcn/ui | https://ui.shadcn.com |
| Radix UI | https://www.radix-ui.com |
| Recharts | https://recharts.org |
| TanStack Table | https://tanstack.com/table |
| Zod | https://zod.dev |
| Fuse.js | https://www.fusejs.io |
| Lucide icons | https://lucide.dev |
| react-markdown and remark-gfm | https://github.com/remarkjs/react-markdown |
| ExcelJS (reading PSI spreadsheets) | https://github.com/exceljs/exceljs |
| Vitest | https://vitest.dev |
| tsx | https://github.com/privatenumber/tsx |
| Geist font | https://fonts.google.com/specimen/Geist |
