import { Suspense } from "react";
import { ListLoadingSkeleton } from "@/components/page-loading-skeleton";
import { ClientPipelineWorkspace } from "@/features/pipeline/components/pipeline-board";

export default function PipelinePage() {
  return <Suspense fallback={<ListLoadingSkeleton />}><ClientPipelineWorkspace /></Suspense>;
}
