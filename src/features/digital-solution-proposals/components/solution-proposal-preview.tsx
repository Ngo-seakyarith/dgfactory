import type {
  SolutionProposalBlock,
  SolutionProposalDocument,
} from "../domain/types";

function ProposalBlock({ block }: { block: SolutionProposalBlock }) {
  if (block.type === "paragraph") {
    return <p className="leading-7 text-foreground/90">{block.text}</p>;
  }
  if (block.type === "bullet_list") {
    return (
      <ul className="list-disc space-y-2 pl-6 leading-7 text-foreground/90">
        {block.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    );
  }
  if (block.type === "numbered_list") {
    return (
      <ol className="list-decimal space-y-2 pl-6 leading-7 text-foreground/90">
        {block.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ol>
    );
  }
  if (block.type === "capabilities") {
    return (
      <div className="divide-y divide-border border-y border-border">
        {block.items.map((item, index) => (
          <div key={`${index}-${item.name}`} className="py-4">
            <h4 className="font-semibold text-primary">{item.name}</h4>
            <p className="mt-2 leading-7 text-foreground/90">{item.description}</p>
            {item.value ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">Client value:</span>{" "}
                {item.value}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {block.items.map((phase, index) => (
        <div key={`${index}-${phase.name}`} className="border-l-2 border-primary/40 pl-4">
          <h4 className="font-semibold">Phase {index + 1}: {phase.name}</h4>
          {phase.duration ? <p className="mt-1 text-sm text-muted-foreground">{phase.duration}</p> : null}
          {phase.activities.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 leading-6 text-foreground/90">
              {phase.activities.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
          {phase.deliverables.length ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">Deliverables:</span>{" "}
              {phase.deliverables.join("; ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SolutionProposalPreview({
  document,
}: {
  document: SolutionProposalDocument;
}) {
  return (
    <article className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-semibold uppercase text-primary">{document.coverHeading}</p>
        <h2 className="mt-2 text-2xl font-semibold">{document.solutionTitle}</h2>
        <p className="mt-2 text-muted-foreground">Prepared for {document.client}</p>
      </header>
      <div className="mt-7 space-y-8">
        {document.sections.map((section, index) => (
          <section key={`${section.key}-${index}`} className="space-y-4">
            <h3 className="text-xl font-semibold">{index + 1}. {section.title}</h3>
            {section.blocks.map((block, blockIndex) => (
              <ProposalBlock key={`${block.type}-${blockIndex}`} block={block} />
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
