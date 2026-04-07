# PDF Viewer Layout and Scroll Fix - Bugfix Design

## Overview

PDF viewer za tender dokumentaciju ima četiri kritična problema koji čine sistem neupotrebljivim: (1) inline viewer se prikazuje ispod kartice umjesto pored nje u grid layout-u, (2) Documents panel ostaje vidljiv kada je viewer otvoren, (3) puni pregled prikazuje samo prvu stranicu PDF-a, i (4) scrollanje u punom pregledu scrolla stranicu u pozadini umjesto PDF dokumenta. Ovi problemi sprečavaju korisnike da efikasno pregledaju tender dokumentaciju.

Fix pristup je minimalan i ciljani: (1) osigurati da grid layout pravilno prikazuje viewer pored kartice, (2) sakriti Documents panel kada je viewer otvoren, (3) renderovati sve stranice PDF-a u punom pregledu, i (4) blokirati scroll na body elementu kada je puni pregled otvoren.

## Glossary

- **Bug_Condition (C)**: Skup uslova koji aktiviraju jedan od četiri bug scenarija - layout problem, Documents panel vidljivost, single-page rendering, ili scroll capture
- **Property (P)**: Očekivano ponašanje kada je viewer otvoren - pravilni grid layout, sakriven Documents panel, sve stranice vidljive, i scroll na PDF-u
- **Preservation**: Postojeća funkcionalnost koja mora ostati nepromijenjena - page navigation, zoom kontrole, highlight funkcionalnost, checklist page references
- **BidWorkspaceLayout**: Komponenta u `components/bids/workspace/bid-workspace-client.tsx` koja upravlja grid layout-om između checklist-a, viewer-a i Documents panel-a
- **TenderDocViewer**: Inline PDF viewer komponenta u `components/bids/workspace/tender-doc-viewer.tsx` koja prikazuje jednu stranicu PDF-a
- **TenderDocFullViewer**: Full-screen PDF viewer komponenta u `components/bids/workspace/tender-doc-full-viewer.tsx` koja prikazuje PDF u modal overlay-u
- **viewerOpen**: State varijabla koja kontroliše da li je inline viewer prikazan
- **fullViewerOpen**: State varijabla koja kontroliše da li je full-screen viewer prikazan

## Bug Details

### Bug Condition

Bug se manifestuje u četiri različita scenarija kada korisnik interaguje sa PDF viewer-om:

**Scenario 1 - Layout Problem**: Kada korisnik pritisne "Pogledaj" dugme, inline viewer se prikazuje ispod kartice umjesto pored nje. Grid layout ne funkcioniše pravilno.

**Scenario 2 - Documents Panel Visibility**: Kada je inline viewer otvoren, Documents panel ostaje vidljiv na desnoj strani iako bi trebao biti zamijenjen viewer-om.

**Scenario 3 - Single Page Rendering**: Kada korisnik pritisne "Otvori puni pregled" dugme, prikazuje se samo prva stranica PDF-a. Korisnik ne može vidjeti ostale stranice.

**Scenario 4 - Scroll Capture**: Kada korisnik pokuša scrollati PDF u punom pregledu, scrolla se stranica u pozadini umjesto PDF dokumenta.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserInteraction
  OUTPUT: boolean
  
  RETURN (input.action == "openInlineViewer" AND layoutIsIncorrect())
         OR (input.action == "openInlineViewer" AND documentsPanelIsVisible())
         OR (input.action == "openFullViewer" AND onlyFirstPageRendered())
         OR (input.action == "scrollInFullViewer" AND backgroundScrolls())
END FUNCTION

FUNCTION layoutIsIncorrect()
  RETURN viewerIsNotInGridColumn() OR viewerIsBelow CardInsteadOfBeside()
END FUNCTION

FUNCTION documentsPanelIsVisible()
  RETURN viewerOpen == true AND documentsPanelElement.isVisible()
END FUNCTION

FUNCTION onlyFirstPageRendered()
  RETURN fullViewerOpen == true AND renderedPages.length == 1
END FUNCTION

FUNCTION backgroundScrolls()
  RETURN fullViewerOpen == true AND document.body.style.overflow != "hidden"
END FUNCTION
```

### Examples

- **Layout Problem**: Korisnik pritisne "Pogledaj" na checklist item sa page reference → inline viewer se prikazuje ispod checklist-a umjesto u desnoj koloni grid-a → korisnik mora scrollati dole da vidi viewer
- **Documents Panel**: Korisnik otvori inline viewer → Documents panel ostaje vidljiv pored viewer-a → ekran je pretrpan sa dva panela
- **Single Page**: Korisnik pritisne "Otvori puni pregled" → vidi samo prvu stranicu PDF-a → ne može pristupiti stranicama 2, 3, 4, itd.
- **Scroll Capture**: Korisnik otvori puni pregled i pokuša scrollati → stranica u pozadini se scrolla umjesto PDF dokumenta → korisnik ne može navigirati kroz PDF

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Page navigation kontrole (ChevronLeft/ChevronRight) moraju nastaviti omogućiti navigaciju između stranica
- Zoom kontrole (Plus/Minus) moraju nastaviti omogućiti zoom in/out funkcionalnost
- Zatvaranje inline viewer-a mora nastaviti prikazati Documents panel
- Zatvaranje punog pregleda mora nastaviti vratiti se na prethodni prikaz
- Loading indikator mora nastaviti biti prikazan dok se PDF učitava
- Checklist item page reference klikovi moraju nastaviti omogućiti navigaciju na tu stranicu
- Highlight funkcionalnost mora nastaviti označiti traženi tekst u PDF-u

**Scope:**
Sve interakcije koje NE uključuju otvaranje viewer-a ili scrollanje u punom pregledu trebaju biti potpuno nepromijenjene. Ovo uključuje:
- Klikove na checklist items bez page reference
- Upload tender dokumentacije
- Dodavanje i uređivanje notes
- Navigaciju između stranica u inline viewer-u
- Zoom funkcionalnost u oba viewer-a

## Hypothesized Root Cause

Na osnovu analize koda, najvjerovatniji uzroci su:

1. **Layout Problem - Grid Configuration**: Grid layout u `BidWorkspaceLayout` koristi `lg:grid-cols-5` sa `lg:col-span-3` za checklist i `lg:col-span-2` za desnu kolonu. Problem je vjerovatno u tome što conditional rendering između `TenderDocViewer` i `documentsPanel` ne funkcioniše pravilno, ili viewer nije pravilno pozicioniran u grid-u.

2. **Documents Panel Visibility - Conditional Rendering**: Conditional rendering logika `{viewerOpen && canView ? <TenderDocViewer /> : documentsPanel}` bi trebala sakriti Documents panel kada je viewer otvoren, ali možda postoji problem sa state-om ili rendering-om koji uzrokuje da oba budu vidljiva.

3. **Single Page Rendering - Page Component Props**: `TenderDocFullViewer` koristi `<Page pageNumber={pageNumber} />` što renderuje samo jednu stranicu. Za prikaz svih stranica, potrebno je renderovati multiple `<Page>` komponente ili koristiti drugačiji pristup.

4. **Scroll Capture - Body Overflow**: `TenderDocFullViewer` ima `useEffect` koji postavlja `document.body.style.overflow = "hidden"`, ali možda ne funkcioniše pravilno ili se ne primjenjuje na vrijeme. Također, scroll event možda nije pravilno uhvaćen na PDF container-u.

## Correctness Properties

Property 1: Bug Condition - Layout and Visibility

_For any_ user interaction where the inline viewer is opened (viewerOpen becomes true), the fixed BidWorkspaceLayout SHALL display the TenderDocViewer in the right grid column (lg:col-span-2) beside the checklist, and SHALL hide the Documents panel completely.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Full Page Rendering

_For any_ user interaction where the full viewer is opened (fullViewerOpen becomes true), the fixed TenderDocFullViewer SHALL render all pages of the PDF document, allowing the user to scroll through all pages.

**Validates: Requirements 2.3, 2.5**

Property 3: Bug Condition - Scroll Isolation

_For any_ scroll event that occurs when the full viewer is open (fullViewerOpen is true), the fixed TenderDocFullViewer SHALL capture the scroll event on the PDF container and SHALL prevent the background page from scrolling.

**Validates: Requirements 2.4**

Property 4: Preservation - Existing Controls

_For any_ user interaction with page navigation controls, zoom controls, close buttons, or checklist page references, the fixed components SHALL produce exactly the same behavior as the original components, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `components/bids/workspace/bid-workspace-client.tsx`

**Function**: `BidWorkspaceLayout`

**Specific Changes**:
1. **Verify Grid Layout**: Provjeriti da grid layout pravilno funkcioniše sa `lg:grid-cols-5` i da desna kolona (`lg:col-span-2`) pravilno prikazuje viewer kada je `viewerOpen` true
   - Osigurati da conditional rendering `{viewerOpen && canView ? <TenderDocViewer /> : documentsPanel}` pravilno funkcioniše
   - Provjeriti da nema CSS konflikata koji bi mogli uzrokovati da viewer bude prikazan ispod umjesto pored

2. **Verify State Management**: Provjeriti da `viewerOpen` state pravilno kontroliše prikaz viewer-a i sakrivanje Documents panel-a
   - Osigurati da `setViewerOpen(true)` pravilno triggeruje re-render
   - Provjeriti da nema race condition-a ili timing problema

**File**: `components/bids/workspace/tender-doc-full-viewer.tsx`

**Function**: `TenderDocFullViewer`

**Specific Changes**:
1. **Render All Pages**: Zamijeniti single `<Page>` komponentu sa multiple `<Page>` komponentama za sve stranice PDF-a
   - Koristiti `Array.from({ length: numPages }, (_, i) => i + 1).map(page => <Page key={page} pageNumber={page} />)`
   - Ukloniti `pageNumber` state i navigation kontrole koje mijenjaju trenutnu stranicu (ili ih zadržati za quick navigation)
   - Osigurati da sve stranice budu renderovane u scrollable container-u

2. **Fix Scroll Isolation**: Osigurati da scroll event bude uhvaćen na PDF container-u, ne na body-u
   - Provjeriti da `document.body.style.overflow = "hidden"` pravilno funkcioniše
   - Dodati `overflow-auto` na PDF container div
   - Osigurati da scroll event ne propagira do parent elemenata

3. **Update Page Navigation**: Ako zadržavamo page navigation kontrole, ažurirati ih da scrollaju do odgovarajuće stranice umjesto da mijenjaju `pageNumber` state
   - Koristiti `scrollIntoView` ili `scrollTo` za navigaciju do stranice
   - Dodati ref-ove na svaku `<Page>` komponentu za scroll targeting

4. **Adjust Scale**: Možda smanjiti default scale sa 1.2 na 1.0 ili 0.9 jer će sve stranice biti prikazane odjednom

**File**: `components/bids/workspace/tender-doc-viewer.tsx`

**Function**: `TenderDocViewer`

**Specific Changes**:
1. **No Changes Required**: Inline viewer već pravilno renderuje jednu stranicu i ima page navigation. Problem je u layout-u, ne u viewer-u samom.

## Testing Strategy

### Validation Approach

Testing strategija slijedi two-phase pristup: prvo, surface counterexamples koji demonstriraju bug na unfixed kodu, zatim verificirati da fix radi pravilno i čuva postojeće ponašanje.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples koji demonstriraju bug PRIJE implementacije fix-a. Potvrditi ili opovrgnuti root cause analizu. Ako opovrgnemo, trebamo re-hypothesize.

**Test Plan**: Napisati testove koji simuliraju user interakcije sa viewer-om i assertuju očekivano ponašanje. Pokrenuti ove testove na UNFIXED kodu da vidimo failures i razumijemo root cause.

**Test Cases**:
1. **Layout Test**: Otvoriti inline viewer i provjeriti da li je prikazan u desnoj koloni grid-a pored checklist-a (will fail on unfixed code)
2. **Documents Panel Test**: Otvoriti inline viewer i provjeriti da li je Documents panel sakriven (will fail on unfixed code)
3. **Full Page Rendering Test**: Otvoriti puni pregled i provjeriti da li su sve stranice PDF-a renderovane (will fail on unfixed code)
4. **Scroll Isolation Test**: Otvoriti puni pregled i simulirati scroll event, provjeriti da li se scrolla PDF umjesto background-a (will fail on unfixed code)

**Expected Counterexamples**:
- Inline viewer se prikazuje ispod checklist-a umjesto pored njega
- Documents panel ostaje vidljiv kada je viewer otvoren
- Samo prva stranica PDF-a je renderovana u punom pregledu
- Scroll event scrolla background stranicu umjesto PDF-a
- Possible causes: grid layout problem, conditional rendering issue, single Page component, body overflow not set

### Fix Checking

**Goal**: Verificirati da za sve inpute gdje bug condition vrijedi, fixed funkcija proizvodi očekivano ponašanje.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedComponent(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Expected Behavior:**
- Inline viewer je prikazan u desnoj koloni grid-a pored checklist-a
- Documents panel je sakriven kada je viewer otvoren
- Sve stranice PDF-a su renderovane u punom pregledu
- Scroll event scrolla PDF dokument, ne background stranicu

### Preservation Checking

**Goal**: Verificirati da za sve inpute gdje bug condition NE vrijedi, fixed funkcija proizvodi isti rezultat kao originalna funkcija.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalComponent(input) = fixedComponent(input)
END FOR
```

**Testing Approach**: Property-based testing je preporučen za preservation checking jer:
- Automatski generiše mnogo test case-ova kroz input domain
- Hvata edge case-ove koje manual unit testovi mogu propustiti
- Pruža jake garancije da ponašanje nije promijenjeno za sve non-buggy inpute

**Test Plan**: Observirati ponašanje na UNFIXED kodu prvo za non-viewer interakcije, zatim napisati property-based testove koji hvataju to ponašanje.

**Test Cases**:
1. **Page Navigation Preservation**: Observirati da ChevronLeft/ChevronRight kontrole rade pravilno na unfixed kodu, zatim napisati test da verificira da nastavljaju raditi nakon fix-a
2. **Zoom Preservation**: Observirati da Plus/Minus kontrole rade pravilno na unfixed kodu, zatim napisati test da verificira da nastavljaju raditi nakon fix-a
3. **Close Preservation**: Observirati da zatvaranje viewer-a prikazuje Documents panel na unfixed kodu, zatim napisati test da verificira da nastavlja raditi nakon fix-a
4. **Highlight Preservation**: Observirati da highlight funkcionalnost radi pravilno na unfixed kodu, zatim napisati test da verificira da nastavlja raditi nakon fix-a

### Unit Tests

- Test da inline viewer otvara u desnoj koloni grid-a
- Test da Documents panel je sakriven kada je viewer otvoren
- Test da puni pregled renderuje sve stranice PDF-a
- Test da scroll event scrolla PDF umjesto background-a
- Test da page navigation kontrole rade u inline viewer-u
- Test da zoom kontrole rade u oba viewer-a
- Test da zatvaranje viewer-a prikazuje Documents panel

### Property-Based Tests

- Generisati random PDF dokumente sa različitim brojem stranica i verificirati da puni pregled renderuje sve stranice
- Generisati random scroll event-e i verificirati da se scrolla PDF umjesto background-a
- Generisati random page numbers i verificirati da page navigation radi pravilno
- Generisati random zoom levels i verificirati da zoom kontrole rade pravilno

### Integration Tests

- Test full flow: otvoriti inline viewer → verificirati layout → otvoriti puni pregled → scrollati kroz stranice → zatvoriti puni pregled → zatvoriti inline viewer
- Test checklist integration: kliknuti na checklist item sa page reference → verificirati da inline viewer otvara na pravilnoj stranici → otvoriti puni pregled → verificirati da je pravilna stranica prikazana
- Test highlight integration: kliknuti na checklist item sa highlight text → verificirati da inline viewer prikazuje highlight → otvoriti puni pregled → verificirati da highlight radi u punom pregledu
