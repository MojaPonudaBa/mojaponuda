# Bugfix Requirements Document

## Introduction

The /dashboard/prilike page consistently throws a server-side exception during server-side rendering (SSR) in production on Vercel. The error occurs when authenticated users navigate to the "Ponude" (Opportunities) page in the dashboard. This is a critical bug that prevents users from accessing the opportunities feature entirely.

The error digest (2639304102) indicates a server-side exception during the page rendering process. Based on code analysis, the likely causes are:

1. Null/undefined handling issues in the data fetching chain
2. Type mismatches in the opportunity_follows query result
3. Missing null checks when accessing nested opportunity data
4. Potential issues with the recommendation context building when company data is null

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user navigates to /dashboard/prilike THEN the system throws a server-side exception with digest 2639304102

1.2 WHEN the page attempts to render during SSR THEN the system fails to handle null or undefined values in the data fetching pipeline

1.3 WHEN opportunity_follows query returns rows with null opportunities THEN the system attempts to access properties on null objects causing runtime errors

1.4 WHEN company profile data is missing or null THEN the recommendation context builder may fail to handle undefined values properly

1.5 WHEN the getPersonalizedOpportunityRecommendations function processes company data THEN the system may crash if required fields are accessed without null checks

### Expected Behavior (Correct)

2.1 WHEN a user navigates to /dashboard/prilike THEN the system SHALL successfully render the page without throwing server-side exceptions

2.2 WHEN the page attempts to render during SSR THEN the system SHALL gracefully handle all null and undefined values in the data fetching pipeline

2.3 WHEN opportunity_follows query returns rows with null opportunities THEN the system SHALL filter them out before attempting to access their properties

2.4 WHEN company profile data is missing or null THEN the system SHALL provide safe default values and continue rendering

2.5 WHEN the getPersonalizedOpportunityRecommendations function processes company data THEN the system SHALL handle missing or null company data without crashing

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user has valid opportunity follows with complete data THEN the system SHALL CONTINUE TO display them correctly in the "Praćene prilike" section

3.2 WHEN personalized recommendations are available THEN the system SHALL CONTINUE TO display them in the "Poticaji za Vas" section

3.3 WHEN other opportunities are available THEN the system SHALL CONTINUE TO display them in the "Ostali poticaji" or "Svi poticaji" section

3.4 WHEN a user has resolved follows (won/lost) THEN the system SHALL CONTINUE TO display them in the "Arhiva prijava" section

3.5 WHEN the ProGate component needs to be shown THEN the system SHALL CONTINUE TO redirect unsubscribed users correctly

3.6 WHEN opportunity cards are rendered THEN the system SHALL CONTINUE TO display all opportunity details (title, issuer, deadline, location, value, difficulty) correctly

3.7 WHEN the recommendation algorithm processes valid company data THEN the system SHALL CONTINUE TO generate accurate personalized recommendations
