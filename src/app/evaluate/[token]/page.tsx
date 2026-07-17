import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EvaluationFillForm } from "@/app/evaluate/_components/evaluation-fill-form";
import { getOpenEvaluationFormByToken } from "@/features/delivery/storage/evaluation-storage";

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const form = await getOpenEvaluationFormByToken(token).catch(() => null);

  if (!form) {
    return (
      <Card className="mx-auto mt-12 max-w-xl">
        <CardHeader>
          <CardTitle>Evaluation not available</CardTitle>
          <CardDescription className="mt-2">
            This evaluation form is closed or the link is no longer valid.
            Please contact your DG Academy training coordinator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <EvaluationFillForm
      token={token}
      form={{ title: form.title, intro: form.intro, questions: form.questions }}
    />
  );
}
