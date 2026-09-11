# AGENTS

Dette er første stopp for agenter som jobber i dette repoet.

## Les først

1. `agent_les_meg.md`
2. `README.md`
3. `docs/architecture.md`
4. `docs/UI_INTERACTION_CONTRACT.md`

## Kritiske regler

- Ikke regress tidsvisning til gammel logikk. Bruk `POST /api/places/first-year`.
- Ikke bruk `or_query` eller fulltekst/near-logikk for temporal førstegangskartlegging.
- Ett panel skal normalt ha én oppgave. Bevar egne paneler som `PlaceStatsCard` og `PlaceQaCard`.
- Place kind-filter skal kunne stå på til det slås av eksplisitt.
- Geo-konkordans skal ikke sende `Nærhet` over `25`.
- I Visuals kjøres frekvensfiltrene i fast rekkefølge: `Kutt lavfrekvente steder`
  fjerner nederste X prosent, deretter grønner `Grønning etter kutt` nederste Y
  prosent av stedene som gjenstår. Ikke gjeninnfør den gamle dempekontrollen.
- Geo-konkordans- og bokforløpsfarger skal overstyre grønnfargen.
- Bildeeksport er avhengig av Leaflet canvas-rendering (`preferCanvas`) og av å
  vente til panorering/zoom er ferdig. Ikke regress til SVG-markører eller
  øyeblikkelig `html2canvas`, som kan forskyve steder i eksporten.
- Full CSV følger aktivt korpus samt stedstype- og tidsfilter. CSV for synlig
  kartutsnitt følger i tillegg viewport, frekvenskutt, markørgrense,
  geo-konkordans og bokforløp. CSV er foreløpig eksport-only.

## Start i kode

Les disse filene tidlig:

- `src/context/CorpusContext.tsx`
- `src/App.tsx`
- `src/components/MapMarkers.tsx`
- `src/components/HeatmapLayer.tsx`
- `src/components/VisualsCard.tsx`
- `src/components/TemporalCard.tsx`
- `src/utils/temporal.ts`
- `src/utils/placeFrequency.ts`
- `src/utils/placeCsvExport.ts`

## Mer detaljert onboarding

Se `agent_les_meg.md` for:

- nylige UI-beslutninger
- relevante backend-endepunkter
- hvilke docs som er verdt å lese
- prosjektspesifikke fallgruver
