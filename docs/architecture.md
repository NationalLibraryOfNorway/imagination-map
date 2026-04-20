# Arkitektur: ImagiNation PWA

## Oversikt
Dette er den moderne PWA-arkitekturen for ImagiNation. Systemet er bygget for lynrask visualisering av stedsnavn i historisk litteratur.

### Teknisk Stack
- **Frontend:** React (Vite) + Leaflet (Canvas rendering via CircleMarkers).
- **Styling:** Vanilla CSS med Glassmorphism-estetikk.
- **Backend:** FastAPI (Python) som grensesnitt mot SQLite.
- **Database:** SQLite (`imagination.db`) med postings-sentrisk modell.

### Evolusjon fra Dash (Legacy)
Prosjektet startet i **Dash/Plotly**. Overgangen til React ble gjort for å:
1. Oppnå flytende 60fps interaksjon på kartet.
2. Støtte avanserte mengdeoperasjoner (+, &, -) i nettleserminnet.
3. Muliggjøre PWA-funksjonalitet og bedre mobilrespons.

## Kjernekomponenter
- **CorpusContext:** Hjernen i appen. Holder `activeDhlabids` og metadata i RAM.
- **MapMarkers:** Ansvarlig for å tegne tusenvis av steder. Bruker logaritmisk skalering på frekvens.
- **CorpusBuilderCard:** Bruker-interaksjon for å bygge og filtrere korpuset.
- **CorpusBrowseTable:** Sorterbar tabellvisning av alle bøker med stedsstatistikk.

---
*Dette dokumentet er en del av den nye dokumentasjons-huben i `imagination-frontend`.*
