# Legacy Dash Guide: ImagiNation Dash App

## Oversikt over Dash-tiden (Plotly)
ImagiNation ble opprinnelig prototypet i **Dash/Plotly**. Dette dokumentet arkiverer de viktigste konseptene fra den gamle appen slik at vi kan overføre den rike logikken til den nye React-baserte PWA-en.

### 1. IIIF-integrasjon (Bilder)
I Dash-appen ble historiske bilder hentet dynamisk fra Nasjonalbiblioteket og Gallica.
Logikken for å oppløse IIIF-manifester finnes i `src/dash_imagination/utils/images.py`:
- `resolve_iiif_image(manifest_url, max_px)`: Henter ut den beste bildefilen (.jpg) fra et IIIF Presentation v2 eller v3-manifest.
- **Kildevalg:** Appen prioriterer bilder fra NB.no før den faller tilbake til Gallica ved mangel på treff.

### 2. Omniboks (Globalt søk)
Omniboksen i Dash-appen fungerte som en "Google Maps"-lignende søkelinje:
- **State-styring:** Brukte `global-search-filter-store` i `app.py` for å lagre søkehistorikk og filtre.
- **Entitets-matching:** Søket treffer parallelt på Steder, Bøker og Forfattere.
- **Handling:** Et klikk på et resultat i omniboksen kan enten zoome kartet (Sted) eller legge til data i det aktive korpuset (Bøker/Forfattere).

### 3. Stedsvisning og Metadata
I den gamle appen ble steds-detaljer vist i et eget kort (`Place Info`).
- **Logikk:** `update_place_summary` og `_render_place_summary_from_search` i `app.py`.
- **Frekvens-statistikk:** Visualiserte antall nevnte steder per bok og år, ofte med bars/charts som vi planlegger å bygge i React.

---
## Referanse-filer i `Dash_Imagination`:
For videre porting av logikk, se følgende filer i det gamle repoet:
- `src/dash_imagination/app.py`: Hovedlogikken for kartoppdateringer og bilde-callbacks.
- `src/dash_imagination/utils/db.py`: Database-helper for tilkobling.
- `src/dash_imagination/utils/images.py`: IIIF-oppløser og API-klienter.

---
*Dette dokumentet fungerer som en bro mellom den gamle Dash-applikasjonen og den nye PWA-arkitekturen.*
