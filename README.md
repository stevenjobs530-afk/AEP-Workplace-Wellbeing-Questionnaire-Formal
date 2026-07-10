# AEP Workplace Wellbeing Questionnaire Formal

Formal questionnaire with a first-round Supabase backend integration.

- Public page: <https://stevenjobs530-afk.github.io/AEP-Workplace-Wellbeing-Questionnaire-Formal/>
- Source file: `index.html`
- Status: backend integration test only; not enabled for live research collection
- Storage/submission: dedicated AEP Supabase project with a validated Edge
  Function and an RLS-protected table

## Backend structure

- `supabase/migrations/`: the versioned questionnaire response table
- `supabase/functions/submit-aep-questionnaire/`: validated test-only submission endpoint
- `supabase/export/questionnaire_export_v1.sql`: flattened CSV-ready export query
- `supabase/export/questionnaire_integrity_check.sql`: pre-export row and constraint checks
- `BACKEND.md`: architecture, verified test evidence, and the live-release checklist

The response table grants no access to `anon` or `authenticated`. The public
questionnaire can only submit through the Edge Function, which currently accepts
`collection_mode = test` and rejects live research submissions. Do not change the
mode to `live` until the final participant-facing wording, storage plan, abuse
protection, and OREMS alignment have been confirmed.

No service-role or secret key belongs in this repository. Supabase injects the
server-side credential into the deployed Edge Function environment.

The questionnaire backend is isolated in the Supabase project
`AEP Workplace Wellbeing Questionnaire` (`yxhsrqfyxgcaikqnovrr`). It does not
share its database with the Personal Training application.
