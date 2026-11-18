# Approved sources and article access

ATLAS currently approves 74 publisher/institution entries. The exact domain list and policy explanations live in lib/search-policy.mjs; the UI directory reads that same list. New coverage includes Philippine policy/statistics sources, international development and UN agencies, Asia-Pacific policy research, open-access academic publishers and international public-broadcaster reporting.

## Access behavior

Search defaults to Free sources & open access. This keeps records with explicit open-access metadata and publishers/institutions whose public content is normally available without a paid subscription. It excludes mixed-access results unless the specific record has open-access metadata. All access types remains available as an explicit choice.

- Open access: a catalog supplies an approved open-access destination or a current Creative Commons publication license. This is metadata, not a live guarantee of access.
- Usually free: a publisher with public content. Some pages may still request a free account or impose regional restrictions.
- Access unverified: mixed-access publisher without article-level OA metadata.
- Restricted: explicit access-gate text was found; omitted by the default filter.

Inclusion identifies an approved institution or publisher, not neutrality, peer review of every item, or correctness of every claim. Government statements reflect their issuers' positions; research analysis, journal articles and news commentary remain distinct.

## Actual discovery

The search merges executed browser-search records with official GOV.UK and World Bank APIs, Crossref metadata, OpenAlex open-access locations, and current BBC, Al Jazeera, Guardian, DW, France 24, RNZ and UN News feeds. Feed coverage is recent reporting, not a historical archive. Adapters fail independently and the UI reports unavailable providers. Cited web discovery asks for up to 10 original relevant sources; up to 80 approved matches can be paginated per search window. Counts are retrieved matches, not a count of the whole web.

OpenAlex's optional OPENALEX_API_KEY can increase its allowance. A key is not required for basic requests; provider quotas and availability still apply. The app selects approved open-access locations, rather than linking to a closed primary page merely because an open copy exists elsewhere. An unapproved mirror is never substituted.

Structured paywall markers and explicit subscription/sign-in gates are rejected by the study-text reader. ATLAS does not bypass paywalls or treat preview text as a full article. Publisher access policies can change, so original pages remain the final access check.

References: [OpenAlex API](https://help.openalex.org/api/), [ADB free publication downloads](https://www.adb.org/publications/catalog), [PIDS publications](https://www.pids.gov.ph/content/publication/), [PLOS open science policies](https://plos.org/open-science-policies/).
