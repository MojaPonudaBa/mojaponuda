# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Null Tender Handling in Bids Data Pipeline
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: bids with null tenders, empty tender arrays, undefined tenders
  - Test that AgencyClientBidsPage renders successfully when bids data contains null/undefined/empty tender values (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design:
    - Page renders without throwing server-side exceptions
    - Displays "Tender nije dostupan" for null tenders
    - Displays "Nepoznat naručilac" for null contracting authority
    - Displays "Rok nije objavljen" for null deadline
  - Test scenarios:
    - Bid with null tender relation
    - Bid with empty tender array `[]`
    - Bid with undefined tender
    - Bid with malformed tender structure
    - Multiple bids with mixed null/valid tenders
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Bids Display Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for valid bids with complete tender data
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Valid bids with complete tender data display correctly in bids table
    - Tender details (title, contracting authority, deadline) display correctly
    - Bid status badges display correctly for all statuses
    - NewBidModal displays available tenders correctly
    - Status update buttons work correctly
    - Navigation to bid detail pages works correctly
    - Client company name displays in page header
    - AgencyClientBidsFallback displays correctly when needed
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for null tender handling in bids data pipeline

  - [x] 3.1 Strengthen normalizeBidTender function
    - Add explicit handling for undefined values (not just null)
    - Add explicit handling for empty arrays (return null instead of undefined)
    - Add handling for non-object, non-array values (return null)
    - Add type guards to ensure returned value is either null or valid TenderRelation
    - _Bug_Condition: isBugCondition(input) where input.bidsData contains null/undefined/empty tender values_
    - _Expected_Behavior: Page renders successfully with safe defaults for missing tender data_
    - _Preservation: Valid bids with complete tender data continue to display correctly_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.4_

  - [x] 3.2 Add safe defaults in bid mapping
    - Verify normalizeBidTender result before assigning to tender property
    - Ensure mapping always produces safe BidRow values
    - Consider adding type guard function to validate tender structure
    - _Bug_Condition: isBugCondition(input) where normalization produces unsafe values_
    - _Expected_Behavior: Mapping produces safe BidRow values even with null tenders_
    - _Preservation: Valid tender data continues to map correctly_
    - _Requirements: 2.2, 2.3, 2.4, 3.1_

  - [x] 3.3 Strengthen null checks in BidsTable component
    - Verify `bid.tender?.title ?? "Tender nije dostupan"` pattern is used consistently
    - Verify `bid.tender?.contracting_authority ?? "Nepoznat naručilac"` is safe
    - Ensure `formatDate(bid.tender?.deadline ?? null)` handles null correctly
    - Add defensive rendering with type guards if needed
    - _Bug_Condition: isBugCondition(input) where BidsTable receives null tender data_
    - _Expected_Behavior: BidsTable renders successfully with fallback text for null values_
    - _Preservation: Valid tender data continues to display correctly_
    - _Requirements: 2.5, 3.1, 3.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Safe Null Handling in Bids Data Pipeline
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Bids Display Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
