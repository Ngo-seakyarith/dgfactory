"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import {
  deliveryTaskCategories,
  deliveryTaskStatuses,
  normalizeDeliveryTask,
  type DeliveryTask,
  type DeliveryTaskCategory,
} from "../domain/delivery";
import {
  useDeliveryTasksQuery,
  useSaveDeliveryTaskMutation,
  useDeleteDeliveryTaskMutation,
} from "../queries";

const statusLabels: Record<DeliveryTask["status"], string> = {
  Open: "Not started",
  "In Progress": "In progress",
  Done: "Done",
  "Not Applicable": "Not applicable",
};

function ChecklistRow({ task }: { task: DeliveryTask }) {
  const save = useSaveDeliveryTaskMutation();
  const remove = useDeleteDeliveryTaskMutation();
  const [draft, setDraft] = useState(task);
  useEffect(() => setDraft(task), [task]);
  const busy = save.isPending || remove.isPending;
  const error = save.error ?? remove.error;

  function update(key: keyof DeliveryTask, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function persist(next = draft) {
    if (!next.title.trim()) return;
    if (next.startDate && next.dueDate && next.startDate > next.dueDate) return;
    save.mutate(next);
  }

  return (
    <div className="border-b border-border px-3 py-3 last:border-b-0">
      <fieldset disabled={busy} className="grid min-w-0 gap-3 xl:grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_145px_145px_150px_36px]">
        <label className="min-w-0">
          <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Task</span>
          <Input aria-label="Task" value={draft.title} onChange={(e) => update("title", e.target.value)} onBlur={() => { if (draft.title !== task.title) persist(); }} />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Responsible</span>
          <Input aria-label={"Responsible for " + task.title} placeholder="Unassigned" value={draft.owner} onChange={(e) => update("owner", e.target.value)} onBlur={() => { if (draft.owner !== task.owner) persist(); }} />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Start</span>
          <Input aria-label={"Start date for " + task.title} type="date" value={draft.startDate} max={draft.dueDate || undefined} onChange={(e) => update("startDate", e.target.value)} onBlur={() => { if (draft.startDate !== task.startDate) persist(); }} />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted-foreground xl:hidden">End</span>
          <Input aria-label={"End date for " + task.title} type="date" value={draft.dueDate} min={draft.startDate || undefined} onChange={(e) => update("dueDate", e.target.value)} onBlur={() => { if (draft.dueDate !== task.dueDate) persist(); }} />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Status</span>
          <Select aria-label={"Status of " + task.title} value={draft.status} onChange={(e) => {
            const next = { ...draft, status: e.target.value as DeliveryTask["status"] };
            setDraft(next);
            persist(next);
          }}>
            {deliveryTaskStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </Select>
        </label>
        <Button variant="ghost" size="icon" title="Delete task" aria-label={"Delete " + task.title} onClick={() => {
          if (window.confirm('Delete "' + task.title + '"?')) remove.mutate(task);
        }}><Trash2 className="h-4 w-4" /></Button>
      </fieldset>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer">Notes{task.notes ? " (added)" : ""}</summary>
        <Input className="mt-2" aria-label={"Notes for " + task.title} value={draft.notes} onChange={(e) => update("notes", e.target.value)} onBlur={() => { if (draft.notes !== task.notes) persist(); }} disabled={busy} />
      </details>
      {draft.startDate && draft.dueDate && draft.startDate > draft.dueDate ? <p role="alert" className="mt-2 text-sm text-destructive">End date must be on or after start date.</p> : null}
      {error ? <div role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">{error.message}{save.error ? <Button variant="outline" size="sm" onClick={() => persist()}>Retry save</Button> : null}</div> : null}
    </div>
  );
}

export function DeliveryChecklist({ projectId }: { projectId: string }) {
  const query = useDeliveryTasksQuery(projectId);
  const save = useSaveDeliveryTaskMutation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DeliveryTaskCategory>("Trainer");
  if (query.isPending) return <PageLoadingSkeleton label="Loading training checklist" />;
  if (query.isError) return <QueryErrorState detail={query.error.message} onRetry={() => void query.refetch()} />;
  const tasks = query.data ?? [];
  const applicable = tasks.filter((task) => task.status !== "Not Applicable");
  const done = applicable.filter((task) => task.status === "Done").length;

  async function addTask() {
    if (!title.trim()) return;
    try {
      await save.mutateAsync(normalizeDeliveryTask({
        deliveryProjectId: projectId, title, category,
        sortOrder: Math.max(-1, ...tasks.map((task) => task.sortOrder)) + 1,
      }));
      setTitle("");
    } catch {}
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="text-lg font-semibold">Training Checklist</h2>
        <span className="text-sm text-muted-foreground">{done} of {applicable.length} completed</span>
      </div>
      {deliveryTaskCategories.map((group, index) => {
        const rows = tasks.filter((task) => task.category === group);
        return (
          <section key={group} className="min-w-0">
            <h3 className="border-b border-border bg-muted px-3 py-3 text-sm font-semibold">{index + 1}. {group}</h3>
            <div className="hidden gap-3 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground xl:grid xl:grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_145px_145px_150px_36px]">
              <span>Task</span><span>Responsible</span><span>Start</span><span>End</span><span>Status</span><span />
            </div>
            {rows.map((task) => <ChecklistRow key={task.id} task={task} />)}
            {!rows.length ? <p className="px-3 py-3 text-sm text-muted-foreground">No tasks</p> : null}
          </section>
        );
      })}
      <form className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void addTask(); }}>
        <Select className="sm:w-64" aria-label="New task group" value={category} onChange={(e) => setCategory(e.target.value as DeliveryTaskCategory)}>
          {deliveryTaskCategories.map((group) => <option key={group}>{group}</option>)}
        </Select>
        <Input aria-label="New task title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" />
        <Button type="submit" variant="outline" disabled={!title.trim() || save.isPending}><Plus className="h-4 w-4" />Add</Button>
      </form>
      {save.error ? <p role="alert" className="text-sm text-destructive">{save.error.message}</p> : null}
    </section>
  );
}
