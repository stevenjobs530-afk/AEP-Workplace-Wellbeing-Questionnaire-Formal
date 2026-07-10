const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const QUESTIONNAIRE_VERSION = "formal-2026-07-10-v1";
const COLLECTION_MODE = "test";
const MAX_BODY_BYTES = 50_000;

const allowedSituations = new Set(["student", "recent", "professional", "none"]);
const allowedGraduationYears = new Set([
  "2024 or earlier",
  "2025",
  "2026",
  "2027 or later",
  "Prefer not to say",
]);
const allowedEmploymentStatuses = new Set([
  "Not currently employed and looking for work",
  "Not currently employed and not currently looking for work",
  "Part-time work",
  "Internship / placement / temporary role",
  "Full-time work / graduate role",
  "Self-employed / freelance",
  "Prefer not to say",
  "Other",
]);
const allowedIndustries = new Set([
  "Business / Management / Consulting",
  "Finance / Accounting",
  "Technology / Data / Digital",
  "Marketing / HR / Operations",
  "Healthcare / Education / Public sector",
  "Prefer not to say",
  "Other / Not sure",
]);
const allowedCrossCulturalValues = new Set(["Yes", "No", "Maybe / not sure", "Prefer not to say"]);
const allowedAiImpactValues = new Set(["Not at all", "Slightly", "Moderately", "Significantly", "Not sure"]);
const allowedChallenges = new Set([
  "Workload and performance pressure",
  "Role clarity and professional identity transition",
  "Workplace connectedness and belonging",
  "Feedback and support from my line manager or supervisor",
  "Confidence and career uncertainty",
  "Feeling safe to ask questions, admit uncertainty, or raise concerns",
  "Financial pressure or living-cost pressure",
  "AI-related skill pressure or uncertainty",
  "Unclear expectations around appropriate AI use",
  "Cross-cultural communication or workplace norms",
  "Relocation, visa/right-to-work, or adapting to a new country",
  "Professional communication and workplace conduct",
  "Job-search pressure, recruitment competition, or lack of feedback from employers",
  "Other",
]);
const allowedReasons = new Set([
  "Limited personal preparation or experience",
  "Information gap between education and the workplace",
  "Insufficient organisational support",
  "Unclear manager communication or feedback",
  "Work design or workload issues",
  "Team culture or interpersonal relationship issues",
  "Financial pressure or changes in living arrangements",
  "Rapid technological change or unclear AI expectations",
  "Limited guidance on using AI appropriately",
  "Cultural differences, language, or communication style",
  "Relocation or international mobility pressures",
  "Limited work experience, internships, or exposure to professional settings",
  "Stress from the recruitment process, repeated applications, rejection, waiting, or limited employer feedback",
  "Other",
]);
const allowedSupportOptions = new Set([
  "Clear and structured onboarding",
  "Regular manager check-ins",
  "Timely, specific, and actionable feedback",
  "Mentoring or buddy system",
  "Coaching or transition support",
  "Career development guidance",
  "Peer support / early-career community",
  "Workload management or reasonable workload planning",
  "Mental health / wellbeing resources",
  "Flexible working",
  "Clearer explanation of progression, performance, salary, role location, and expectations",
  "Clear guidance and training on responsible AI use in recruitment and workplace tasks",
  "Career readiness and recruitment-process support, including applications, interviews, assessment centres, feedback, pre-joining communication, and workplace expectations",
  "Professional communication and workplace norms training",
  "Cross-cultural mentoring or international transition support",
  "Relocation, visa/right-to-work, or living-cost guidance",
  "Manager training on supporting early-career employees across cultures and AI-changing roles",
  "Structured face-to-face induction or community-building sessions",
  "Other, please specify",
]);
const allowedSupportRanks = new Set([
  "Clear onboarding, role expectations, and workplace norms",
  "Regular manager check-ins and actionable feedback",
  "Mentoring, buddy system, coaching, or transition support",
  "Career readiness and job-search support",
  "Responsible AI guidance and digital skills support",
  "Cross-cultural adjustment and relocation support",
  "Accessible wellbeing support with clear confidentiality",
  "Peer community and workplace connectedness",
]);

type UnknownRecord = Record<string, unknown>;

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  if (origin === "https://stevenjobs530-afk.github.io") return true;

  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function jsonResponse(origin: string | null, status: number, body: UnknownRecord) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_TEXT_FIELD");
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new Error("TEXT_FIELD_TOO_LONG");
  return trimmed;
}

function optionalEnum(value: unknown, allowed: Set<string>) {
  const text = nullableText(value, 240);
  if (text === null) return null;
  if (!allowed.has(text)) throw new Error("INVALID_OPTION");
  return text;
}

function stringArray(value: unknown, maxItems: number, maxItemLength = 240) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error("INVALID_MULTISELECT");
  const items = value.map((item) => {
    if (typeof item !== "string") throw new Error("INVALID_MULTISELECT");
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > maxItemLength) throw new Error("INVALID_MULTISELECT");
    return trimmed;
  });
  if (new Set(items).size !== items.length) throw new Error("DUPLICATE_MULTISELECT");
  return items;
}

function allowedStringArray(value: unknown, maxItems: number, allowed: Set<string>) {
  const items = stringArray(value, maxItems);
  if (items.some((item) => !allowed.has(item))) throw new Error("INVALID_MULTISELECT_OPTION");
  return items;
}

function validateRatings(value: unknown, prefix: "B1" | "B2" | "D3", count: number) {
  if (!isRecord(value)) throw new Error("INVALID_RATINGS");
  const result: Record<string, number | string> = {};
  for (const [key, rating] of Object.entries(value)) {
    const match = key.match(new RegExp(`^${prefix}_(\\d+)$`));
    if (!match) throw new Error("INVALID_RATING_KEY");
    const itemNumber = Number(match[1]);
    if (!Number.isInteger(itemNumber) || itemNumber < 1 || itemNumber > count) {
      throw new Error("INVALID_RATING_KEY");
    }
    if (rating === "N/A") {
      if ((prefix !== "B1" && prefix !== "B2") || (itemNumber !== 12 && itemNumber !== 13)) {
        throw new Error("INVALID_NA_RATING");
      }
      result[key] = rating;
      continue;
    }
    const numericRating = typeof rating === "number" ? rating : Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new Error("INVALID_RATING_VALUE");
    }
    result[key] = numericRating;
  }
  return result;
}

function expectedRoute(situation: string) {
  if (situation === "student" || situation === "recent") return "b1";
  if (situation === "professional") return "b2";
  return "open";
}

function validatePayload(payload: unknown) {
  if (!isRecord(payload)) throw new Error("INVALID_PAYLOAD");
  if (payload.website) throw new Error("BOT_FIELD_PRESENT");
  if (payload.questionnaire_version !== QUESTIONNAIRE_VERSION) throw new Error("INVALID_VERSION");
  if (payload.collection_mode !== COLLECTION_MODE) throw new Error("INVALID_COLLECTION_MODE");
  if (payload.consented !== true) throw new Error("CONSENT_REQUIRED");
  if (typeof payload.client_submission_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.client_submission_id)) {
    throw new Error("INVALID_SUBMISSION_ID");
  }
  if (typeof payload.situation !== "string" || !allowedSituations.has(payload.situation)) {
    throw new Error("INVALID_SITUATION");
  }
  if (payload.route !== expectedRoute(payload.situation)) throw new Error("INVALID_ROUTE");

  const industries = allowedStringArray(payload.industries, 7, allowedIndustries);
  const challenges = allowedStringArray(payload.challenges, 3, allowedChallenges);
  const reasons = allowedStringArray(payload.reasons, 14, allowedReasons);
  const supportOptions = allowedStringArray(payload.support_options, 5, allowedSupportOptions);
  const supportRanks = [payload.support_rank_1, payload.support_rank_2, payload.support_rank_3]
    .map((value) => optionalEnum(value, allowedSupportRanks));
  const selectedSupportRanks = supportRanks.filter((value): value is string => value !== null);
  if (new Set(selectedSupportRanks).size !== selectedSupportRanks.length) throw new Error("DUPLICATE_SUPPORT_RANK");

  const b1Ratings = validateRatings(payload.b1_ratings ?? {}, "B1", 15);
  const b2Ratings = validateRatings(payload.b2_ratings ?? {}, "B2", 15);
  const d3Ratings = validateRatings(payload.d3_ratings ?? {}, "D3", 9);
  const route = expectedRoute(payload.situation);
  if (route !== "b1" && Object.keys(b1Ratings).length > 0) throw new Error("UNEXPECTED_B1_RATINGS");
  if (route !== "b2" && Object.keys(b2Ratings).length > 0) throw new Error("UNEXPECTED_B2_RATINGS");
  if (route === "open" && Object.keys(d3Ratings).length > 0) throw new Error("UNEXPECTED_D3_RATINGS");

  const employmentStatus = optionalEnum(payload.employment_status, allowedEmploymentStatuses);
  const hasOtherIndustry = industries.includes("Other / Not sure");
  const hasOtherChallenge = challenges.includes("Other");
  const hasOtherReason = reasons.includes("Other");
  const hasOtherSupport = supportOptions.includes("Other, please specify");

  return {
    client_submission_id: payload.client_submission_id,
    questionnaire_version: QUESTIONNAIRE_VERSION,
    schema_version: 1,
    collection_mode: COLLECTION_MODE,
    consented: true,
    situation: payload.situation,
    route,
    graduation_year: optionalEnum(payload.graduation_year, allowedGraduationYears),
    employment_status: employmentStatus,
    employment_other: employmentStatus === "Other" ? nullableText(payload.employment_other, 240) : null,
    industries,
    industry_other: hasOtherIndustry ? nullableText(payload.industry_other, 240) : null,
    cross_cultural_transition: optionalEnum(payload.cross_cultural_transition, allowedCrossCulturalValues),
    ai_expected_impact: optionalEnum(payload.ai_expected_impact, allowedAiImpactValues),
    b1_ratings: b1Ratings,
    b2_ratings: b2Ratings,
    challenges,
    challenge_other: hasOtherChallenge ? nullableText(payload.challenge_other, 240) : null,
    challenge_explanation: nullableText(payload.challenge_explanation, 4000),
    reasons,
    reason_other: hasOtherReason ? nullableText(payload.reason_other, 240) : null,
    support_options: supportOptions,
    support_other: hasOtherSupport ? nullableText(payload.support_other, 240) : null,
    support_rank_1: supportRanks[0] ?? null,
    support_rank_2: supportRanks[1] ?? null,
    support_rank_3: supportRanks[2] ?? null,
    d3_ratings: d3Ratings,
    useful_support: nullableText(payload.useful_support, 4000),
    mentoring_support: nullableText(payload.mentoring_support, 4000),
    employer_understanding: nullableText(payload.employer_understanding, 4000),
    final_comments: nullableText(payload.final_comments, 4000),
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) return jsonResponse(origin, 403, { ok: false, error: "ORIGIN_NOT_ALLOWED" });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(origin, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse(origin, 415, { ok: false, error: "JSON_REQUIRED" });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(origin, 503, { ok: false, error: "SUBMISSION_SERVICE_UNAVAILABLE" });
  }

  try {
    const bodyText = await request.text();
    if (!bodyText || new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return jsonResponse(origin, 413, { ok: false, error: "PAYLOAD_TOO_LARGE" });
    }
    const row = validatePayload(JSON.parse(bodyText));
    const databaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/aep_questionnaire_responses`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (databaseResponse.status === 409) {
      return jsonResponse(origin, 200, {
        ok: true,
        reference: row.client_submission_id.slice(0, 8),
        duplicate: true,
      });
    }
    if (!databaseResponse.ok) {
      console.error("Questionnaire insert failed", databaseResponse.status);
      return jsonResponse(origin, 500, { ok: false, error: "SUBMISSION_NOT_SAVED" });
    }

    return jsonResponse(origin, 201, {
      ok: true,
      reference: row.client_submission_id.slice(0, 8),
      duplicate: false,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_SUBMISSION";
    if (code === "Unexpected end of JSON input" || code.startsWith("Unexpected token")) {
      return jsonResponse(origin, 400, { ok: false, error: "INVALID_JSON" });
    }
    return jsonResponse(origin, 400, { ok: false, error: code });
  }
});
