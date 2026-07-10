create table if not exists public.aep_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  questionnaire_version text not null,
  schema_version smallint not null default 1,
  collection_mode text not null default 'test',
  submitted_at timestamptz not null default now(),
  consented boolean not null,
  situation text not null,
  route text not null,
  graduation_year text,
  employment_status text,
  employment_other text,
  industries text[] not null default '{}',
  industry_other text,
  cross_cultural_transition text,
  ai_expected_impact text,
  b1_ratings jsonb not null default '{}'::jsonb,
  b2_ratings jsonb not null default '{}'::jsonb,
  challenges text[] not null default '{}',
  challenge_other text,
  challenge_explanation text,
  reasons text[] not null default '{}',
  reason_other text,
  support_options text[] not null default '{}',
  support_other text,
  support_rank_1 text,
  support_rank_2 text,
  support_rank_3 text,
  d3_ratings jsonb not null default '{}'::jsonb,
  useful_support text,
  mentoring_support text,
  employer_understanding text,
  final_comments text,
  constraint aep_questionnaire_consent_required check (consented is true),
  constraint aep_questionnaire_schema_version_check check (schema_version = 1),
  constraint aep_questionnaire_collection_mode_check check (collection_mode in ('test', 'live')),
  constraint aep_questionnaire_situation_check check (situation in ('student', 'recent', 'professional', 'none')),
  constraint aep_questionnaire_route_check check (
    (situation in ('student', 'recent') and route = 'b1')
    or (situation = 'professional' and route = 'b2')
    or (situation = 'none' and route = 'open')
  ),
  constraint aep_questionnaire_version_length_check check (char_length(questionnaire_version) between 1 and 80),
  constraint aep_questionnaire_industries_limit check (cardinality(industries) <= 7),
  constraint aep_questionnaire_challenges_limit check (cardinality(challenges) <= 3),
  constraint aep_questionnaire_support_limit check (cardinality(support_options) <= 5),
  constraint aep_questionnaire_b1_ratings_object check (jsonb_typeof(b1_ratings) = 'object'),
  constraint aep_questionnaire_b2_ratings_object check (jsonb_typeof(b2_ratings) = 'object'),
  constraint aep_questionnaire_d3_ratings_object check (jsonb_typeof(d3_ratings) = 'object'),
  constraint aep_questionnaire_employment_other_length check (employment_other is null or char_length(employment_other) <= 240),
  constraint aep_questionnaire_industry_other_length check (industry_other is null or char_length(industry_other) <= 240),
  constraint aep_questionnaire_challenge_other_length check (challenge_other is null or char_length(challenge_other) <= 240),
  constraint aep_questionnaire_reason_other_length check (reason_other is null or char_length(reason_other) <= 240),
  constraint aep_questionnaire_support_other_length check (support_other is null or char_length(support_other) <= 240),
  constraint aep_questionnaire_challenge_explanation_length check (challenge_explanation is null or char_length(challenge_explanation) <= 4000),
  constraint aep_questionnaire_useful_support_length check (useful_support is null or char_length(useful_support) <= 4000),
  constraint aep_questionnaire_mentoring_support_length check (mentoring_support is null or char_length(mentoring_support) <= 4000),
  constraint aep_questionnaire_employer_understanding_length check (employer_understanding is null or char_length(employer_understanding) <= 4000),
  constraint aep_questionnaire_final_comments_length check (final_comments is null or char_length(final_comments) <= 4000)
);

comment on table public.aep_questionnaire_responses is
  'AEP questionnaire submissions. Contains optional free-text research responses; access is restricted to project administrators.';

comment on column public.aep_questionnaire_responses.client_submission_id is
  'Random browser-generated UUID used for idempotent retries; it is not a participant identifier.';

comment on column public.aep_questionnaire_responses.collection_mode is
  'Separates test submissions from ethics-approved live research data.';

alter table public.aep_questionnaire_responses enable row level security;

revoke all on table public.aep_questionnaire_responses from anon, authenticated;
grant insert on table public.aep_questionnaire_responses to service_role;

-- Deliberately no anon/authenticated policies. The public questionnaire submits
-- through the validated Edge Function, and only trusted project administrators
-- can query or export the stored responses.
