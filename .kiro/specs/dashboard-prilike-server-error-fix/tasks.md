# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Server Error on Null Data in Pipeline
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that page renders successfully when opportunity_follows contains null opportunities (from Bug Condition in design)
  - Test that page renders successfully when company profile is null (from Bug Condition in design)
  - Test that page renders successfully when opportunity properties are null (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (no server-side exceptions, safe defaults)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "null opportunity in follows causes TypeError when accessing follow.opportunities.title")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Data Display Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (valid opportunity follows, valid company data)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that valid opportunity follows display correctly in "Praćene prilike" section
  - Test that personalized recommendations work correctly with valid company data
  - Test that opportunity cards display all details correctly
  - Test that sections show/hide correctly based on data availability
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for dashboard prilike server error

  - [x] 3.1 Strengthen opportunity follow filtering in page.tsx
    - Replace simple null check with robust filter that verifies opportunity object exists and has required properties
    - Change from: `filter((follow) => follow.opportunities !== null)`
    - Change to: `filter((follow) => follow.opportunities != null && typeof follow.opportunities === 'object' && follow.opportunities.id)`
    - Add type guard function to ensure type safety after filtering
    - _Bug_Condition: isBugCondition(input) where input.followsRaw contains rows where opportunities IS NULL OR input.company IS NULL_
    - _Expected_Behavior: Page renders successfully without exceptions, displays safe defaults for missing data_
    - _Preservation: Valid opportunity follows display correctly, personalized recommendations work with valid company data_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.6_

  - [x] 3.2 Add safe company data defaults in page.tsx
    - Ensure company data has safe defaults before passing to recommendation function
    - Wrap company data access in a safe object with guaranteed non-null arrays
    - Ensure `industry`, `keywords`, `cpv_codes`, and `operating_regions` are never undefined
    - Add defensive null checks before accessing nested properties
    - _Bug_Condition: isBugCondition(input) where input.company IS NULL AND recommendation context builder accesses properties unsafely_
    - _Expected_Behavior: Page renders successfully with safe defaults when company data is missing_
    - _Preservation: Recommendation algorithm continues to generate accurate personalized recommendations with valid company data_
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 3.2, 3.7_

  - [x] 3.3 Add safe property access in opportunity-recommendations.ts
    - Add null checks when accessing company source properties in buildOpportunityRecommendationContext
    - Ensure `source.industry` is accessed safely with nullish coalescing
    - Ensure array properties default to empty arrays if undefined
    - Add input validation at the start of the function
    - _Bug_Condition: isBugCondition(input) where company data is null or has undefined properties_
    - _Expected_Behavior: Recommendation context builder handles null/undefined values gracefully_
    - _Preservation: Recommendation algorithm continues to work correctly with valid company data_
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 3.2, 3.7_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Server Error on Null Data in Pipeline
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Data Display Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
