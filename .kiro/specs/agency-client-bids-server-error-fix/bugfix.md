# Bugfix Requirements Document

## Introduction

The /dashboard/agency/clients/[id]/bids page consistently throws a server-side exception during server-side rendering (SSR) in production on Vercel. The error occurs when agency users navigate to a client's "Ponude" (Bids) page in the dashboard. This is a critical bug that prevents agency users from accessing their clients' bids feature entirely.

The error digest (911343748) indicates a server-side exception during the page rendering process. Based on code analysis and similarity to the previous /dashboard/prilike bug, the likely causes are:

1. Null/undefined handling issues in the data fetching chain
2. Type mismatches in the bids query result when accessing nested tender data
3. Missing null checks when accessing nested tender properties
4. Potential issues with the normalization functions when handling array vs single object responses

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an agency user navigates to /dashboard/agency/clients/[id]/bids THEN the system throws a server-side exception with digest 911343748

1.2 WHEN the page attempts to render during SSR THEN the system fails to handle null or undefined values in the bids data fetching pipeline

1.3 WHEN the bids query returns rows with null or malformed tender relations THEN the system attempts to access properties on null objects causing runtime errors

1.4 WHEN the normalizeBidTender function processes tender data THEN the system may crash if the tender structure is unexpected or contains null values

1.5 WHEN the BidsTable component receives bid data THEN the system may fail if tender properties are accessed without proper null checks

### Expected Behavior (Correct)

2.1 WHEN an agency user navigates to /dashboard/agency/clients/[id]/bids THEN the system SHALL successfully render the page without throwing server-side exceptions

2.2 WHEN the page attempts to render during SSR THEN the system SHALL gracefully handle all null and undefined values in the bids data fetching pipeline

2.3 WHEN the bids query returns rows with null or malformed tender relations THEN the system SHALL safely normalize them and handle missing data gracefully

2.4 WHEN the normalizeBidTender function processes tender data THEN the system SHALL handle all edge cases (null, undefined, empty arrays, malformed objects) without crashing

2.5 WHEN the BidsTable component receives bid data THEN the system SHALL render successfully even when tender data is incomplete or missing

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an agency user has valid bids with complete tender data THEN the system SHALL CONTINUE TO display them correctly in the bids table

3.2 WHEN the NewBidModal is rendered THEN the system SHALL CONTINUE TO display available tenders for bid creation

3.3 WHEN bid status information is displayed THEN the system SHALL CONTINUE TO show the correct status for each bid

3.4 WHEN tender details are available THEN the system SHALL CONTINUE TO display tender title, contracting authority, and deadline correctly

3.5 WHEN the agency client lookup succeeds THEN the system SHALL CONTINUE TO display the client's company name in the page header

3.6 WHEN the user is not authorized (not an agency user or wrong client) THEN the system SHALL CONTINUE TO redirect or show not found appropriately

3.7 WHEN the AgencyClientBidsFallback component needs to be shown THEN the system SHALL CONTINUE TO display the error message and navigation options correctly
