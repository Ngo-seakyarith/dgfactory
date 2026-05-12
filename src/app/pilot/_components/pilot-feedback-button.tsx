"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquareText, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { pilotUrgencies, type PilotUrgency } from "@/lib/pilot";

const initialFeedback = {
  rating: 4,
  whatWorked: "",
  whatWasConfusing: "",
  whatShouldImprove: "",
  urgency: "Medium" as PilotUrgency,
  relatedFeature: "Pilot dashboard",
  relatedPage: "/pilot",
  createdBy: "",
};

export function PilotFeedbackButton({
  relatedPage,
  relatedFeature,
  relatedPackageId,
  relatedOpportunityId,
}: {
  relatedPage: string;
  relatedFeature: string;
  relatedPackageId?: string;
  relatedOpportunityId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState({
    ...initialFeedback,
    relatedPage,
    relatedFeature,
    relatedPackageId: relatedPackageId ?? null,
    relatedOpportunityId: relatedOpportunityId ?? null,
  });

  const canSubmit = useMemo(
    () =>
      draft.whatWorked.trim() ||
      draft.whatWasConfusing.trim() ||
      draft.whatShouldImprove.trim(),
    [draft],
  );

  async function submitFeedback() {
    if (!canSubmit) {
      setNotice("Add at least one feedback note before submitting.");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Feedback could not be saved.");
      }

      setNotice("Feedback saved for the pilot.");
      setDraft((current) => ({
        ...current,
        whatWorked: "",
        whatWasConfusing: "",
        whatShouldImprove: "",
      }));
      setIsOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback save failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquareText className="h-4 w-4 text-[#f7d889]" />
            Pilot feedback
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Tell us what helped, confused, or should improve in this screen.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
          Give Feedback
        </Button>
      </div>

      {isOpen ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={String(draft.rating)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  rating: Number(event.target.value),
                }))
              }
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}/5
                </option>
              ))}
            </Select>
            <Select
              value={draft.urgency}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  urgency: event.target.value as PilotUrgency,
                }))
              }
            >
              {pilotUrgencies.map((urgency) => (
                <option key={urgency} value={urgency}>
                  {urgency}
                </option>
              ))}
            </Select>
            <Input
              value={draft.createdBy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  createdBy: event.target.value,
                }))
              }
              placeholder="Your name"
            />
          </div>
          <Textarea
            value={draft.whatWorked}
            onChange={(event) =>
              setDraft((current) => ({ ...current, whatWorked: event.target.value }))
            }
            placeholder="What worked?"
            rows={3}
          />
          <Textarea
            value={draft.whatWasConfusing}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                whatWasConfusing: event.target.value,
              }))
            }
            placeholder="What was confusing?"
            rows={3}
          />
          <Textarea
            value={draft.whatShouldImprove}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                whatShouldImprove: event.target.value,
              }))
            }
            placeholder="What should improve?"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="gold"
              onClick={submitFeedback}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit feedback
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="mt-3 text-xs font-medium text-teal-50">{notice}</p> : null}
    </div>
  );
}


