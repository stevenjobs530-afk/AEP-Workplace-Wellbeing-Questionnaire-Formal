# AEP Workplace Wellbeing Questionnaire Formal

Formal questionnaire with a dedicated Supabase backend.

- Public page: <https://stevenjobs530-afk.github.io/AEP-Workplace-Wellbeing-Questionnaire-Formal/>
- Source file: `index.html`
- Status: live questionnaire collection enabled
- Storage/submission: dedicated AEP Supabase project with a validated Edge
  Function and an RLS-protected table

## Backend structure

- `supabase/migrations/`: the versioned questionnaire response table
- `supabase/functions/submit-aep-questionnaire/`: validated live submission endpoint
- `supabase/export/questionnaire_export_v1.sql`: flattened CSV-ready export query
- `supabase/export/questionnaire_integrity_check.sql`: pre-export row and constraint checks
- `BACKEND.md`: architecture, release evidence, and operational checklist

The response table grants no access to `anon` or `authenticated`. The public
questionnaire can only submit through the Edge Function, which currently accepts
`collection_mode = live`. Test records remain separated from live research data.

No service-role or secret key belongs in this repository. Supabase injects the
server-side credential into the deployed Edge Function environment.

The questionnaire backend is isolated in the Supabase project
`AEP Workplace Wellbeing Questionnaire` (`yxhsrqfyxgcaikqnovrr`). It does not
share its database with the Personal Training application.
