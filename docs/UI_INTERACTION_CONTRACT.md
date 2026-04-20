# UI Interaction Contract

Dette dokumentet definerer samspill mellom chips, paneler/vinduer og kart i ImagiNation-frontend.
Målet er konsistent oppførsel på tvers av desktop og mobil.

## 1) Prinsipper

- **Forutsigbar toggling:** Et valg skal alltid påvirke ett tydelig mål.
- **Lokal handling:** Klikk på en menyhandling skal ikke indirekte toggle andre vinduer.
- **Kontroller alltid tilgjengelig:** Omniboks og chips skal aldri bli utilgjengelige bak paneler.
- **Fokusbarhet:** Aktivt vindu skal komme foran andre vinduer.
- **Mobil først for kontrollflater:** Lukk/minimer-knapper må ha store nok touch targets.

## 2) Entiteter

- **Top controls**
  - `Omnibox`
  - `StatsHUD` chips
  - `VisualsLauncherChip`
- **Windows/panels**
  - `CorpusBuilderCard`
  - `CorpusBrowseTable`
  - `VisualsCard`
  - `EntityInspectorPanel`
  - `PlaceSummaryCard`

## 3) Lagrekkefølge (z-index contract)

- **Nivå A (øverst):** `Omnibox` + omnibox-resultater
- **Nivå B:** Chips + chip-menyer
- **Nivå C:** Draggable vinduer/paneler (aktivt vindu foran andre)
- **Nivå D:** Kartlag (markører/heatmap)

Krav:
- Top controls skal alltid kunne nås.
- Aktive vinduer skal ikke kunne dekke omniboks/chips permanent.

## 4) Toggle-regler (obligatoriske)

### 4.1 Én handling = ett mål

Eksempler:
- `Bøker -> Corpus Builder` toggler kun `CorpusBuilderCard`.
- `Bøker -> Vis tabell` toggler kun `CorpusBrowseTable`.
- `Visuals -> Visuals panel` toggler kun `VisualsCard`.

### 4.2 Samme handling på aktivt mål

Hvis vinduet allerede er aktivt og handlingen trigges igjen:
- handlingen skal **lukke/minimere det samme vinduet**.

### 4.3 Ingen “gruppe-toggling”

Valg under samme chip skal være uavhengige:
- `Corpus Builder` skal ikke implicit toggle `Vis tabell`.
- `Vis tabell` skal ikke implicit toggle `Corpus Builder`.

## 5) Fokusregler for vinduer

- Klikk/drag/resize på et vindu setter `activeWindow`.
- `activeWindow` får høyest vindus-z-index.
- Åpning via chip setter også riktig `activeWindow`.
- Lukking av aktivt vindu nullstiller `activeWindow` eller flytter fokus til sist brukte åpne vindu.

## 6) Plasseringskontrakt (layout/grid)

Nåværende problem:
- Vinduer åpner med frie koordinater og kan kollidere med top controls.

Ny retning:
- Innfør et enkelt **layout-grid** for hele viewporten.

### 6.1 Viewport-soner

- **Top reserved zone:** høyde reservert for omniboks + chips.
- **Left utility zone:** område for venstre launchers.
- **Main workspace zone:** primær sone der vinduer får default-posisjoner.

### 6.2 Regel for default-posisjon

- Ingen vindu-default skal starte i top reserved zone.
- Alle nye vinduer skal defaultes til en “safe slot” i workspace zone.
- Ved kollisjon mellom åpne vinduer:
  - cascade-forskyvning eller neste ledige slot.

### 6.3 Responsive/mobil

- Mobil skal bruke enklere strategi:
  - full-bredde eller nesten full-bredde paneler
  - stablet vertikal åpning
  - minimert overlapp.

## 7) Interaksjonsregler per kontroll

### Omnibox
- Skal alltid være tilgjengelig.
- Resultatvalg som åpner paneler skal sette relevant fokus.

### Chips
- Chips er både status + launcher.
- Menyvalg skal ikke påvirke andre mål enn det som er valgt.

### Vinduskontroller
- Lukk/minimer-knapper minimum touch target 36x36 på mobil.
- Minimer betyr: vindu skjules, men kan gjenåpnes via korrekt chip.

## 8) Implementasjons-backlog (prioritert)

1. **Formalisere layout-grid i kode**
   - Beregne reserved top zone.
   - Lage utility-funksjon for safe default-posisjoner.
2. **Slot-basert vindusåpning**
   - Definer slots per vindustype.
3. **Fokus- og toggle-tester**
   - Enkle UI-tester for “én handling = ett mål”.
4. **Mobilforenkling**
   - Redusere flytende overlapp på små skjermer.

## 9) Definition of Done for videre UI-arbeid

- Ingen vindu-default overlapper omniboks/chips.
- Alle chip-menyvalg toggler kun sitt mål.
- Aktivt vindu kommer foran, uten å skjule top controls.
- Samme oppførsel er verifisert på desktop + mobil.

