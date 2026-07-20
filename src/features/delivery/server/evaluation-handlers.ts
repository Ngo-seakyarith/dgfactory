import { NextResponse } from "next/server";

import { saveAuditLog } from "@/lib/audit";
import { routeBrainTask } from "@/lib/brain/routing/router";
import type {
  EvaluationQuestionsBrainInput,
  EvaluationQuestionsBrainOutput,
} from "@/lib/brain/agents";
import { requireApproved } from "@/lib/route-guards";
import { getTrainingPackage } from "@/features/training-packages/storage/training-storage";
import { getDeliveryProject } from "@/features/delivery/storage/delivery-storage";
import { packageGenerationContext } from "@/features/delivery/server/package-generation-context";
import {
  closeEvaluationForm,
  getEvaluationFormByDelivery,
  getOpenEvaluationFormByToken,
  listEvaluationResponses,
  openEvaluationForm,
  saveEvaluationForm,
  saveEvaluationResponse,
} from "@/features/delivery/storage/evaluation-storage";
import {
  createDefaultEvaluationForm,
  isEvaluationFormType,
  normalizeEvaluationForm,
  summarizeEvaluationResponses,
  validateEvaluationAnswers,
  type EvaluationForm,
  type EvaluationFormInput,
  type EvaluationFormType,
} from "@/features/delivery/domain/evaluation-form";

type DeliveryRouteContext = {
  params: Promise<{ id: string }>;
};

type TokenRouteContext = {
  params: Promise<{ token: string }>;
};

function friendlyError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formTypeFromRequest(request: Request): EvaluationFormType {
  const type = new URL(request.url).searchParams.get("type");
  return isEvaluationFormType(type) ? type : "post_training";
}

function evaluationLink(request: Request, token: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  const origin = configured || new URL(request.url).origin;
  return `${origin}/evaluate/${token}`;
}

function publicFormShape(form: EvaluationForm) {
  return {
    title: form.title,
    intro: form.intro,
    questions: form.questions,
  };
}

export async function getDeliveryEvaluationHandler(
  request: Request,
  context: DeliveryRouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const form = await getEvaluationFormByDelivery(id, formTypeFromRequest(request));

    if (!form) {
      return NextResponse.json({ form: null, responses: [], summary: null });
    }

    const responses = await listEvaluationResponses(form.id);
    return NextResponse.json({
      form,
      responses,
      summary: summarizeEvaluationResponses(form, responses),
    });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation form request failed.") },
      { status: 500 },
    );
  }
}

export async function saveDeliveryEvaluationFormHandler(
  request: Request,
  context: DeliveryRouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const formType = formTypeFromRequest(request);
    const body = (await request.json()) as { form?: EvaluationFormInput };
    const existing = await getEvaluationFormByDelivery(id, formType);
    const form = await saveEvaluationForm(
      normalizeEvaluationForm({
        ...(body.form ?? {}),
        id: existing?.id ?? body.form?.id,
        deliveryProjectId: id,
        formType,
        status: existing?.status ?? "Draft",
        createdAt: existing?.createdAt,
      }),
    );

    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation form save failed.") },
      { status: 500 },
    );
  }
}

export async function generateDeliveryEvaluationQuestionsHandler(
  request: Request,
  context: DeliveryRouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const formType = formTypeFromRequest(request);
    const project = await getDeliveryProject(id);
    if (!project.packageId) {
      throw new Error(
        "A linked saved package is required before generating assessment or evaluation questions.",
      );
    }
    const trainingPackage = await getTrainingPackage(project.packageId);
    const packageContext = packageGenerationContext(trainingPackage);

    const input: EvaluationQuestionsBrainInput = {
      purpose:
        formType === "pre_training"
          ? "pre_training_assessment"
          : "post_training_evaluation",
      ...packageContext,
    };

    const result = await routeBrainTask<
      EvaluationQuestionsBrainInput,
      EvaluationQuestionsBrainOutput
    >({
      taskType: "evaluation_questions",
      input,
      retries: 2,
    });

    const existing = await getEvaluationFormByDelivery(id, formType);
    const base =
      existing ?? createDefaultEvaluationForm(id, input.courseTitle, formType);
    const form = await saveEvaluationForm({
      ...base,
      questions: result.output.questions.map((question) => ({
        ...question,
        required: question.required ?? question.type !== "text",
      })),
    });

    await saveAuditLog({
      actor: auth.user.actor,
      action: "evaluation_questions_generated",
      entityType: "evaluation_form",
      entityId: form.id,
      metadata: {
        deliveryProjectId: id,
        formType,
        questionCount: form.questions.length,
        model: result.model,
      },
    });

    return NextResponse.json({
      form,
      mode: result.mode,
      model: result.model,
      notice: result.notice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation question generation failed.") },
      { status: 500 },
    );
  }
}

export async function openDeliveryEvaluationFormHandler(
  request: Request,
  context: DeliveryRouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const existing = await getEvaluationFormByDelivery(id, formTypeFromRequest(request));

    if (!existing || existing.questions.length === 0) {
      return NextResponse.json(
        { error: "Add at least one question before opening the form." },
        { status: 400 },
      );
    }

    const { form, token } = await openEvaluationForm(existing.id);

    await saveAuditLog({
      actor: auth.user.actor,
      action: "evaluation_form_opened",
      entityType: "evaluation_form",
      entityId: form.id,
      metadata: { deliveryProjectId: id, title: form.title },
    });

    return NextResponse.json({ form, link: evaluationLink(request, token) });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation form could not be opened.") },
      { status: 500 },
    );
  }
}

export async function closeDeliveryEvaluationFormHandler(
  request: Request,
  context: DeliveryRouteContext,
) {
  const auth = await requireApproved(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const existing = await getEvaluationFormByDelivery(id, formTypeFromRequest(request));

    if (!existing) {
      return NextResponse.json(
        { error: "There is no evaluation form for this delivery." },
        { status: 404 },
      );
    }

    const form = await closeEvaluationForm(existing.id);

    await saveAuditLog({
      actor: auth.user.actor,
      action: "evaluation_form_closed",
      entityType: "evaluation_form",
      entityId: form.id,
      metadata: { deliveryProjectId: id, title: form.title },
    });

    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation form could not be closed.") },
      { status: 500 },
    );
  }
}

export async function getPublicEvaluationFormHandler(
  _request: Request,
  context: TokenRouteContext,
) {
  try {
    const { token } = await context.params;
    const form = await getOpenEvaluationFormByToken(token);

    if (!form) {
      return NextResponse.json(
        { error: "This evaluation form is not available." },
        { status: 404 },
      );
    }

    return NextResponse.json({ form: publicFormShape(form) });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation form request failed.") },
      { status: 500 },
    );
  }
}

export async function submitPublicEvaluationResponseHandler(
  request: Request,
  context: TokenRouteContext,
) {
  try {
    const { token } = await context.params;
    const form = await getOpenEvaluationFormByToken(token);

    if (!form) {
      return NextResponse.json(
        { error: "This evaluation form is no longer accepting responses." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      respondentName?: string;
      answers?: Record<string, unknown>;
    };
    const { answers, errors } = validateEvaluationAnswers(
      form,
      body.answers ?? {},
    );

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    if (Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "Answer at least one question before submitting." },
        { status: 400 },
      );
    }

    const response = await saveEvaluationResponse({
      formId: form.id,
      respondentName: body.respondentName ?? "",
      answers,
    });

    await saveAuditLog({
      actor: "evaluation_participant",
      action: "evaluation_response_submitted",
      entityType: "evaluation_form",
      entityId: form.id,
      metadata: { responseId: response.id },
    });

    return NextResponse.json({ submitted: true });
  } catch (error) {
    return NextResponse.json(
      { error: friendlyError(error, "Evaluation response could not be saved.") },
      { status: 500 },
    );
  }
}
