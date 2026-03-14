-- Fix broken EJN portal URLs: old www.ejn.gov.ba/Notice/ is deprecated
-- New portal is at next.ejn.gov.ba with Bosnian language prefix

-- Step 1: Fix old format (www.ejn.gov.ba/Notice/{id})
UPDATE tenders
SET portal_url = 'https://next.ejn.gov.ba/bs/procedures/' || 
  SUBSTRING(portal_url FROM 'https://www\.ejn\.gov\.ba/Notice/(\d+)') || '/overview'
WHERE portal_url LIKE 'https://www.ejn.gov.ba/Notice/%';

-- Step 2: Fix intermediate format (next.ejn.gov.ba/advertisement/procurement/{id})
UPDATE tenders
SET portal_url = 'https://next.ejn.gov.ba/bs/procedures/' || 
  SUBSTRING(portal_url FROM 'https://next\.ejn\.gov\.ba/advertisement/procurement/(\d+)') || '/overview'
WHERE portal_url LIKE 'https://next.ejn.gov.ba/advertisement/procurement/%';
