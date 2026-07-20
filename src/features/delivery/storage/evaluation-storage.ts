import { createHash, randomBytes } from "node:crypto";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scopeAppData, withAppScope } from "@/lib/request-scope";
import {
  normalizeEvaluationForm,
  normalizeEvaluationResponse,
  type EvaluationAnswerValue,
  type EvaluationForm,
  type EvaluationFormInput,
  type EvaluationFormStatus,
  type EvaluationFormType,
  type EvaluationQuestion,
  type EvaluationResponse,
} from "@/features/delivery/domain/evaluation-form";

type EvaluationFormRow = {
  id: string;
  delivery_project_id: string;
  form_type: EvaluationFormType | null;
  title: string;
  intro: string | null;
  status: EvaluationFormStatus | null;
  questions: Array<Partial<EvaluationQuestion>> | null;
  access_token_hash: string | null;
  created_at: string;
  updated_at: string;
};

type EvaluationResponseRow = {
  id: string;
  form_id: string;
  respondent_name: string | null;
  answers: Record<string, EvaluationAnswerValue> | null;
  created_at: string;
};

export function createEvaluationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEvaluationToken(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

function formFromRow(row: EvaluationFormRow): EvaluationForm {
  return normalizeEvaluationForm({
    id: row.id,
    deliveryProjectId: row.delivery_project_id,
    formType: row.form_type ?? "post_training",
    title: row.title,
    intro: row.intro ?? "",
    status: row.status ?? "Draft",
    questions: row.questions ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function responseFromRow(row: EvaluationResponseRow): EvaluationResponse {
  return normalizeEvaluationResponse({
    id: row.id,
    formId: row.form_id,
    respondentName: row.respondent_name ?? "",
    answers: row.answers ?? {},
    createdAt: row.created_at,
  });
}

function requireSupabase() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is required for evaluation forms.");
  }

  return supabase;
}

export async function getEvaluationFormByDelivery(
  deliveryProjectId: string,
  formType: EvaluationFormType = "post_training",
) {
  const supabase = requireSupabase();

  const { data, error } = await scopeAppData(
    supabase
      .from("evaluation_forms")
      .select("*")
      .eq("delivery_project_id", deliveryProjectId)
      .eq("form_type", formType)
      .limit(1),
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = (data as EvaluationFormRow[])[0];
  return row ? formFromRow(row) : null;
}

export async function saveEvaluationForm(input: EvaluationFormInput) {
  const form = normalizeEvaluationForm({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  if (!form.deliveryProjectId) {
    throw new Error("An evaluation form requires a delivery project.");
  }

  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("evaluation_forms")
    .upsert(
      withAppScope({
        id: form.id,
        delivery_project_id: form.deliveryProjectId,
        form_type: form.formType,
        title: form.title,
        intro: form.intro,
        status: form.status,
        questions: form.questions,
        created_at: form.createdAt,
        updated_at: form.updatedAt,
      }),
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return formFromRow(data as EvaluationFormRow);
}

export async function openEvaluationForm(formId: string) {
  const supabase = requireSupabase();
  const token = createEvaluationToken();

  const { data, error } = await scopeAppData(
    supabase
      .from("evaluation_forms")
      .update({
        status: "Open",
        access_token_hash: hashEvaluationToken(token),
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId)
      .select("*"),
  ).single();

  if (error) {
    throw new Error(error.message);
  }

  return { form: formFromRow(data as EvaluationFormRow), token };
}

export async function closeEvaluationForm(formId: string) {
  const supabase = requireSupabase();

  const { data, error } = await scopeAppData(
    supabase
      .from("evaluation_forms")
      .update({ status: "Closed", updated_at: new Date().toISOString() })
      .eq("id", formId)
      .select("*"),
  ).single();

  if (error) {
    throw new Error(error.message);
  }

  return formFromRow(data as EvaluationFormRow);
}

export async function getOpenEvaluationFormByToken(token: string) {
  const supabase = requireSupabase();
  const tokenHash = hashEvaluationToken(token);

  if (!token.trim()) {
    return null;
  }

  const { data, error } = await scopeAppData(
    supabase
      .from("evaluation_forms")
      .select("*")
      .eq("access_token_hash", tokenHash)
      .eq("status", "Open")
      .limit(1),
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = (data as EvaluationFormRow[])[0];
  return row ? formFromRow(row) : null;
}

export async function saveEvaluationResponse(input: Partial<EvaluationResponse>) {
  const response = normalizeEvaluationResponse(input);

  if (!response.formId) {
    throw new Error("An evaluation response requires a form.");
  }

  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("evaluation_responses")
    .insert(
      withAppScope({
        id: response.id,
        form_id: response.formId,
        respondent_name: response.respondentName,
        answers: response.answers,
        created_at: response.createdAt,
      }),
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return responseFromRow(data as EvaluationResponseRow);
}

export async function listEvaluationResponses(formId: string) {
  const supabase = requireSupabase();

  const { data, error } = await scopeAppData(
    supabase
      .from("evaluation_responses")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: true }),
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data as EvaluationResponseRow[]).map(responseFromRow);
}
