# MARGIN CLUB — The Business Detective

A BombayCoder experimental product: an interactive business investigation platform. It looks like an investigative magazine and shows its working like an auditor.

> **Fictional content.** Ordinary Objects, its customers and every figure in the app are deterministic demo data generated for Case #001. No real business, client, testimonial or result is depicted.

## Routes

| Route            | What it is                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `/`              | Editorial landing page: interactive hero chart, case file, investigator preview, order scatter |
| `/investigation` | Full-screen workspace: evidence canvas (4 lenses), selected-evidence dossier, the investigator |
| `/case-study`    | BombayCoder case study, with live product previews and real engine output                      |

Deep links: `/investigation#mode=products|customers|channels|trap` and `/investigation#month=2026-08`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build && npm start
```

## The investigator: free by default

The investigator is a **local analysis engine**: a rules-based parser plus deterministic handlers over the dataset, running in the browser. It needs no API keys and makes no network calls, and it is labelled honestly in the UI.

**Optional: Ollama narration.** If [Ollama](https://ollama.com) is running on your machine, open *Engine settings*, choose the Ollama narrator, run *Test connection*, then pick an installed model. The model only re-words the engine's facts. Any number it writes that is not in those facts is flagged in red. Ollama accepts requests from `localhost` origins by default. If you serve the app from another origin, start Ollama with `OLLAMA_ORIGINS=<that origin>`.

## Structure

```
app/                     routes (landing, investigation, case-study)
components/              brand primitives, landing + case-study sections
features/investigation/  workspace shell, store (localStorage), canvases, drawer, investigator UI
features/analytics/      custom SVG/canvas exhibits (no chart library)
lib/analytics/           types, metrics, profit bridge, cohorts, suspicious-order rules, CSV
lib/ai/                  question parser, handlers, engine, optional Ollama narrator
data/                    catalog (products, channels, campaigns) + seeded order simulation
```

The calculations in `lib/analytics` are pure TypeScript, kept separate from the UI. The same functions power the canvas, the investigator, the landing page and the case study.

## The dataset

`data/generate.ts` simulates Feb–Sep 2026 for a Mumbai D2C home-goods brand: about 5,100 orders, 12 products, 4 channels and 9 coupon campaigns. The PRNG is seeded and the simulation uses integer arithmetic only, so the server and the browser produce identical data. Promotions deepen from May, ads push two thin-margin SKUs, quick commerce launches in June with a 28% commission, and deep-discount customers repeat less. Revenue rises while contribution profit falls, and every claim in the UI is computed from these orders.
