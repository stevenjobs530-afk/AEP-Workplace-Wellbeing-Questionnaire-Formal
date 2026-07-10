# AEP questionnaire backend

This repository contains the live Supabase integration for the formal AEP
questionnaire.

The backend is hosted in the dedicated Supabase project
`AEP Workplace Wellbeing Questionnaire` (`yxhsrqfyxgcaikqnovrr`). The project is
separate from the Personal Training application and its data.

## Data flow

1. The static questionnaire serializes the active branch and optional responses.
2. The browser sends JSON to `submit-aep-questionnaire`.
3. The Edge Function checks origin, consent, questionnaire version, route,
   controlled options, Likert values, text lengths, selection limits, and a
   honeypot field.
4. The function inserts through its server-side service credential.
5. `public.aep_questionnaire_responses` stores the row with
   `collection_mode = live`.

The form never receives a service-role or secret key.

## Access boundary

- RLS is enabled on `public.aep_questionnaire_responses`.
- `anon` and `authenticated` have no table privileges.
- There are intentionally no public RLS policies. Supabase Advisor therefore
  reports `rls_enabled_no_policy` as informational; for this table that is the
  intended deny-by-default state.
- Only the Edge Function service role can insert through the Data API.
- Researchers export with an administrator account through the SQL Editor.
- No IP address, user agent, name, email address, or login identifier is stored.

## Data representation

- Single-choice answers are stored as controlled text values.
- Multi-select answers are stored as text arrays with server-side limits.
- Likert answers are stored as JSON objects using numeric values `1` to `5`;
  only the applicable cross-cultural items may store `N/A`.
- Optional open text is stored as nullable text and capped at 4,000 characters.
- A random `client_submission_id` makes retries idempotent. It is not a
  participant identifier and must not be used for participant profiling.

## Verification completed

- Dedicated-project migration preserved all three prior test rows; source and
  destination dataset fingerprints matched before the source table was removed.
- A new-project canary submission returned HTTP 201, and its retry returned
  success without adding a duplicate row.
- The Personal Training project no longer contains the AEP response table or
  any AEP response rows.
- The legacy Personal Training project function is an inert HTTP 410 migration
  tombstone with no database access; the active questionnaire endpoint exists
  only in the dedicated AEP project.
- Direct public `SELECT`: rejected with HTTP 401.
- Direct public `INSERT`: rejected with HTTP 401.
- CORS preflight from the GitHub Pages origin: HTTP 204.
- Missing consent: rejected with HTTP 400.
- `collection_mode = test`: rejected with HTTP 400 by the live endpoint.
- Pre-release live canary: stored once with HTTP 201, duplicate retry returned
  HTTP 200 without adding a second row, and the canary was removed afterward.
- Localhost origin: rejected with HTTP 403 after the production allowlist was
  restricted to the GitHub Pages host.
- Browser student/B1 submission: stored successfully with ratings, `N/A`,
  multi-select values, ranking, and open text.
- Professional/B2 submission: stored successfully.
- Duplicate retry: returned success without adding a second row.
- `None of the above` route: stored E1 open text while keeping skipped sections
  empty.
- Consent refusal: reached the exit screen without creating a database row.
- Integrity query: zero duplicate IDs, invalid consent rows, invalid routes, and
  selection-limit violations.
- Live export query includes only `collection_mode = live` rows and excludes
  the retained test records.

## Export

Run `supabase/export/questionnaire_integrity_check.sql` first. Then run
`supabase/export/questionnaire_export_v1.sql` in the Supabase SQL Editor and
download the result grid as CSV. The export query flattens Likert JSON values
into one column per item and joins multi-select arrays with ` | `.

Keep the raw CSV immutable. Create any cleaned Excel workbook as a separate
analysis copy, and store both only in the research storage location approved by
the project data-management and ethics process.

## Operational checklist

1. Confirm that the final participant information, consent wording, retention
   plan, Supabase processor/region, and export storage match the OREMS approval.
2. Keep the dedicated AEP Supabase project and its administrator access separate
   from unrelated personal applications.
3. Monitor submission volume and Edge Function logs during recruitment; add
   stronger bot protection such as Turnstile if traffic is opened more broadly
   or abuse is observed.
4. Keep the Edge Function origin allowlist restricted to the GitHub Pages host.
5. Keep the frontend and Edge Function on the same questionnaire and collection
   mode version.
6. Run the integrity query before every export and keep test records excluded
   from the live-data export.
