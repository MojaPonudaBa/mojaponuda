# Dashboard Prilike Server Error Fix - Bugfix Design

## Overview

The /dashboard/prilike page throws a server-side exception (digest 2639304102) during SSR when authenticated users navigate to the opportunities dashboard. The root cause is inadequate null/undefined handling in the data fetching pipeline, specifically when processing opportunity_follows query results and company profile data. The fix will add defensive null checks and safe defaults throughout the data pipeline to ensure graceful degradation when data is missing or incomplete.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the page attempts to render with null/undefined values in the data fetching chain
- **Property (P)**: The desired behavior - the page should render successfully with safe defaults when data is missing
- **Preservation**: Existing display behavior for valid data that must remain unchanged by the fix
- **PrilikeDashboardPage**: The server component in `app/(dashboard)/dashboard/prilike/page.tsx` that renders the opportunities dashboard
- **opportunity_follows**: The Supabase table join that can return rows with null opportunity references
- **getPersonalizedOpportunityRecommendations**: The function in `lib/opportunity-recommendations.ts` that generates personalized recommendations
- **buildOpportunityRecommendationContext**: The function that builds recommendation context from company data

## Bug Details

### Bug Condition

The bug manifests when the page attempts to render during SSR and encounters null or undefined values in the data fetching pipeline. The system is either not filtering null opportunities correctly, not handling missing company data safely, or not providing safe defaults when accessing nested properties.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type PageRenderContext
  OUTPUT: boolean
  
  RETURN (input.followsRaw contains rows where opportunities IS NULL)
         OR (input.company IS NULL AND recommendation context builder accesses properties unsafely)
         OR (input.opportunities[i].property IS NULL AND accessed without null check)
         AND serverSideException IS thrown
END FUNCTION
```

### Examples

- **Example 1**: User has opportunity_follows rows where the referenced opportunity was deleted → opportunities field is null → filter fails to remove it → accessing `follow.opportunities.title` throws error
- **Example 2**: User has no company profile → company is null → buildOpportunityRecommendationContext accesses `company.industry` without null check → throws error
- **Example 3**: Opportunity has null deadline → code attempts to format deadline without null check → throws error during rendering
- **Edge Case**: User has multiple follows with mixed null/valid opportunities → only null ones should be filtered out, valid ones should display correctly

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Users with valid opportunity follows and complete data must see their tracked opportunities displayed correctly in "Praćene prilike" section
- Personalized recommendations must continue to work when company profile exists with valid data
- Other opportunities must continue to display in "Ostali poticaji" or "Svi poticaji" section
- Resolved follows (won/lost) must continue to display in "Arhiva prijava" section
- ProGate redirect for unsubscribed users must continue to work
- Opportunity cards must display all details (title, issuer, deadline, location, value, difficulty) correctly when data is present
- Recommendation algorithm must continue to generate accurate personalized recommendations when valid company data exists

**Scope:**
All inputs that do NOT involve null/undefined values in the data pipeline should be completely unaffected by this fix. This includes:
- Valid opportunity follows with complete opportunity data
- Valid company profiles with complete data
- Valid opportunity records with all fields populated
- Successful authentication and subscription checks

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Unsafe Type Assertion**: The code uses `as unknown as FollowRow[]` type assertion after filtering, but TypeScript doesn't enforce runtime null checks, so null opportunities can slip through if the filter logic is incorrect or if the type definition doesn't match the actual data structure.

2. **Missing Null Check in Filter**: The filter `follow.opportunities !== null` may not be sufficient if `opportunities` is `undefined` rather than `null`, or if the Supabase query returns a different structure than expected.

3. **Company Data Null Handling**: When `company` is null (user has no company profile), the code passes `company?.industry ?? null` and empty arrays to `getPersonalizedOpportunityRecommendations`, but the downstream functions may not handle these null values safely.

4. **Nested Property Access**: The code accesses nested properties like `follow.opportunities.title` without verifying that `opportunities` is not null at the point of access, relying solely on the earlier filter which may have failed.

## Correctness Properties

Property 1: Bug Condition - Safe Null Handling in Data Pipeline

_For any_ page render where the data fetching pipeline returns null or undefined values (null opportunities in follows, null company data, null opportunity properties), the fixed page component SHALL handle these values gracefully with safe defaults and null checks, allowing the page to render successfully without throwing server-side exceptions.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Valid Data Display Behavior

_For any_ page render where the data fetching pipeline returns complete and valid data (valid opportunity follows, valid company profile, valid opportunity records), the fixed page component SHALL produce exactly the same rendering output as the original code, preserving all existing display behavior for tracked opportunities, personalized recommendations, and opportunity cards.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/(dashboard)/dashboard/prilike/page.tsx`

**Function**: `PrilikeDashboardPage` (default export)

**Specific Changes**:

1. **Strengthen Opportunity Filter**: Replace the simple null check with a more robust filter that verifies the opportunity object exists and has required properties
   - Change from: `filter((follow) => follow.opportunities !== null)`
   - Change to: `filter((follow) => follow.opportunities != null && typeof follow.opportunities === 'object' && follow.opportunities.id)`

2. **Add Type Guard**: Create a type guard function to ensure type safety after filtering
   - Add: `function isValidFollow(follow: FollowRow): follow is FollowRow & { opportunities: NonNullable<FollowRow['opportunities']> }`
   - Use type guard in filter to narrow types properly

3. **Safe Company Data Defaults**: Ensure company data has safe defaults before passing to recommendation function
   - Wrap company data access in a safe object with guaranteed non-null arrays
   - Ensure `industry`, `keywords`, `cpv_codes`, and `operating_regions` are never undefined

4. **Add Defensive Null Checks**: Add null checks before accessing nested properties in the recommendation context
   - Verify company object exists before accessing properties
   - Provide empty arrays as defaults for array properties

5. **Error Boundary Consideration**: Consider wrapping the page content in an error boundary to catch any remaining edge cases
   - This is a secondary defense layer, not the primary fix

**File**: `lib/opportunity-recommendations.ts`

**Function**: `buildOpportunityRecommendationContext`

**Specific Changes**:

1. **Safe Property Access**: Add null checks when accessing company source properties
   - Ensure `source.industry` is accessed safely with nullish coalescing
   - Ensure array properties default to empty arrays if undefined

2. **Validate Input**: Add input validation at the start of the function
   - Check that source object exists
   - Provide safe defaults for all properties

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create test scenarios that simulate the conditions that trigger the bug (null opportunities, null company data) and attempt to render the page component. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Null Opportunity in Follows**: Mock opportunity_follows query to return rows with null opportunities (will fail on unfixed code)
2. **Undefined Opportunity in Follows**: Mock opportunity_follows query to return rows with undefined opportunities (will fail on unfixed code)
3. **Null Company Profile**: Mock company query to return null (may fail on unfixed code if recommendation context builder doesn't handle it)
4. **Missing Nested Properties**: Mock opportunity data with null deadline, location, or other optional fields (may fail on unfixed code)

**Expected Counterexamples**:
- Server-side exception thrown when rendering page with null opportunities
- Possible causes: unsafe type assertion, missing null check in filter, unsafe nested property access

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := PrilikeDashboardPage_fixed(input)
  ASSERT result renders successfully without exceptions
  ASSERT result displays safe defaults for missing data
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT PrilikeDashboardPage_original(input) = PrilikeDashboardPage_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for valid data scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Valid Follows Display**: Observe that valid opportunity follows display correctly on unfixed code, then write test to verify this continues after fix
2. **Personalized Recommendations**: Observe that personalized recommendations work correctly with valid company data on unfixed code, then write test to verify this continues after fix
3. **Opportunity Cards**: Observe that opportunity cards display all details correctly on unfixed code, then write test to verify this continues after fix
4. **Section Visibility**: Observe that sections (Praćene prilike, Arhiva prijava, Poticaji za Vas) show/hide correctly based on data on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test opportunity follow filtering with null, undefined, and valid opportunities
- Test company data safe defaults with null, undefined, and valid company profiles
- Test recommendation context building with various company data states
- Test edge cases (empty arrays, missing optional fields, mixed valid/invalid data)

### Property-Based Tests

- Generate random opportunity_follows data with varying null/valid ratios and verify page renders successfully
- Generate random company profiles with varying completeness and verify recommendations work correctly
- Test that all valid data scenarios produce identical output before and after fix

### Integration Tests

- Test full page rendering with authenticated user who has null opportunities in follows
- Test full page rendering with authenticated user who has no company profile
- Test full page rendering with authenticated user who has complete valid data
- Test that ProGate redirect continues to work for unsubscribed users
