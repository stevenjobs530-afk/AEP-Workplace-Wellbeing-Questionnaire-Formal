-- Run before every export. All duplicate/invalid counters should be zero.
select
  count(*) as total_rows,
  count(*) filter (where collection_mode = 'test') as test_rows,
  count(*) filter (where collection_mode = 'live') as live_rows,
  count(distinct client_submission_id) as unique_client_submission_ids,
  count(*) - count(distinct client_submission_id) as duplicate_client_submission_ids,
  count(*) filter (where consented is not true) as invalid_consent_rows,
  count(*) filter (where situation in ('student', 'recent') and route <> 'b1')
    + count(*) filter (where situation = 'professional' and route <> 'b2')
    + count(*) filter (where situation = 'none' and route <> 'open') as invalid_route_rows,
  count(*) filter (where cardinality(challenges) > 3) as invalid_challenge_limit_rows,
  count(*) filter (where cardinality(support_options) > 5) as invalid_support_limit_rows
from public.aep_questionnaire_responses;
