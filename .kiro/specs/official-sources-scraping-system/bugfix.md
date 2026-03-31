# Bugfix Requirements Document

## Introduction

Trenutni scraper sustav je implementiran ali ne koristi prave, službene izvore podataka. Umjesto da scrapa primarne, službene izvore za poticaje (grantove, subvencije, javne pozive), zakon o javnim nabavkama i regulatorne vijesti, sustav koristi ograničen skup izvora koji ne pokriva sve ključne institucije. Ovo rezultira nepotpunim i nedovoljno kvalitetnim podacima za korisnike platforme.

Ovaj bugfix definira ispravno ponašanje: sustav mora scrapati ISKLJUČIVO primarne, službene izvore i pokriti sve relevantne institucije na federalnom, kantonalnom i općinskom nivou.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN scraper sustav se pokreće THEN sustav scrapa samo ograničen skup izvora (FMRPO, 2 razvojne agencije, AJN vijesti) umjesto svih primarnih službenih izvora

1.2 WHEN scraper traži poticaje THEN sustav ne pokriva ključne federalne izvore (FBiH Vlada, UNDP BiH, Ministarstvo civilnih poslova BiH, FBiH Zavod za zapošljavanje, FBiH Ministarstvo poljoprivrede, FBiH Ministarstvo turizma)

1.3 WHEN scraper traži poticaje THEN sustav ne pokriva kantonalne izvore (Kanton Sarajevo, Tuzlanski kanton, Zeničko-dobojski kanton, Hercegovačko-neretvanski kanton i ostali kantoni)

1.4 WHEN scraper traži poticaje THEN sustav ne pokriva općinske izvore (Sarajevo, Tuzla, Zenica, Mostar, Banja Luka i druge veće općine)

1.5 WHEN scraper traži zakone o javnim nabavkama THEN sustav ne scrapa Službeni glasnik FBiH, Parlament BiH i Vijeće ministara BiH

1.6 WHEN scraper traži regulatorne vijesti THEN sustav ne pokriva sve relevantne izvore za nove zakone, izmjene, dopune i odluke

1.7 WHEN scraper sustav radi THEN ne postoji slojevita strategija izvršavanja (Layer 1 dnevno, Layer 2 i Layer 3 postupno)

1.8 WHEN scraper sustav radi THEN ne postoji fleksibilna normalizacija koja podržava različite CMS sustave kantona i općina

### Expected Behavior (Correct)

2.1 WHEN scraper sustav se pokreće THEN sustav SHALL scrapati ISKLJUČIVO primarne, službene izvore (ne blogove, ne agregate, ne portale)

2.2 WHEN scraper traži poticaje THEN sustav SHALL pokriti sve prioritetne federalne izvore: FMRPO (https://javnipozivi.fmrpo.gov.ba/), FBiH Vlada (https://fbihvlada.gov.ba/bs/javni-pozivi), UNDP BiH (https://javnipoziv.undp.ba/), Ministarstvo civilnih poslova BiH (https://www.mcp.gov.ba/publication/read/objavljeni-pozivi-za-dodjelu-grant-sredstava)

2.3 WHEN scraper traži poticaje THEN sustav SHALL pokriti sektorske izvore: FBiH Zavod za zapošljavanje (https://www.fzzz.ba/), FBiH Ministarstvo poljoprivrede (https://fmpvs.gov.ba/), FBiH Ministarstvo turizma (https://fmoit.gov.ba/)

2.4 WHEN scraper traži poticaje THEN sustav SHALL pokriti kantonalne izvore sa fleksibilnim parserima koji podržavaju različite strukture (Kanton Sarajevo: https://mp.ks.gov.ba/aktuelo/konkursi, Tuzlanski kanton, Zeničko-dobojski kanton, Hercegovačko-neretvanski kanton i ostali)

2.5 WHEN scraper traži poticaje THEN sustav SHALL implementirati skalabilan sustav za scraping većih općina sa auto-detekcijom sekcija ("Javni pozivi", "Konkursi", "Obavijesti") i podrškom za različite CMS sustave

2.6 WHEN scraper traži zakone o javnim nabavkama THEN sustav SHALL scrapati Službeni glasnik FBiH (http://www.sluzbenenovine.ba/), Agenciju za javne nabavke BiH (https://www.javnenabavke.gov.ba/), Parlament BiH (https://www.parlament.ba/), Vijeće ministara BiH (https://www.vijeceministara.gov.ba/)

2.7 WHEN scraper traži zakone THEN sustav SHALL identificirati nove zakone, izmjene, dopune i odluke

2.8 WHEN scraper sustav radi THEN sustav SHALL poštovati robots.txt, implementirati rate limiting, retry logiku, error logging i deduplication

2.9 WHEN scraper sustav normalizira podatke THEN sustav SHALL mapirati sve izvore na isti model (Opportunity: type, title, issuer, deadline, value, location, description, requirements, source_url, source_name; LegalUpdate: title, type, date, source, summary)

2.10 WHEN scraper sustav detektuje promjene THEN sustav SHALL koristiti content hashing, diff detection i označavati stavke kao NEW, UPDATED ili EXPIRING

2.11 WHEN scraper sustav se izvršava THEN sustav SHALL koristiti slojevitu strategiju: Layer 1 (dnevno: FMRPO, FBiH Vlada, UNDP), Layer 2 (kantoni, ministarstva), Layer 3 (općine - postupno proširenje)

2.12 WHEN scraper sustav naiđe na grešku THEN sustav SHALL pokušati alternativni parser, koristiti headless browser ako je potrebno, logirati grešku ali ne crashati pipeline

2.13 WHEN scraper sustav prikuplja podatke THEN sustav SHALL ignorirati stavke bez roka, bez smislenog opisa ili koje nisu relevantne (fokus na kvalitetu, ne kvantitetu)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN scraper sustav normalizira podatke THEN sustav SHALL CONTINUE TO koristiti postojeći opportunities i legal_updates model iz baze podataka

3.2 WHEN scraper sustav procesira prilike THEN sustav SHALL CONTINUE TO koristiti scoreOpportunity funkciju za kvalitetni scoring

3.3 WHEN scraper sustav procesira prilike THEN sustav SHALL CONTINUE TO koristiti generateOpportunityContent za AI generiranje sadržaja

3.4 WHEN scraper sustav procesira prilike THEN sustav SHALL CONTINUE TO provjeravati postojeće stavke pomoću external_id prije insertanja

3.5 WHEN scraper sustav završi THEN sustav SHALL CONTINUE TO logirati rezultate u scraper_log tablicu

3.6 WHEN scraper sustav završi THEN sustav SHALL CONTINUE TO označavati stare prilike kao expired na osnovu deadline datuma

3.7 WHEN scraper sustav koristi fetchHtml THEN sustav SHALL CONTINUE TO koristiti timeout, retry logiku i User-Agent header

3.8 WHEN scraper sustav parsira HTML THEN sustav SHALL CONTINUE TO koristiti postojeće helper funkcije (stripTags, parseDate, parseValue, extractLinks)

3.9 WHEN scraper sustav se poziva THEN sustav SHALL CONTINUE TO biti pozvan iz post-sync-pipeline.ts preko cron job-a

3.10 WHEN scraper sustav radi paralelno THEN sustav SHALL CONTINUE TO koristiti Promise.allSettled za paralelno izvršavanje scrapera
