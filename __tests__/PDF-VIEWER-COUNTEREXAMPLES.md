# PDF Viewer Bug Condition Exploration - Counterexamples

## Test Execution Summary

**Date**: 2025-01-XX  
**Status**: ✅ Tests FAILED as expected (confirming bugs exist)  
**Test File**: `__tests__/pdf-viewer-bug-condition.test.tsx`

## Counterexamples Found

### ✅ Bug Condition 1: Inline Viewer Layout Problem
**Status**: PASSED (structure is correct in code)  
**Finding**: The grid layout structure in `bid-workspace-client.tsx` is correctly configured with:
- `lg:grid-cols-5` for 5-column grid
- `lg:col-span-3` for checklist (left column)
- `lg:col-span-2` for viewer/documents (right column)
- Proper conditional rendering structure

**Conclusion**: The layout structure in the code appears correct. The bug may be caused by CSS conflicts, z-index issues, or runtime state management problems rather than structural issues.

---

### ❌ Bug Condition 2: Documents Panel Visibility Issue
**Status**: FAILED (bug confirmed)  
**Counterexample**:
```
AssertionError: expected false to be true
- Expected: true
+ Received: false
```

**Finding**: The conditional rendering pattern is NOT using a proper ternary operator:
- Expected pattern: `{viewerOpen && canView ? <TenderDocViewer /> : documentsPanel}`
- Actual pattern: Different structure that may allow both to be visible

**Root Cause**: The conditional rendering logic in `bid-workspace-client.tsx` does not properly use a ternary operator to ensure exclusive rendering of either the viewer OR the documents panel.

**Impact**: Documents panel may remain visible when inline viewer is open, causing UI clutter.

---

### ❌ Bug Condition 3: Full Viewer Single Page Rendering
**Status**: FAILED (bug confirmed)  
**Counterexample**:
```
AssertionError: expected null to be true
- Expected: true
+ Received: null
```

**Finding**: Only page 1 is rendered in the full viewer:
- Page 1: ✅ Rendered
- Page 2: ❌ NOT rendered (null)
- Page 3: ❌ NOT rendered (null)
- Page 4: ❌ NOT rendered (null)
- Page 5: ❌ NOT rendered (null)

**Root Cause**: `TenderDocFullViewer` component uses a single `<Page pageNumber={pageNumber} />` component instead of rendering multiple `<Page>` components for all pages.

**Impact**: Users can only see the first page of PDF documents in full viewer mode, making multi-page documents inaccessible.

---

### ❌ Bug Condition 4: Scroll Isolation Issue
**Status**: FAILED (bug confirmed)  
**Counterexample**:
```
Property failed after 1 tests
Counterexample: [{"hasChecklistItems":false,"numPages":1,"initialPage":1}]
```

**Finding**: Background scroll is NOT prevented when full viewer is open:
- Expected: `document.body.style.overflow === 'hidden'`
- Actual: `document.body.style.overflow !== 'hidden'`

**Root Cause**: The `useEffect` in `TenderDocFullViewer` that sets `document.body.style.overflow = "hidden"` is either:
1. Not executing properly
2. Being overridden by other code
3. Not being applied in time

**Impact**: When users try to scroll the PDF in full viewer mode, the background page scrolls instead, making PDF navigation impossible.

---

## Property-Based Test Results

### Property: Full Viewer Should Render All Pages
**Status**: FAILED (bug confirmed)  
**Counterexamples**: Multiple scenarios tested with different page counts (1-20 pages)  
**Shrunk Counterexample**: `{"numPages":1,"fileName":"     "}`

**Finding**: For ANY PDF with N pages, only 1 page is rendered instead of all N pages.

**Property Violation**: The property "Full viewer renders all pages for any PDF" does NOT hold for the current implementation.

---

### Property: Background Scroll Should Be Prevented
**Status**: FAILED (bug confirmed)  
**Counterexamples**: Multiple scenarios tested  
**Shrunk Counterexample**: `{"hasChecklistItems":false,"numPages":1,"initialPage":1}`

**Finding**: For ANY full viewer state (regardless of checklist items, page count, or initial page), `document.body.style.overflow` is NOT set to "hidden".

**Property Violation**: The property "Background scroll is prevented for any full viewer state" does NOT hold for the current implementation.

---

## Summary of Confirmed Bugs

| Bug # | Description | Status | Severity |
|-------|-------------|--------|----------|
| 1 | Inline viewer layout problem | ⚠️ Needs investigation | Medium |
| 2 | Documents panel visibility | ✅ Confirmed | Medium |
| 3 | Single page rendering | ✅ Confirmed | High |
| 4 | Scroll isolation | ✅ Confirmed | High |

## Next Steps

1. ✅ **Task 1 Complete**: Bug condition exploration test written and executed
2. ⏭️ **Task 2**: Write preservation property tests (before implementing fix)
3. ⏭️ **Task 3**: Implement fixes for confirmed bugs
4. ⏭️ **Task 4**: Verify bug condition test passes after fix
5. ⏭️ **Task 5**: Verify preservation tests still pass after fix

## Technical Details

### Bug 2: Documents Panel Visibility
**File**: `components/bids/workspace/bid-workspace-client.tsx`  
**Line**: Right column rendering logic  
**Fix Required**: Ensure proper ternary operator usage for exclusive rendering

### Bug 3: Single Page Rendering
**File**: `components/bids/workspace/tender-doc-full-viewer.tsx`  
**Current Code**: `<Page pageNumber={pageNumber} />`  
**Fix Required**: 
```tsx
{Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
  <Page key={page} pageNumber={page} />
))}
```

### Bug 4: Scroll Isolation
**File**: `components/bids/workspace/tender-doc-full-viewer.tsx`  
**Current Code**: `useEffect` sets `document.body.style.overflow = "hidden"`  
**Fix Required**: 
1. Verify `useEffect` executes properly
2. Add `overflow-auto` to PDF container
3. Ensure scroll events don't propagate to parent

---

**Test Execution Log**: See test output above for detailed error messages and stack traces.
