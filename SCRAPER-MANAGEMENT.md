# Scraper Management Dashboard

## Pregled

Kreiran je admin dashboard za upravljanje scraper izvorima sa mogućnošću individualnog scrapanja i praćenja logova.

## Što je dodano

### 1. Centralni registar izvora (`sync/scrapers/scraper-registry.ts`)

Registar svih 22 izvora koji se scrapeaju:

**Layer 1 - Dnevno (6 izvora)**
- FMRPO - Federalno ministarstvo razvoja, poduzetništva i obrta
- SERDA - Razvojna agencija Sarajevskog kantona
- REDAH - Razvojna agencija za Hercegovinu
- Vlada Federacije BiH
- UNDP Bosna i Hercegovina
- Ministarstvo civilnih poslova BiH

**Layer 2 - Sedmično (6 izvora)**
- Kanton Sarajevo
- Tuzlanski kanton
- Zeničko-dobojski kanton
- Federalni zavod za zapošljavanje (FZZZ)
- Federalno ministarstvo poljoprivrede (FMPVS)
- Federalno ministarstvo okoliša i turizma (FMOIT)

**Layer 3 - Mjesečno (5 izvora)**
- Grad Sarajevo
- Grad Tuzla
- Grad Zenica
- Grad Mostar
- Grad Banja Luka

**Legal sources (5 izvora)**
- Agencija za javne nabavke BiH - Novosti
- Agencija za javne nabavke BiH - Zakonodavstvo
- Službeni glasnik FBiH
- Parlament BiH
- Vijeće ministara BiH

### 2. API Endpoints

**`POST /api/admin/scrape-source`**
- Individualno scrapanje određenog izvora
- Parametar: `{ sourceId: string }`
- Vraća: rezultate scrapanja (pronađeno, novo, preskočeno, filtrirano)
- Samo za admin korisnike

**`GET /api/admin/scraper-logs`**
- Dohvaća zadnjih 50 scraper logova
- Samo za admin korisnike

### 3. Admin Dashboard (`/dashboard/admin/scrapers`)

Stranica sa:
- **Listom svih izvora** sa osnovnim informacijama
- **Filterima** po layeru (dnevno/sedmično/mjesečno) i kategoriji (prilike/zakon)
- **Dugmetom za individualno scrapanje** za svaki izvor
- **Real-time statusom** scrapanja (loading, rezultati, greške)
- **Logovima** zadnjeg scrapanja za svaki izvor
- **Linkovima** na izvorne stranice

### 4. Komponenta `ScraperSourcesList`

Client-side komponenta koja:
- Prikazuje sve izvore u kartičnom formatu
- Omogućava filtriranje po layeru i kategoriji
- Prikazuje status scrapanja u real-time
- Prikazuje rezultate (pronađeno, novo, preskočeno, filtrirano)
- Prikazuje greške ako ih ima
- Automatski osvježava logove nakon scrapanja

### 5. Popravke

- **Vrijeme cron job-a**: Promijenjeno sa 03:30 na 04:00
- **Admin navigacija**: Dodan link "Scrapers" sa Database ikonom

## Kako koristiti

### 1. Pristup dashboardu

1. Logirajte se kao admin
2. Idite na `/dashboard/admin/scrapers`
3. Vidjet ćete listu svih 22 izvora

### 2. Filtriranje izvora

**Po layeru:**
- Kliknite "Dnevno" za Layer 1 izvore
- Kliknite "Sedmično" za Layer 2 izvore
- Kliknite "Mjesečno" za Layer 3 izvore
- Kliknite "Svi layeri" za sve izvore

**Po kategoriji:**
- Kliknite "Prilike" za izvore prilika
- Kliknite "Zakon" za pravne izvore
- Kliknite "Sve kategorije" za sve izvore

### 3. Individualno scrapanje

1. Pronađite izvor koji želite scrapati
2. Kliknite "Pokreni scraper" dugme
3. Pratite status u real-time:
   - **Loading**: Scraper se izvršava
   - **Rezultati**: Prikazuju se pronađeni, novi, preskočeni i filtrirani itemsi
   - **Greške**: Prikazuju se ako ih ima

### 4. Praćenje logova

Za svaki izvor vidite:
- **Zadnje vrijeme izvršavanja** (npr. "Prije 2h")
- **Broj pronađenih itemsa**
- **Broj novih itemsa**
- **Broj preskočenih itemsa**
- **Greške** (ako ih ima)

## Tehnički detalji

### Registar izvora

```typescript
export interface ScraperSource {
  id: string;              // Jedinstveni ID izvora
  name: string;            // Puno ime izvora
  url: string;             // URL izvora
  category: "opportunities" | "legal";  // Kategorija
  layer: "layer1" | "layer2" | "layer3";  // Layer
  description: string;     // Opis izvora
  enabled: boolean;        // Da li je izvor aktivan
}
```

### API Response

```typescript
{
  success: true,
  sourceId: "fmrpo",
  sourceName: "FMRPO - Federalno ministarstvo...",
  itemsFound: 15,          // Ukupno pronađeno
  itemsNew: 3,             // Novo dodano u bazu
  itemsSkipped: 10,        // Preskočeno (duplikati, nepromijenjen sadržaj)
  itemsFiltered: 2,        // Filtrirano (niska kvaliteta)
  duration_ms: 12500,      // Trajanje u milisekundama
  errors: []               // Greške (ako ih ima)
}
```

### Scraper Log

```typescript
{
  id: string;
  source: string;          // Ime izvora (npr. "manual-fmrpo")
  items_found: number;     // Pronađeno
  items_new: number;       // Novo
  items_skipped: number;   // Preskočeno
  error: string | null;    // Greška (ako je ima)
  ran_at: string;          // Vrijeme izvršavanja
}
```

## Primjer korištenja

### Scenario 1: Testiranje novog izvora

1. Idite na `/dashboard/admin/scrapers`
2. Filtrirajte po "Dnevno" da vidite Layer 1 izvore
3. Pronađite "FMRPO" izvor
4. Kliknite "Pokreni scraper"
5. Pratite rezultate:
   - Ako je `itemsNew > 0` → Izvor radi i pronašao je nove prilike
   - Ako je `itemsFound = 0` → Izvor možda nema novih prilika ili ima problem
   - Ako ima greške → Provjerite error poruku

### Scenario 2: Provjera svih izvora

1. Idite na `/dashboard/admin/scrapers`
2. Kliknite "Svi layeri" i "Sve kategorije"
3. Pregledajte logove za svaki izvor
4. Izvore sa greškama označite za ispravljanje
5. Izvore bez logova pokrenite individualno

### Scenario 3: Testiranje pravnih izvora

1. Idite na `/dashboard/admin/scrapers`
2. Kliknite "Zakon" filter
3. Vidjet ćete 5 pravnih izvora
4. Pokrenite svaki individualno
5. Provjerite `/zakon` stranicu da vidite rezultate

## Troubleshooting

### Problem: Scraper vraća 0 itemsa

**Mogući uzroci:**
1. Izvor trenutno nema novih prilika
2. Stranica je nedostupna
3. Struktura stranice se promijenila
4. Quality filter je previše strog

**Rješenje:**
1. Provjerite izvornu stranicu ručno
2. Provjerite error poruku u rezultatima
3. Provjerite `itemsFiltered` - ako je visok, quality filter je previše strog

### Problem: Svi itemsi su filtrirani

**Mogući uzroci:**
1. Itemsi nemaju deadline
2. Itemsi imaju kratak opis (< 50 chars)
3. Itemsi imaju istekao deadline
4. Itemsi imaju nizak relevance score (< 0.3)

**Rješenje:**
1. Provjerite `sync/scrapers/quality-filter.ts`
2. Prilagodite pravila filtriranja ako je potrebno
3. Provjerite izvorne stranice da vidite kvalitetu podataka

### Problem: Scraper traje predugo

**Mogući uzroci:**
1. Izvor ima puno stranica
2. Rate limiting je previše spor
3. Stranice se sporo učitavaju

**Rješenje:**
1. Provjerite `sync/scrapers/fetch-html.ts` za rate limiting
2. Smanjite broj stranica po izvoru (trenutno max 20)
3. Povećajte timeout ako je potrebno

## Budući razvoj

### Planirana poboljšanja

1. **Automatsko testiranje izvora**
   - Dnevno testiranje svih izvora
   - Notifikacije ako izvor ne radi

2. **Statistika izvora**
   - Grafikon uspješnosti po izvoru
   - Prosječan broj novih itemsa po izvoru
   - Vrijeme izvršavanja po izvoru

3. **Bulk operacije**
   - "Pokreni sve Layer 1 izvore"
   - "Pokreni sve izvore sa greškama"
   - "Pokreni sve pravne izvore"

4. **Napredni filteri**
   - Filter po statusu (radi/ne radi)
   - Filter po broju novih itemsa
   - Filter po vremenu zadnjeg izvršavanja

5. **Export logova**
   - Export u CSV
   - Export u JSON
   - Email izvještaji

## Zaključak

Scraper management dashboard omogućava:
- ✅ Pregled svih 22 izvora na jednom mjestu
- ✅ Individualno testiranje svakog izvora
- ✅ Real-time praćenje statusa scrapanja
- ✅ Filtriranje po layeru i kategoriji
- ✅ Praćenje logova i grešaka
- ✅ Brzo debugiranje problema

Dashboard je dizajniran da bude jednostavan za korištenje i da pruži sve potrebne informacije za upravljanje scraper sistemom.
