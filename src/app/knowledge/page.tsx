import { KnowledgeLibrary } from "@/components/knowledge-components";

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
          DG Academy Knowledge Base
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Reusable knowledge for better training packages.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Store frameworks, proposal language, Cambodia context, exercises,
          sector examples, pricing notes, and client-specific knowledge.
        </p>
      </section>
      <KnowledgeLibrary />
    </div>
  );
}
