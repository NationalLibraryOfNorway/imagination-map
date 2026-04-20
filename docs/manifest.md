# Manifest: ImagiNation PWA Pipeline

## 1. Data-Pipelinen (Powering the Backend)
Dette er hjertet i systemet som klargjør litteraturen for geografisk analyse.

### Byggefasen (Python)
- **Tokenisering:** Hvert dokument (bok) splittes i tokens.
- **Mapping:** Ord mappes til globale `cf_id`-er for å muliggjøre tverrgående søk.
- **Posisjonskoding:** Delta-koding og LEB128 Varint BLOB-pakking for minimalt minneavtrykk.
- **SQLite Sharding:** Dataene lagres i optimaliserte B-Tree tabeller i SQLite.

## 2. Frontend-filosofi (React)
Den nye frontenden er designet for å være "State of the Art" innen DH-visualisering.

- **Korpus-fokus:** Alt starter med brukerens utvalg. Bøker legges til, trekkes fra eller snittes (+, -, &).
- **Lynrask respons:** Bruk av `json_each` i SQLite og Canvas-basert rendering i Leaflet fjerner tradisjonelle flaskehalser.
- **Glassmorphism:** Et moderne, premium utseende som skiller seg fra tradisjonelle akademiske verktøy.

## 3. Kompatibilitet og Portabilitet
- **Offline First:** Designet som en PWA for å kunne fungere som et portabelt forskningsverktøy.
- **Standarder:** Bruker URN-er som felles nøkkel mot Nasjonalbibliotekets tjenester.
- **Excel-støtte:** Import og eksport av korpus via `.xlsx` sikrer at forskere kan flytte data mellom Excel og ImagiNation sømløst.

---
*Dette dokumentet definerer målene og teknologien bak ImagiNation-prosjektet.*
