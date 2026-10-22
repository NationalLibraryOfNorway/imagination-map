# Agent: Les Meg Først

Dette dokumentet er for neste agent som skal jobbe i `imagination-map`. Målet er å komme raskt inn i prosjektet uten å lese alt lineært.

## Start her

Les disse filene i denne rekkefølgen:

1. `README.md`
2. `docs/architecture.md`
3. `docs/UI_INTERACTION_CONTRACT.md`
4. `docs/GEO_MODEL_HANDOFF.md`
5. `docs/database_model.md`

Les disse bare ved behov:

- `docs/API_CHANGELOG.md` for API-endringer
- `docs/SIDECAR_SEQUENCE_MISMATCH_NOTE.md` hvis du jobber med boksekvens eller geo-sidecar
- `docs/AGENT_HANDOFF.md` hvis du skal skrive en formell handoff, ikke som første onboarding

## Viktige kodefiler

Hvis du bare skal lese noen få kodefiler først, ta disse:

1. `src/context/CorpusContext.tsx`
2. `src/App.tsx`
3. `src/components/MapMarkers.tsx`
4. `src/components/HeatmapLayer.tsx`
5. `src/components/TemporalCard.tsx`
6. `src/utils/temporal.ts`

Deretter, avhengig av oppgave:

- Visuals og statistikk: `src/components/VisualsCard.tsx`, `src/components/PlaceStatsCard.tsx`, `src/components/VisualsLauncherChip.tsx`
- Settings og QA: `src/components/SettingsCard.tsx`, `src/components/PlaceQaCard.tsx`, `src/components/SettingsLauncherChip.tsx`
- Stedslister og filtrering: `src/components/EntityInspectorPanel.tsx`
- Globalt søk: `src/components/Omnibox.tsx`
- Geo-konkordans: `src/components/GeoConcordanceCard.tsx`
- Valgt sted på kart: `src/components/SelectedPlaceOverlay.tsx`, `src/components/PlaceSummaryCard.tsx`

## Nylige UI-beslutninger

Disse er bevisste beslutninger og bør ikke "forenkles bort" uten å sjekke med bruker:

- Ett panel skal i hovedsak ha én oppgave. Derfor er `PlaceStatsCard` og `PlaceQaCard` egne paneler, ikke tabs inne i andre paneler.
- Place kind-filter skal kunne stå på til det slås av eksplisitt.
- Visuals-chip viser en badge når place kind-filter er aktivt.
- Omnibox skal kunne finne steder i hele korpuset via backend, ikke bare steder i aktivt utsnitt.
- Valgt sted skal highlightes på kartet, og highlight skal forsvinne når place summary lukkes.
- Stedsliste har et spurious-filter basert på `mentions / doc_count`, og terskelen styres i settings.
- Geo-konkordans har maks `Nærhet = 50`. Verdier over 25 forutsetter at
  backendens render-søk støtter den annonserte OpenAPI-grensen.
- Trunkering i geo-konkordans kan justeres til 10, 25, 50 eller 100
  frekvenssorterte unigram-varianter; standard er 50.

## Tidsvisning: viktigste regel

Ikke regress tidsvisning til gammel logikk.

Det som gjelder nå:

- Tidsvisning bruker `POST /api/places/first-year`
- Endepunktet får `dhlabids` for aktivt korpus
- Frontend forventer en flat `rows`-liste med første år per sted
- `src/utils/temporal.ts` cacher dette på korpusnivå
- Kart, heatmap og tidskurve bruker samme mapping

Unngå disse sporene med mindre bruker eksplisitt ber om det:

- år-for-år-kall mot `POST /api/places`
- `or_query` for å beregne første år per sted
- fulltekst/near-logikk for temporal mapping

Den nye modellen er rask og riktig for oppgaven.

## Backend-endepunkter som er viktige akkurat nå

- `GET /api/metadata/all`
- `POST /api/places`
- `POST /api/places/stats`
- `POST /api/places/first-year`
- `POST /api/place/resolve`
- `POST /api/place/qa`
- `POST /api/geo/book/sequence`
- `POST /near_query`
- `POST /or_query`

Bruk riktig nivå for riktig oppgave:

- `places`-endepunktene for kart-/stedsaggregater
- `place/resolve` for globalt stedsoppslag
- `place/qa` for QA-panelet
- `near_query` og `or_query` for konkordanser/fulltekstnære spørsmål, ikke for temporal førstegangskartlegging

## Ting som ofte er verdt å huske

- `PlacePoint` i `CorpusContext` har nå også `kind` og `featureCode`.
- Place kind-filter påvirker både kart og heatmap.
- `HeatmapLayer` og `MapMarkers` har mye logikk; les før du endrer.
- `activeWindow` i `CorpusContext` brukes mange steder for panel-z-index og fokus.
- Repoet deployer til GitHub Pages via `.github/workflows/deploy-pages.yml` på push til `main`.

## Når du starter en ny oppgave

Gjør dette først:

1. Les `README.md` og dette dokumentet
2. Les `CorpusContext`, `App`, og relevant panel/kartfil
3. Sjekk om oppgaven egentlig er frontend, backend-kontrakt, eller begge deler
4. Hvis oppgaven berører temporal, geo-konk eller sted-ID-er: vær ekstra forsiktig med å ikke blande geo/fulltekst-lagene

## Hvis du skal skrive ny handoff

Bruk `docs/AGENT_HANDOFF.md` som mal. Dette dokumentet er et startkart, ikke en formell overlevering.
