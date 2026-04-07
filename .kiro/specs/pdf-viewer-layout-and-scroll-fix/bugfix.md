# Bugfix Requirements Document

## Introduction

PDF viewer za tender dokumentaciju ima više problema sa layoutom i scrollanjem koji čine sistem neupotrebljivim. Viewer se prikazuje ispod kartice umjesto pored nje, prikazuje se nepotreban Documents panel, a puni pregled prikazuje samo prvu stranicu PDF-a koja se ne može scrollati. Kada korisnik pokuša scrollati PDF u punom pregledu, scrolla se stranica u pozadini umjesto PDF dokumenta.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN korisnik pritisne "Pogledaj" dugme THEN inline PDF viewer se prikazuje ispod kartice sa tenderom umjesto pored nje

1.2 WHEN inline PDF viewer je otvoren THEN Documents panel ostaje vidljiv na desnoj strani iako nije potreban

1.3 WHEN korisnik pritisne "Otvori puni pregled" dugme THEN prikazuje se samo prva stranica PDF-a

1.4 WHEN korisnik pokuša scrollati PDF u punom pregledu THEN scrolla se stranica u pozadini umjesto PDF dokumenta

1.5 WHEN korisnik gleda puni pregled PDF-a THEN ne može pristupiti ostalim stranicama dokumenta scrollanjem

### Expected Behavior (Correct)

2.1 WHEN korisnik pritisne "Pogledaj" dugme THEN inline PDF viewer SHALL biti prikazan pored kartice sa tenderom (u grid layout-u)

2.2 WHEN inline PDF viewer je otvoren THEN Documents panel SHALL biti sakriven i zamijenjen PDF viewer-om

2.3 WHEN korisnik pritisne "Otvori puni pregled" dugme THEN SHALL biti prikazane sve stranice PDF dokumenta

2.4 WHEN korisnik pokuša scrollati PDF u punom pregledu THEN SHALL scrollati PDF dokument, ne stranicu u pozadini

2.5 WHEN korisnik gleda puni pregled PDF-a THEN SHALL moći scrollati kroz sve stranice dokumenta

### Unchanged Behavior (Regression Prevention)

3.1 WHEN korisnik koristi page navigation kontrole (ChevronLeft/ChevronRight) THEN sistem SHALL CONTINUE TO omogućiti navigaciju između stranica

3.2 WHEN korisnik koristi zoom kontrole (Plus/Minus) THEN sistem SHALL CONTINUE TO omogućiti zoom in/out funkcionalnost

3.3 WHEN korisnik zatvori inline viewer THEN sistem SHALL CONTINUE TO prikazati Documents panel

3.4 WHEN korisnik zatvori puni pregled THEN sistem SHALL CONTINUE TO vratiti se na prethodni prikaz

3.5 WHEN PDF dokument se učitava THEN sistem SHALL CONTINUE TO prikazati loading indikator

3.6 WHEN checklist item ima page reference THEN sistem SHALL CONTINUE TO omogućiti navigaciju na tu stranicu klikom

3.7 WHEN korisnik koristi highlight funkcionalnost THEN sistem SHALL CONTINUE TO označiti traženi tekst u PDF-u
