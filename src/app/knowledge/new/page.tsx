import { KnowledgeDocumentForm } from "@/app/knowledge/_components/knowledge-components";

export default function NewKnowledgePage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          New Knowledge
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Add DG Academy knowledge.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Mark visibility carefully. Internal knowledge can guide generation, but
          client-safe knowledge is the only kind that should be surfaced externally.
        </p>
      </section>
      <KnowledgeDocumentForm />
    </div>
  );
}
