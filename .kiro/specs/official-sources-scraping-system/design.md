# Official Sources Scraping System Bugfix Design

## Overview

The current scraper system only covers a limited set of sources (FMRPO, 2 development agencies, AJN news) instead of comprehensively scraping all primary official sources for incentives/grants, public procurement laws, and regulatory news across federal, cantonal, and municipal levels in Bosnia and Herzegovina.

This design formalizes a comprehensive scraping architecture that:
- Targets ONLY primary official sources (no blogs, aggregators, or portals)
- Implements modular scrapers supporting different CMS systems
- Uses a layered execution strategy (Layer 1 daily, Layer 2/3 gradual)
- Provides flexible parsers with fallback strategies
- Implements content hashing, change detection, and data quality filtering
- Maintains backward compatibility with existing pipeline infrastructure

## Glossary

- **Bug_Condition (C)**: The condition where the scraper system runs but does NOT scrape all primary official sources across federal, cantonal, and municipal levels
- **Property (P)**: The desired behavior where the scraper system comprehensively scrapes ALL primary official sources with proper normalization, deduplication, and quality filtering
- **Preservation**: Existing data models (opportunities, legal_updates), scoring logic, AI content generation, and pipeline infrastructure that must remain unchanged
- **Primary Official Source**: Government websites, agency portals, official gazettes - NOT blogs, news aggregators, or third-party portals
- **Layer 1 Sources**: High-priority federal sources scraped daily (FMRPO, FBiH Government, UNDP BiH)
- **Layer 2 Sources**: Cantonal governments, sector ministries (scraped less frequently)
- **Layer 3 Sources**: Municipal sources (gradual expansion, scraped periodically)
- **CMS Flexibility**: Ability to parse different content management systems used by cantons and municipalities
- **Content Hashing**: Using hash of content to detect changes (NEW, UPDATED, EXPIRING)
- **Fallback Strategy**: Alternative parsing methods (regex patterns, headless browser) when primary parser fails

## Bug Details

### Bug Condition

The bug manifests when the scraper system executes but fails to comprehensively scrape all primary official sources. The system currently only scrapes 3-4 sources (FMRPO, SERDA, REDAH, AJN) instead of covering all federal ministries, cantonal governments, municipal sources, and official legal gazettes.

**Formal Specification:**
```
FUNCTION isBugCondition(scraperExecution)
  INPUT: scraperExecution of type ScraperSystemRun
  OUTPUT: boolean
  
  RETURN scraperExecution.sourcesScraped.length < REQUIRED_PRIMARY_SOURCES.length
         AND NOT allFederalSourcesCovered(scraperExecution)
         AND NOT cantonalSourcesCovered(scraperExecution)
         AND NOT legalGazettesCovered(scraperExecution)
         AND NOT layeredExecutionStrategyImplemented(scraperExecution)
END FUNCTION

WHERE:
  REQUIRED_PRIMARY_SOURCES = [
    // Federal Layer 1 (daily)
    "FMRPO", "FBiH_Vlada", "UNDP_BiH",
    // Federal Layer 2 (sector ministries)
    "MCP_BiH", "FZZZ", "FMPVS", "FMOIT",
    // Cantonal Layer 2
    "Kanton_Sarajevo", "Tuzlanski_Kanton", "ZDK", "HNK", /* ... */
    // Legal sources
    "Sluzbeni_Glasnik_FBiH", "AJN_BiH", "Parlament_BiH", "Vijece_Ministara"
  ]
```

### Examples

- **Example 1**: Scraper runs and only processes FMRPO + 2 agencies → Missing FBiH Government, UNDP, sector ministries, cantons, municipalities, legal gazettes
- **Example 2**: User searches for grants in Tuzla Canton → No results because Tuzlanski Kanton is not scraped
- **Example 3**: User searches for public procurement law amendments → Only AJN news is scraped, missing Službeni glasnik FBiH and Parlament BiH
- **Example 4**: Scraper encounters different CMS on cantonal website → Fails to parse because no flexible parser exists

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Existing data models (opportunities, legal_updates tables) must remain unchanged
- scoreOpportunity function for quality scoring must continue to work
- generateOpportunityContent for AI content generation must continue to work
- external_id deduplication logic must continue to work
- scraper_log table logging must continue to work
- Expired opportunities marking based on deadline must continue to work
- fetchHtml timeout, retry logic, and User-Agent headers must continue to work
- Helper functions (stripTags, parseDate, parseValue, extractLinks) must continue to work
- post-sync-pipeline.ts orchestration must continue to work
- Promise.allSettled parallel execution pattern must continue to work

**Scope:**
All existing scraper infrastructure, data models, scoring logic, AI generation, and pipeline orchestration should be completely unaffected by this fix. This fix ONLY adds new scrapers and improves coverage - it does NOT change how data is processed, scored, or stored.

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Incomplete Source Coverage**: The system was initially built with only 3-4 sources and never expanded to cover all federal, cantonal, and municipal sources

2. **No Modular Architecture**: Each scraper is hardcoded for specific websites without a flexible parser framework that can handle different CMS systems

3. **No Layered Execution Strategy**: All sources are treated equally without prioritization (Layer 1 daily, Layer 2/3 gradual)

4. **No Fallback Mechanisms**: When a parser fails (due to CMS changes), there's no alternative parsing strategy or headless browser fallback

5. **Missing Legal Sources**: Only AJN news is scraped, missing official gazettes (Službeni glasnik), parliament, and government council sources

## Correctness Properties

Property 1: Bug Condition - Comprehensive Official Source Coverage

_For any_ scraper system execution, the fixed system SHALL scrape ALL primary official sources across federal (Layer 1: FMRPO, FBiH Vlada, UNDP; Layer 2: MCP, FZZZ, FMPVS, FMOIT), cantonal (Kanton Sarajevo, Tuzlanski Kanton, ZDK, HNK, etc.), and legal sources (Službeni glasnik FBiH, AJN, Parlament BiH, Vijeće ministara), normalize all data to the same model (Opportunity/LegalUpdate), implement content hashing for change detection, apply quality filtering (ignore items without deadline or meaningful description), and use layered execution strategy with proper rate limiting and error handling.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13**

Property 2: Preservation - Existing Pipeline Infrastructure

_For any_ scraper execution that processes opportunities and legal updates, the fixed system SHALL produce exactly the same data model structure, use the same scoreOpportunity function, use the same generateOpportunityContent function, use the same external_id deduplication logic, log to the same scraper_log table, mark expired opportunities the same way, use the same fetchHtml helper with timeout/retry, use the same HTML parsing helpers (stripTags, parseDate, parseValue, extractLinks), be orchestrated by the same post-sync-pipeline.ts, and use the same Promise.allSettled parallel execution pattern, preserving all existing infrastructure and processing logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `sync/scrapers/scraper-federal-sources.ts` (NEW)

**Purpose**: Scrape Layer 1 and Layer 2 federal sources

**Specific Changes**:
1. **Create Federal Sources Scraper**: Implement scrapers for FBiH Vlada (https://fbihvlada.gov.ba/bs/javni-pozivi), UNDP BiH (https://javnipoziv.undp.ba/), MCP BiH (https://www.mcp.gov.ba/publication/read/objavljeni-pozivi-za-dodjelu-grant-sredstava)
   - Use same pattern as existing scrapers (fetchHtml, extractLinks, parse individual pages)
   - Extract title, issuer, description, requirements, value, deadline, location
   - Generate external_id using source prefix + base64 URL hash
   - Return ScraperResult[] with source, items, error

2. **Create Sector Ministry Scrapers**: Implement scrapers for FZZZ (https://www.fzzz.ba/), FMPVS (https://fmpvs.gov.ba/), FMOIT (https://fmoit.gov.ba/)
   - Same pattern as federal sources
   - Focus on employment grants, agriculture grants, tourism grants

**File**: `sync/scrapers/scraper-cantonal-sources.ts` (NEW)

**Purpose**: Scrape Layer 2 cantonal sources with flexible CMS support

**Specific Changes**:
1. **Flexible Cantonal Parser**: Implement parser that can handle different CMS systems
   - Define CantonConfig interface: name, baseUrl, grantsPath, location, linkPattern, selectors (flexible)
   - Implement auto-detection of content sections ("Javni pozivi", "Konkursi", "Obavijesti")
   - Support multiple selector strategies (class-based, id-based, semantic HTML)
   - Fallback to regex patterns if selectors fail

2. **Canton Configurations**: Define configs for priority cantons
   - Kanton Sarajevo: https://mp.ks.gov.ba/aktuelo/konkursi
   - Tuzlanski Kanton: https://www.vladatk.kim.ba/
   - Zeničko-dobojski Kanton: https://www.zdk.ba/
   - Hercegovačko-neretvanski Kanton: https://www.hnk.ba/
   - Add more cantons gradually (Layer 2 expansion)

3. **CMS Flexibility**: Implement multiple parsing strategies
   - Strategy 1: Standard WordPress/Joomla patterns
   - Strategy 2: Custom government CMS patterns
   - Strategy 3: Regex fallback for unstructured content
   - Strategy 4: Headless browser (Puppeteer) for JavaScript-heavy sites

**File**: `sync/scrapers/scraper-municipal-sources.ts` (NEW)

**Purpose**: Scrape Layer 3 municipal sources (gradual expansion)

**Specific Changes**:
1. **Municipal Parser**: Similar to cantonal parser but with broader CMS support
   - Define MunicipalityConfig interface
   - Implement auto-detection of grant/tender sections
   - Support various CMS systems (WordPress, Drupal, custom)

2. **Priority Municipalities**: Start with largest municipalities
   - Sarajevo: https://www.sarajevo.ba/
   - Tuzla: https://tuzla.ba/
   - Zenica: https://zenica.ba/
   - Mostar: https://www.mostar.ba/
   - Banja Luka: https://www.banjaluka.rs.ba/
   - Expand gradually based on data quality and relevance

**File**: `sync/scrapers/scraper-legal-sources.ts` (NEW or EXTEND existing scraper-legal-updates.ts)

**Purpose**: Comprehensive legal source scraping

**Specific Changes**:
1. **Službeni Glasnik FBiH**: Scrape http://www.sluzbenenovine.ba/
   - Parse official gazette for new laws, amendments, decisions
   - Extract law number, title, date, summary
   - Identify public procurement related laws

2. **Parlament BiH**: Scrape https://www.parlament.ba/
   - Parse legislative activity, new laws, amendments
   - Focus on public procurement and business-related legislation

3. **Vijeće ministara BiH**: Scrape https://www.vijeceministara.gov.ba/
   - Parse government decisions, regulations
   - Focus on economic and procurement-related decisions

4. **Enhanced AJN Scraping**: Extend existing AJN scraper
   - Add zakonodavstvo section scraping (already in requirements)
   - Improve law vs amendment detection
   - Add more relevance tags

**File**: `sync/scrapers/scraper-orchestrator.ts` (NEW)

**Purpose**: Layered execution strategy and error handling

**Specific Changes**:
1. **Layer 1 Execution (Daily)**: Run high-priority federal sources
   - FMRPO, FBiH Vlada, UNDP BiH
   - Run every day via cron job
   - Fast execution, high reliability

2. **Layer 2 Execution (Weekly)**: Run cantonal and sector sources
   - All cantons, sector ministries
   - Run once per week
   - More sources, longer execution time

3. **Layer 3 Execution (Monthly)**: Run municipal sources
   - Priority municipalities
   - Run once per month
   - Gradual expansion, quality over quantity

4. **Error Handling and Fallback**:
   - Try primary parser first
   - If fails, try alternative parser
   - If still fails, try headless browser (for JS-heavy sites)
   - Log error but don't crash pipeline
   - Continue with other sources

5. **Rate Limiting**: Implement per-source rate limiting
   - Respect robots.txt
   - Add delays between requests (1-2 seconds)
   - Implement exponential backoff on errors

**File**: `sync/scrapers/content-hasher.ts` (NEW)

**Purpose**: Content hashing and change detection

**Specific Changes**:
1. **Hash Generation**: Create hash of opportunity content
   - Hash title + description + deadline + value
   - Use crypto.createHash('sha256')
   - Store hash in database (add content_hash column to opportunities table)

2. **Change Detection**: Compare hashes to detect changes
   - NEW: Hash doesn't exist in database
   - UPDATED: Hash exists but content changed
   - UNCHANGED: Hash matches existing
   - EXPIRING: Deadline approaching (within 7 days)

3. **Deduplication**: Use hash for better deduplication
   - Current system uses external_id (URL-based)
   - Add content_hash for detecting duplicate content from different URLs
   - Prevent same opportunity from appearing multiple times

**File**: `sync/scrapers/quality-filter.ts` (NEW)

**Purpose**: Data quality filtering

**Specific Changes**:
1. **Quality Rules**: Implement filtering rules
   - Ignore items without deadline
   - Ignore items without meaningful description (< 50 chars)
   - Ignore items without title (< 10 chars)
   - Ignore items with expired deadlines
   - Ignore items that are not relevant (use keyword matching)

2. **Relevance Scoring**: Score items by relevance
   - Keywords: "grant", "poticaj", "subvencija", "javni poziv", "konkurs"
   - Negative keywords: "zaposlenje" (unless employment grant), "obavijest" (unless grant announcement)
   - Boost score for items with clear value, deadline, requirements

**File**: `sync/post-sync-pipeline.ts` (MODIFY)

**Purpose**: Integrate new scrapers into existing pipeline

**Specific Changes**:
1. **Import New Scrapers**: Add imports for new scraper modules
   - scrapeFederalSources, scrapeCantonalSources, scrapeMunicipalSources, scrapeLegalSources

2. **Layered Execution**: Implement layer-based execution
   - Check execution layer (Layer 1, 2, or 3) based on cron schedule
   - Run appropriate scrapers for each layer
   - Layer 1: Daily (federal sources)
   - Layer 2: Weekly (cantonal + sector)
   - Layer 3: Monthly (municipal)

3. **Parallel Execution**: Use Promise.allSettled for parallel scraping
   - Group scrapers by layer
   - Execute all scrapers in layer in parallel
   - Collect results and errors

4. **Content Hashing Integration**: Add content hashing to pipeline
   - Generate hash for each opportunity
   - Check if hash exists in database
   - Mark as NEW, UPDATED, or UNCHANGED
   - Update database accordingly

5. **Quality Filtering Integration**: Add quality filtering to pipeline
   - Filter opportunities before scoring
   - Only process high-quality items
   - Log filtered items for monitoring

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate incomplete source coverage on the unfixed code, then verify the fix comprehensively scrapes all sources and preserves existing pipeline behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the current system does NOT scrape all primary official sources.

**Test Plan**: Write tests that check which sources are currently scraped and assert that key sources (FBiH Vlada, UNDP, cantons, municipalities, legal gazettes) are missing. Run these tests on the UNFIXED code to observe failures and confirm incomplete coverage.

**Test Cases**:
1. **Federal Sources Coverage Test**: Check if FBiH Vlada, UNDP BiH, MCP BiH are scraped (will fail on unfixed code - only FMRPO is scraped)
2. **Cantonal Sources Coverage Test**: Check if any cantonal sources are scraped (will fail on unfixed code - no cantons scraped)
3. **Municipal Sources Coverage Test**: Check if any municipal sources are scraped (will fail on unfixed code - no municipalities scraped)
4. **Legal Sources Coverage Test**: Check if Službeni glasnik, Parlament BiH, Vijeće ministara are scraped (will fail on unfixed code - only AJN news scraped)
5. **Layered Execution Test**: Check if layered execution strategy exists (will fail on unfixed code - no layers implemented)

**Expected Counterexamples**:
- Only 3-4 sources are scraped (FMRPO, SERDA, REDAH, AJN)
- No federal sources beyond FMRPO
- No cantonal sources
- No municipal sources
- No legal gazette sources
- No layered execution strategy

### Fix Checking

**Goal**: Verify that for all scraper executions, the fixed system comprehensively scrapes all primary official sources.

**Pseudocode:**
```
FOR ALL scraperExecution WHERE isBugCondition(scraperExecution) DO
  result := runFixedScraperSystem(scraperExecution)
  ASSERT allFederalSourcesCovered(result)
  ASSERT cantonalSourcesCovered(result)
  ASSERT legalGazettesCovered(result)
  ASSERT layeredExecutionStrategyImplemented(result)
  ASSERT contentHashingWorks(result)
  ASSERT qualityFilteringWorks(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all scraper executions, the fixed system preserves existing pipeline infrastructure, data models, and processing logic.

**Pseudocode:**
```
FOR ALL scraperExecution DO
  originalResult := runOriginalPipeline(scraperExecution)
  fixedResult := runFixedPipeline(scraperExecution)
  
  ASSERT fixedResult.dataModel = originalResult.dataModel
  ASSERT fixedResult.scoringLogic = originalResult.scoringLogic
  ASSERT fixedResult.aiGeneration = originalResult.aiGeneration
  ASSERT fixedResult.deduplication = originalResult.deduplication
  ASSERT fixedResult.logging = originalResult.logging
  ASSERT fixedResult.expiredMarking = originalResult.expiredMarking
  ASSERT fixedResult.fetchHtmlBehavior = originalResult.fetchHtmlBehavior
  ASSERT fixedResult.parsingHelpers = originalResult.parsingHelpers
  ASSERT fixedResult.orchestration = originalResult.orchestration
  ASSERT fixedResult.parallelExecution = originalResult.parallelExecution
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different scraper configurations
- It catches edge cases that manual unit tests might miss (different CMS systems, error conditions)
- It provides strong guarantees that existing behavior is unchanged for all pipeline operations

**Test Plan**: Observe behavior on UNFIXED code first for existing scrapers (FMRPO, agencies, AJN), then write property-based tests capturing that behavior and verify it continues after adding new scrapers.

**Test Cases**:
1. **Data Model Preservation**: Verify opportunities and legal_updates tables structure unchanged after fix
2. **Scoring Preservation**: Verify scoreOpportunity produces same scores for same inputs after fix
3. **AI Generation Preservation**: Verify generateOpportunityContent produces same content for same inputs after fix
4. **Deduplication Preservation**: Verify external_id deduplication works same way after fix
5. **Logging Preservation**: Verify scraper_log entries have same structure after fix
6. **Expired Marking Preservation**: Verify expired opportunities marked same way after fix
7. **Fetch HTML Preservation**: Verify fetchHtml timeout/retry behavior unchanged after fix
8. **Parsing Helpers Preservation**: Verify stripTags, parseDate, parseValue, extractLinks work same way after fix
9. **Orchestration Preservation**: Verify post-sync-pipeline.ts orchestration unchanged after fix
10. **Parallel Execution Preservation**: Verify Promise.allSettled pattern unchanged after fix

### Unit Tests

- Test each new scraper individually (federal, cantonal, municipal, legal)
- Test flexible parser with different CMS systems
- Test content hashing and change detection
- Test quality filtering rules
- Test layered execution strategy
- Test error handling and fallback mechanisms
- Test rate limiting and robots.txt respect

### Property-Based Tests

- Generate random scraper configurations and verify all sources are covered
- Generate random CMS structures and verify flexible parser handles them
- Generate random opportunity data and verify quality filtering works correctly
- Generate random error conditions and verify fallback strategies work
- Test that all existing pipeline behaviors are preserved across many scenarios

### Integration Tests

- Test full scraper pipeline with all layers (Layer 1, 2, 3)
- Test end-to-end flow: scrape → normalize → hash → filter → score → AI generate → store
- Test that new opportunities appear in database with correct data
- Test that legal updates appear in database with correct data
- Test that duplicate opportunities are not created
- Test that expired opportunities are marked correctly
- Test that scraper_log entries are created correctly
