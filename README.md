# ImagiNation PWA: Kartografier i Litteratur

## Om Prosjektet
ImagiNation er et verktøy for å visualisere steder i litteratur gjennom tidene. Applikasjonen lar forskere bygge komplekse bokutvalg (korpus) og umiddelbart se deres geografiske avtrykk på et interaktivt kart.

## Teknisk Arkitektur
Prosjektet er organisert som en moderne web-applikasjon med en separat backend:
- **Frontend (Dette repoet):** En React PWA som håndterer interaksjon, kart-rendering (Leaflet) og korpus-bygging.
- **Backend ([sqlite-backend](file:///Users/larsj/Github/sqlite-backend)):** En FastAPI-server som snakker direkte med `imagination.db`.
- **Database:** SQLite med postings-støtte for raske fulltekst- og steds-søk.

## Dokumentasjon
For mer dybdeinformasjon, se den nye dokumentasjons-huben i `docs/`:
- [**Arkitektur Overview**](docs/architecture.md) – Oversikt over teknologivalg og React-struktur.
- [**Prosjekt Manifest**](docs/manifest.md) – Filosofien bak data-pipelinen og de overordnede målene.
- [**Database Modell**](docs/database_model.md) – Detaljer om SQLite-skjemaet og `json_each` mønsteret.
- [**Legacy Dash Guide**](docs/legacy_dash.md) – Referanser til den opprinnelige Plotly/Dash prototypen (`Dash_Imagination`).

## Kom i gang (Utvikling)
1. **Installer avhengigheter:** `npm install`
2. **Kjør frontenden:** `npm run dev`
3. **Kjør backenden:** Gå til `sqlite-backend` repoet og kjør `uv run uvicorn api_imagination:app --port 8080 --reload`.

---
*Utviklet av Nasjonalbiblioteket / DHLab.*
