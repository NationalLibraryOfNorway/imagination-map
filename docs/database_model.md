# Database Modell: ImagiNation SQLite

## Oversikt
Systemet bruker en høy-ytelses postings-modell i SQLite, optimalisert for raske steds-oppslag og mengde-operasjoner.

### 1. Tabellen `corpus`
Dette er bok-metadata for hele Nasjonalbibliotekets samling (eller et utvalg).
- **dhlabid:** Unik tall-identifikator.
- **urn:** NB.no-identifikator for boken.
- **author:** Forfatterens navn.
- **year:** Utgivelsesår.
- **title:** Bokens tittel.
- **category:** Sjanger (f.eks. "skjønnlitteratur", "historie").

### 2. Tabellen `books` (Mappings-tabell)
Mappingen mellom hver bok og stedsnavnene den inneholder.
- **dhlabid:** Referanse til boken.
- **token:** Stedsnavnet slik det står i teksten (f.eks. "Kristiania").
- **book_count:** Antall ganger dette stedet er nevnt i denne boken.
- **geonameid:** Kobling mot geografisk autoritets-database (Geonames).
- **feature_class / feature_code:** Geografisk kategori (by, elv, fjell).

### 3. Tabellen `places` (Koordinat-tabell)
Mappingen fra unike stedsnavn til koordinater.
- **token:** Stedsnavnet (primærnøkkel).
- **modern:** Det moderne navnet på stedet (f.eks. "Oslo" for "Kristiania").
- **latitude / longitude:** Posisjon på kartet.

---
## Ytelse og Søk
For å håndtere korpus med titusenvis av bøker, bruker vil `json_each` mønsteret i SQLite:
```sql
SELECT ... FROM books 
WHERE dhlabid IN (SELECT value FROM json_each(?))
```
Dette omgår SQLite sin begrensning på maksimalt antall inngående parametere per spørring.

---
*Dette dokumentet beskriver datastrukturen som ruller bak ImagiNation.*
