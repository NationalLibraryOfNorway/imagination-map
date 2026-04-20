# Vedlikeholdsmodell for Imagination

Dette dokumentet beskriver en praktisk modell for videre drift og utvikling av Imagination-systemet (frontend, backend og geo-database), med LLM-assistert vedlikehold under menneskelig styring.

## Executive summary (leveranse til prosjektet)

Imagination leveres som et helhetlig system med tre gjensidig avhengige lag: frontend, backend og geo-database/annotasjonslag. For å sikre både stabil drift og videre innovasjon anbefales en todelt modell:

- en **offisiell versjon** med streng kvalitetskontroll, CI-gating og maintainer-godkjenning
- et **eksperimentspor** for rask utforsking av nye funksjoner, hypoteser og metodiske retninger

Vedlikehold gjennomføres med **kontrakter overfor LLM** (mål, scope, akseptkriterier, risiko), slik at AI-bidrag blir sporbare, testbare og styrbare. Endelig beslutningsmyndighet ligger hos navngitte maintainere, som prioriterer endringer, godkjenner merges og eier release-beslutninger.

Modellen gir prosjektet:

- forutsigbar produksjonskvalitet i den offisielle appen
- høy utviklingshastighet i utforskende arbeid
- en tydelig styringslinje mellom forslag, implementasjon og release
- et robust grunnlag for langsiktig videreføring av leveransen

## 1) Formål

Prosjektet skal kunne:

- vedlikeholde en stabil, offisiell versjon for brukere
- utforske nye retninger uten å forstyrre stabil drift
- bruke LLM-er effektivt gjennom tydelige kontrakter
- sikre at ansvar, kvalitet og beslutninger ligger hos navngitte maintainere

## 2) To utviklingsspor

### A. Offisiell versjon (stabil drift)

- `main` er produksjonsnær sannhet.
- Endringer til `main` skjer via PR og godkjenning.
- CI må være grønn før merge.
- Release markeres med tag (f.eks. `v0.9.0`).

### B. Utforskende versjoner (eksperiment)

- Nye retninger utvikles i egne branches (`feature/*`, `labs/*`, `experiment/*`).
- Kan bruke raskere iterasjon, men merges ikke til `main` uten eksplisitt beslutning.
- Resultater dokumenteres med hva som fungerer, ikke fungerer, og anbefalt videre løp.

## 3) LLM-kontrakter (arbeidsformat)

Hver oppgave til LLM bør ha en liten kontrakt med:

- **Mål:** Hva skal oppnås.
- **Scope:** Hvilke filer/moduler som kan endres.
- **Ikke-scope:** Hva som ikke skal røres.
- **Akseptkriterier:** Testbar definisjon av "ferdig".
- **Risiko:** Mulige sideeffekter.
- **Leveranse:** Kode, dokumentasjon, commit/PR, teststatus.

Dette reduserer uklare endringer og gjør vedlikehold etterprøvbart.

## 4) Roller og ansvar

### Maintainer(e)

- prioriterer og godkjenner endringer
- eier release-beslutninger
- avgjør hva som går til `main` vs. eksperimentspor

### LLM-operatør(er)

- skriver/forbedrer kontrakter
- kjører oppgaver, validerer output, dokumenterer beslutninger
- eskalerer tvil og arkitekturvalg til maintainer

### Prosjektgruppe/domeneeiere

- beskriver behov, evaluerer nytte, melder feil/forslag
- prioriterer faglig retning (analyse, visualisering, data)

## 5) Endringsflyt (anbefalt)

1. Forslag registreres (issue/skjema).
2. Forslaget triageres (`bug`, `enhancement`, `research`, `not-now`).
3. Kontrakt skrives for valgt oppgave.
4. LLM implementerer innenfor kontrakten.
5. CI/lokal bygg + manuell domeneverifisering.
6. Maintainer godkjenner og merger.
7. Release/tag ved behov.

## 6) Kvalitetsport før merge

Minimum:

- bygg passerer (`npm run build`)
- ingen nye kritiske lint/type-feil
- brukerflyt testet der endringen skjer
- dokumentasjon oppdatert ved ny funksjonalitet eller ny kontrakt

For backend/data-relaterte endringer:

- validering av API-kontrakter
- sjekk av konsistens mellom database, annotasjonslag og visning
- kort notat hvis kjent diskrepans finnes

## 7) Data- og kontraktsstyring (geo-laget)

Siden systemet bygger på samspill mellom:

- underliggende geo-database
- annotasjonsindeks
- API-lag
- frontend-visning

skal avvik mellom disse dokumenteres eksplisitt (f.eks. mismatch-notater), og ikke "skjules" med frontend-workarounds uten sporbarhet.

## 8) Forslagskanal for ikke-programmerere

Mål: lav terskel for forslag, høy sporbarhet.

- Appen tilbyr "Foreslå endring".
- Forslag lander i issue-mal med:
  - hva ønskes
  - hvor i appen
  - hvorfor
- Maintainer triagerer og bestemmer kontrakt/videre løp.

## 9) Release-rytme

Anbefalt lettvektsmodell:

- små, hyppige forbedringer i sprint-lignende rytme
- tydelige milepæler før møter/demonstrasjoner
- stabil release før eksterne leveranser

## 10) Oppsummering

Denne modellen kombinerer:

- **stabil offisiell drift**
- **kontrollert utforskning**
- **LLM-hastighet med menneskelig styring**

og gir et grunnlag for langsiktig vedlikehold av Imagination som både teknisk system og faglig leveranse.
