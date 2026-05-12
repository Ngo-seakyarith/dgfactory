import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";

import { DemoSeedButton, ProductBriefExportButtons } from "@/app/product/_components/productization-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Training Package Generator",
    icon: FileText,
    body: "Turn one idea into syllabus, proposal, workbook, slide outline, follow-up email, and checklist.",
  },
  {
    title: "Commercial Engine",
    icon: BriefcaseBusiness,
    body: "Calculate pricing deterministically and generate client-facing commercial proposal language.",
  },
  {
    title: "CRM and Pipeline",
    icon: Users,
    body: "Track clients, opportunities, follow-ups, proposal status, weighted value, and won work.",
  },
  {
    title: "Delivery OS",
    icon: ClipboardCheck,
    body: "Prepare materials, manage delivery tasks, capture evaluations, and draft post-training reports.",
  },
  {
    title: "Agentic Brain Layer",
    icon: BrainCircuit,
    body: "Route work through specialist agents, knowledge retrieval, QA review, evals, and improvement loops.",
  },
  {
    title: "Governance and Client Portal",
    icon: ShieldCheck,
    body: "Protect internal notes, margins, prompts, private knowledge, and client-facing document access.",
  },
];

const useCases = [
  "Corporate L&D teams building internal academies",
  "HR teams managing AI upskilling and leadership programs",
  "Consulting firms standardizing proposal-to-delivery operations",
  "Training providers packaging workshops and client reports",
];

const processSteps = [
  "Map the client's capability workflow and approval rules.",
  "Configure workspace roles, Supabase storage, and branded templates.",
  "Import frameworks, SOPs, proposal language, and client-safe knowledge.",
  "Run a 30-day pilot with real packages, proposals, and delivery work.",
  "Review quality metrics, security checks, and adoption evidence before rollout.",
];

const packages = [
  {
    name: "Starter",
    scope: "Internal training package generator",
    price: "Pricing placeholder",
    includes: ["Package generation", "Copy/export", "Mock mode", "Basic setup"],
  },
  {
    name: "Professional",
    scope: "CRM, delivery, knowledge base, and client portal",
    price: "Pricing placeholder",
    includes: ["Pipeline", "Delivery OS", "Knowledge base", "Client-safe portal"],
  },
  {
    name: "Enterprise",
    scope: "Agentic workflows, OpenClaw, evals, and governance",
    price: "Pricing placeholder",
    includes: ["Multi-agent workflow", "Orchestrator", "Evals", "Red-team checks"],
  },
];

export default function ProductPage() {
  return (
    <div className="space-y-10 pb-8">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1829] shadow-executive">
        <div className="grid min-h-[520px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-8 lg:px-10">
            <Badge variant="teal" className="w-fit">DG Academy Product Offer</Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              DG Capability Factory
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              An AI-powered operating system for turning organizational capability
              needs into training packages, proposals, delivery plans, feedback
              loops, and measurable improvement.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold">
                <Link href="/packages/new">
                  Try Package Generator
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/roi-calculator">Open ROI Calculator</Link>
              </Button>
            </div>
          </div>
          <div className="relative border-t border-white/10 bg-[#07111f] p-5 lg:border-l lg:border-t-0">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Problem</CardTitle>
            <CardDescription>
              Capability work often fails because the operating system around it is manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-200">
            <p>
              Training teams rebuild proposals, syllabi, pricing plans, delivery
              checklists, and reports from scratch. Knowledge stays scattered, quality
              review is inconsistent, and client follow-up depends on memory.
            </p>
          </CardContent>
        </Card>
        <Card className="border-teal-300/20 bg-teal-300/10 shadow-executive">
          <CardHeader>
            <CardTitle>Solution</CardTitle>
            <CardDescription>
              One guided system for proposal, delivery, quality, and governance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-teal-50/90">
            <p>
              DG Capability Factory captures one training idea, generates the
              complete package, calculates pricing, tracks the opportunity, prepares
              delivery, gathers feedback, and improves the system through evals and
              human-approved prompt/template updates.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Core features"
          title="A production line for capability programs"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-white/10 bg-white/[0.04] shadow-executive">
              <CardHeader>
                <feature.icon className="h-5 w-5 text-teal-100" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeading eyebrow="Use cases" title="Where it fits" />
          <div className="mt-4 space-y-3">
            {useCases.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-100" />
                <div className="text-sm leading-6 text-slate-200">{item}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Implementation" title="Client rollout process" />
          <div className="mt-4 space-y-3">
            {processSteps.map((item, index) => (
              <div
                key={item}
                className="grid gap-3 rounded-lg border border-white/10 bg-[#07111f]/55 p-4 sm:grid-cols-[48px_1fr]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 font-mono text-sm text-teal-50">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Commercial packages" title="Offer structure" />
        <div className="grid gap-4 lg:grid-cols-3">
          {packages.map((item) => (
            <Card key={item.name} className="border-white/10 bg-white/[0.04] shadow-executive">
              <CardHeader>
                <Badge variant="outline" className="w-fit">{item.name}</Badge>
                <CardTitle>{item.scope}</CardTitle>
                <CardDescription>{item.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.includes.map((line) => (
                  <div key={line} className="flex gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-100" />
                    {line}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.04] shadow-executive">
          <CardHeader>
            <CardTitle>Product brief</CardTitle>
            <CardDescription>
              Export a client-ready overview for sales conversations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductBriefExportButtons />
          </CardContent>
        </Card>
        <DemoSeedButton />
      </section>

      <section className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-6 shadow-executive">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">
              Call to action
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Demonstrate DG Capability Factory with a real client scenario.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-teal-50/90">
              Use the demo workspace, guided script, ROI calculator, and product
              brief to show how the system turns strategy into operational training
              delivery.
            </p>
          </div>
          <Button asChild variant="gold">
            <Link href="/clients">
              Start from CRM
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0d1b2d] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-teal-100">Live workspace preview</div>
          <div className="mt-1 font-semibold text-white">Capability Factory Command View</div>
        </div>
        <Badge variant="teal">Demo-ready</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <PreviewPanel icon={LayoutDashboard} title="Pipeline" value="$68k weighted value" />
        <PreviewPanel icon={FileText} title="Packages" value="AI Skills for Managers" />
        <PreviewPanel icon={Route} title="Delivery" value="Checklist readiness 82%" />
        <PreviewPanel icon={LockKeyhole} title="Governance" value="Client-safe portal active" />
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-[#07111f]/80 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <BrainCircuit className="h-4 w-4 text-teal-100" />
          Multi-agent generation trace
        </div>
        {["Plan", "Syllabus", "Proposal", "Pricing", "QA review"].map((step, index) => (
          <div key={step} className="flex items-center justify-between border-t border-white/10 py-2 text-sm first:border-t-0">
            <span className="text-slate-200">{step}</span>
            <span className="font-mono text-teal-100">{index < 4 ? "done" : "91/100"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f]/70 p-4">
      <Icon className="h-4 w-4 text-teal-100" />
      <div className="mt-3 text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
    </div>
  );
}
