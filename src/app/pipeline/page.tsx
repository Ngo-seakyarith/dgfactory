import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/features/crm/components/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="page-heading">
          <div className="page-eyebrow">Business development</div>
          <h1 className="page-title">Proposal pipeline</h1>
          <p className="page-description">Track training and intelligent-system proposals from draft to decision.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/packages/new"><Plus className="h-4 w-4" />Training Package</Link></Button>
          <Button asChild variant="gold"><Link href="/solution-proposals/new"><Plus className="h-4 w-4" />System Proposal</Link></Button>
        </div>
      </div>
      <PipelineBoard />
    </div>
  );
}
