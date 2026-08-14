"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AutosaveIndicator } from "@/components/autosave-indicator";
import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientsQuery } from "@/features/clients/queries";
import {
  isActiveGenerationJob,
  type GenerationJob,
  type GenerationJobType,
} from "@/features/generation-jobs/domain/types";
import {
  setGenerationJobQueryData,
  useLatestGenerationJobQuery,
} from "@/features/generation-jobs/queries";
import { requestJson } from "@/lib/api-client";
import type { ClientProfileInput } from "@/lib/crm";
import { useAutosave } from "@/hooks/use-autosave";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { createSolutionProposal } from "../domain/proposal";
import type {
  DigitalSolutionProposal,
  SolutionSourceFile,
} from "../domain/types";
import {
  setSolutionProposalQueryData,
  useDeleteSolutionProposalMutation,
  useSaveSolutionProposalMutation,
  useSolutionProposalQuery,
} from "../queries";
import { SolutionBriefForm } from "./solution-brief-form";
import { SolutionProposalPanel } from "./solution-proposal-panel";
import { SolutionReviewPanel } from "./solution-review-panel";

type Stage = "brief" | "review" | "proposal";
const stages: Array<{ id: Stage; label: string; icon: typeof FileText }> = [
  { id: "brief", label: "1. Project Brief", icon: FileText },
  { id: "review", label: "2. Solution Review", icon: ClipboardCheck },
  { id: "proposal", label: "3. Proposal", icon: Sparkles },
];

const emptyClientProfile: ClientProfileInput = {
  name: "",
  sector: "",
  contactPerson: "",
  contactPosition: "",
  email: "",
  phone: "",
};

function profileFromResponse(client: ClientProfileInput & { id: string }) {
  return {
    id: client.id,
    name: client.name,
    sector: client.sector,
    contactPerson: client.contactPerson,
    contactPosition: client.contactPosition,
    email: client.email,
    phone: client.phone,
  };
}

export function SolutionProposalWorkspace({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [resourceId, setResourceId] = useState(id ?? "");
  const resourceIdRef = useRef(id ?? "");
  const proposalQuery = useSolutionProposalQuery(resourceId || undefined);
  const clientsQuery = useClientsQuery();
  const saveMutation = useSaveSolutionProposalMutation();
  const deleteMutation = useDeleteSolutionProposalMutation();
  const loadedProposal = useRef(false);
  const loadedClientProfile = useRef(false);
  const [proposal, setProposal] = useState<DigitalSolutionProposal>(() =>
    createSolutionProposal(),
  );
  const [clientProfile, setClientProfile] =
    useState<ClientProfileInput>(emptyClientProfile);
  const [stage, setStage] = useState<Stage>("brief");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ text: string; error: boolean }>({
    text: "",
    error: false,
  });
  const [activeJob, setActiveJob] = useState<{
    id: string;
    type: Extract<GenerationJobType, "solution_review" | "solution_proposal">;
  } | null>(null);

  const reviewJob = useLatestGenerationJobQuery({
    jobType: "solution_review",
    resourceId,
    enabled: Boolean(resourceId),
  });
  const proposalJob = useLatestGenerationJobQuery({
    jobType: "solution_proposal",
    resourceId,
    enabled: Boolean(resourceId),
  });
  const commandMutation = useMutation({
    mutationFn: ({ url, init }: { url: string; init?: RequestInit }) =>
      requestJson<{ proposal?: DigitalSolutionProposal; job?: GenerationJob }>(
        url,
        init,
      ),
    onSuccess(payload) {
      if (payload.job) setGenerationJobQueryData(queryClient, payload.job);
      if (payload.proposal) {
        setProposal(payload.proposal);
        setSolutionProposalQueryData(queryClient, payload.proposal);
      }
    },
  });

  const fail = (error: unknown) => {
    setNotice({
      text: error instanceof Error ? error.message : "Request failed.",
      error: true,
    });
  };
  const success = (text: string) => setNotice({ text, error: false });
  const autosaveValue = { proposal, client: clientProfile };
  const autosave = useAutosave({
    value: autosaveValue,
    enabled:
      Boolean(proposal.title.trim() && clientProfile.name.trim()) &&
      !busy &&
      !activeJob,
    async onSave(snapshot) {
      const data = await saveMutation.mutateAsync({
        id: resourceIdRef.current || undefined,
        proposal: snapshot.proposal,
        client: snapshot.client,
      });
      setSolutionProposalQueryData(queryClient, data.proposal);
      if (!resourceIdRef.current) {
        loadedProposal.current = true;
        resourceIdRef.current = data.proposal.id;
        setResourceId(data.proposal.id);
        router.replace(`/solution-proposals/${data.proposal.id}`);
      }
    },
    onError: fail,
  });

  useEffect(() => {
    if (!proposalQuery.data || loadedProposal.current) return;
    loadedProposal.current = true;
    const loaded = proposalQuery.data;
    setProposal(loaded);
    const client = clientsQuery.data?.find((item) => item.id === loaded.clientId);
    loadedClientProfile.current = Boolean(client);
    const loadedProfile = client
      ? {
            id: client.id,
            name: client.name,
            sector: client.sector,
            contactPerson: client.contactPerson,
            contactPosition: client.contactPosition,
            email: client.email,
            phone: client.phone,
          }
      : { ...emptyClientProfile, id: loaded.clientId ?? undefined, name: loaded.clientName };
    setClientProfile(loadedProfile);
    autosave.markSaved({ proposal: loaded, client: loadedProfile });
    if (loaded.proposalContent) setStage("proposal");
    else if (loaded.solutionReview) setStage("review");
  }, [autosave, clientsQuery.data, proposalQuery.data]);

  useEffect(() => {
    if (loadedClientProfile.current || !proposal.clientId) return;
    const client = clientsQuery.data?.find((item) => item.id === proposal.clientId);
    if (!client) return;
    loadedClientProfile.current = true;
    setClientProfile({
      id: client.id,
      name: client.name,
      sector: client.sector,
      contactPerson: client.contactPerson,
      contactPosition: client.contactPosition,
      email: client.email,
      phone: client.phone,
    });
  }, [clientsQuery.data, proposal.clientId]);

  useEffect(() => {
    if (activeJob) return;
    const job = [reviewJob.data, proposalJob.data]
      .filter((value): value is GenerationJob => isActiveGenerationJob(value))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!job) return;
    setActiveJob({
      id: job.id,
      type: job.jobType as "solution_review" | "solution_proposal",
    });
    setBusy(
      job.jobType === "solution_review"
        ? "Preparing solution review..."
        : "Generating proposal...",
    );
  }, [activeJob, proposalJob.data, reviewJob.data]);

  useEffect(() => {
    const job =
      activeJob?.type === "solution_review"
        ? reviewJob.data
        : activeJob?.type === "solution_proposal"
          ? proposalJob.data
          : null;
    if (!activeJob || !job || job.id !== activeJob.id) return;
    if (job.status === "Failed") {
      fail(new Error(job.errorMessage || "Background generation failed."));
      setBusy("");
      setActiveJob(null);
      return;
    }
    if (job.status !== "Completed") return;
    const completedType = activeJob.type;
    setActiveJob(null);
    void proposalQuery.refetch().then(({ data }) => {
      if (!data) return;
      setProposal(data);
      setSolutionProposalQueryData(queryClient, data);
      autosave.markSaved({ proposal: data, client: clientProfile });
      setStage(completedType === "solution_review" ? "review" : "proposal");
      success(
        completedType === "solution_review"
          ? "Solution review is ready."
          : "Proposal generated and saved.",
      );
      setBusy("");
    });
  }, [activeJob, autosave, clientProfile, proposalJob.data, proposalQuery, queryClient, reviewJob.data]);

  async function save(message = "Draft saved.") {
    autosave.cancel();
    await autosave.waitForPending();
    setBusy("Saving draft...");
    try {
      const currentResourceId = resourceIdRef.current;
      const data = await saveMutation.mutateAsync({
        id: currentResourceId || undefined,
        proposal,
        client: clientProfile,
      });
      setProposal(data.proposal);
      const savedClient = profileFromResponse(data.client);
      setClientProfile(savedClient);
      autosave.markSaved({ proposal: data.proposal, client: savedClient });
      if (!currentResourceId) {
        loadedProposal.current = true;
        resourceIdRef.current = data.proposal.id;
        setResourceId(data.proposal.id);
        router.replace(`/solution-proposals/${data.proposal.id}`);
      }
      if (message) success(message);
      return data.proposal;
    } catch (error) {
      fail(error);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (proposal.files.length + files.length > 5) {
      fail(new Error("A project can contain up to five supporting data files."));
      return;
    }
    setBusy("Uploading and analyzing supporting data...");
    try {
      const saved = resourceId ? proposal : await save("");
      if (!saved) return;
      const proposalId = resourceId || saved.id;
      setBusy("Uploading and analyzing supporting data...");
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase browser configuration is missing.");
      let latest = proposal;
      for (const file of Array.from(files)) {
        const token = await requestJson<{
          file: SolutionSourceFile;
          path: string;
          token: string;
        }>(`/api/solution-proposals/${proposalId}/files/upload-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });
        const { error } = await supabase.storage
          .from("solution-proposal-inputs")
          .uploadToSignedUrl(token.path, token.token, file, {
            contentType: file.type || undefined,
          });
        if (error) {
          await fetch(
            `/api/solution-proposals/${proposalId}/files/${token.file.id}`,
            { method: "DELETE" },
          );
          throw error;
        }
        const analyzed = await commandMutation.mutateAsync({
          url: `/api/solution-proposals/${proposalId}/files/${token.file.id}/analyze`,
          init: { method: "POST" },
        });
        if (analyzed.proposal) latest = analyzed.proposal;
      }
      setProposal(latest);
      autosave.markSaved({ proposal: latest, client: clientProfile });
      success("Supporting data analyzed.");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }

  async function removeFile(fileId: string) {
    if (!resourceId) return;
    setBusy("Removing supporting data...");
    try {
      const data = await commandMutation.mutateAsync({
        url: `/api/solution-proposals/${resourceId}/files/${fileId}`,
        init: { method: "DELETE" },
      });
      if (data.proposal) {
        setProposal(data.proposal);
        autosave.markSaved({ proposal: data.proposal, client: clientProfile });
      }
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }

  async function createReview() {
    const saved = await save("");
    if (!saved) return;
    setBusy("Starting solution review...");
    try {
      const data = await commandMutation.mutateAsync({
        url: `/api/solution-proposals/${saved.id}/review`,
        init: { method: "POST" },
      });
      if (!data.job) throw new Error("The solution review job did not start.");
      setActiveJob({ id: data.job.id, type: "solution_review" });
      setBusy("Preparing solution review...");
    } catch (error) {
      fail(error);
      setBusy("");
    }
  }

  async function generate() {
    const saved = await save("");
    if (!saved) return;
    setBusy("Starting proposal generation...");
    try {
      const data = await commandMutation.mutateAsync({
        url: `/api/solution-proposals/${saved.id}/generate`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal: saved, client: clientProfile }),
        },
      });
      if (!data.job) throw new Error("The proposal generation job did not start.");
      setActiveJob({ id: data.job.id, type: "solution_proposal" });
      setBusy("Generating proposal...");
    } catch (error) {
      fail(error);
      setBusy("");
    }
  }

  async function exportDocx() {
    if (!resourceId) return;
    const response = await fetch(`/api/solution-proposals/${resourceId}/export`, {
      method: "POST",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      fail(new Error(payload.error || "DOCX export failed."));
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "digital-solution-proposal.docx";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteProject() {
    if (!resourceId || !window.confirm("Delete this proposal and its private files?")) return;
    setBusy("Deleting proposal...");
    try {
      await deleteMutation.mutateAsync(resourceId);
      router.push("/solution-proposals");
    } catch (error) {
      fail(error);
      setBusy("");
    }
  }

  function selectClient(clientId: string) {
    if (clientId === "new") {
      loadedClientProfile.current = false;
      setClientProfile(emptyClientProfile);
      setProposal((current) => ({ ...current, clientId: null, clientName: "" }));
      return;
    }
    const client = clientsQuery.data?.find((item) => item.id === clientId);
    if (!client) return;
    loadedClientProfile.current = true;
    setClientProfile({
      id: client.id,
      name: client.name,
      sector: client.sector,
      contactPerson: client.contactPerson,
      contactPosition: client.contactPosition,
      email: client.email,
      phone: client.phone,
    });
    setProposal((current) => ({
      ...current,
      clientId: client.id,
      clientName: client.name,
    }));
  }

  if (resourceId && proposalQuery.isPending) return <WorkspaceSkeleton />;
  if (proposalQuery.isError) {
    return (
      <QueryErrorState
        title="Proposal could not be loaded"
        detail={proposalQuery.error.message}
        onRetry={() => void proposalQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="page-heading">
          <Button asChild variant="ghost" className="mb-1 -ml-3">
            <Link href="/solution-proposals">
              <ArrowLeft className="h-4 w-4" />Digital solution proposals
            </Link>
          </Button>
          <div className="page-eyebrow">Digital consulting</div>
          <h1 className="page-title">
            {resourceId ? proposal.title || "Digital solution proposal" : "New digital solution proposal"}
          </h1>
          <p className="page-description">
            Define the client problem, review the solution scope, and generate a branded proposal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resourceId ? <Badge variant="teal">{proposal.status}</Badge> : null}
          <AutosaveIndicator status={autosave.status} />
          {resourceId ? (
            <Button variant="destructive" size="icon" title="Delete proposal" onClick={() => void deleteProject()} disabled={Boolean(busy)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      <nav className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/40 p-1" aria-label="Proposal stages">
        {stages.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={stage === item.id ? "secondary" : "ghost"}
              onClick={() => {
                void autosave.flush();
                setStage(item.id);
              }}
            >
              <Icon className="h-4 w-4" />{item.label}
            </Button>
          );
        })}
      </nav>

      {busy ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />{busy}
        </div>
      ) : null}
      {notice.text ? (
        <div className={`flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${notice.error ? "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100" : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"}`} role={notice.error ? "alert" : "status"}>
          {!notice.error ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}{notice.text}
        </div>
      ) : null}

      {stage === "brief" ? (
        <SolutionBriefForm
          proposal={proposal}
          clients={clientsQuery.data ?? []}
          clientProfile={clientProfile}
          busy={Boolean(busy)}
          canUpload={Boolean(proposal.title.trim() && clientProfile.name.trim())}
          onProposalChange={setProposal}
          onClientChange={setClientProfile}
          onSelectClient={selectClient}
          onUpload={(files) => void upload(files)}
          onRemoveFile={(fileId) => void removeFile(fileId)}
        />
      ) : null}
      {stage === "review" ? (
        <SolutionReviewPanel
          proposal={proposal}
          busy={Boolean(busy)}
          onChange={setProposal}
          onCreateReview={() => void createReview()}
        />
      ) : null}
      {stage === "proposal" ? (
        <SolutionProposalPanel
          proposal={proposal}
          busy={Boolean(busy)}
          onGenerate={() => void generate()}
          onExport={() => void exportDocx()}
        />
      ) : null}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading proposal" aria-busy="true">
      <div className="space-y-3 border-b border-border pb-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
      </div>
    </div>
  );
}
