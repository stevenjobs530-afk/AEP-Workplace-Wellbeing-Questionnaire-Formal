# AEP questionnaire backend

This repository currently contains a first-round, test-only Supabase integration.
It is deliberately not a live research collection system yet.

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
   `collection_mode = test`.

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

## First-round verification completed

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
- CORS preflight from the local test origin: HTTP 204.
- Missing consent: rejected with HTTP 400.
- `collection_mode = live`: rejected with HTTP 400.
- Browser student/B1 submission: stored successfully with ratings, `N/A`,
  multi-select values, ranking, and open text.
- Professional/B2 submission: stored successfully.
- Duplicate retry: returned success without adding a second row.
- `None of the above` route: stored E1 open text while keeping skipped sections
  empty.
- Consent refusal: reached the exit screen without creating a database row.
- Integrity query: zero duplicate IDs, invalid consent rows, invalid routes, and
  selection-limit violations.
- Live export query: zero rows, proving test data is excluded.

## Export

Run `supabase/export/questionnaire_integrity_check.sql` first. Then run
`supabase/export/questionnaire_export_v1.sql` in the Supabase SQL Editor and
download the result grid as CSV. The export query flattens Likert JSON values
into one column per item and joins multi-select arrays with ` | `.

Keep the raw CSV immutable. Create any cleaned Excel workbook as a separate
analysis copy, and store both only in the research storage location approved by
the project data-management and ethics process.

## Required before live collection

1. Confirm that the final participant information, consent wording, retention
   plan, Supabase processor/region, and export storage match the OREMS approval.
2. Keep the dedicated AEP Supabase project and its administrator access separate
   from unrelated personal applications.
3. Add production-grade bot and rate-limit protection, such as Turnstile, before
   accepting a publicly distributed survey link.
4. Remove local test origins from the Edge Function allowlist.
5. Change both the frontend and Edge Function to `collection_mode = live` in a
   reviewed release; never enable only one side.
6. Clear or archive all test records, rerun the integrity query, submit a final
   canary response, verify the CSV export, and then open recruitment.
