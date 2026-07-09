"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  calculatePricing,
  clientPricingParagraph,
  formatMoney,
  formatPercent,
  internalProfitabilityNote,
  normalizePricingInputs,
  type PricingInputs,
  type TrainingPackage,
} from "@/features/training-packages";
export function CommercialSetup({
  value,
  onChange,
  title = "Commercial Setup",
  description = "Pricing assumptions for the client offer.",
}: {
  value: PricingInputs;
  onChange: (value: PricingInputs) => void;
  title?: string;
  description?: string;
}) {
  const pricingOutputs = calculatePricing(value);

  function updateNumber(key: keyof PricingInputs, rawValue: string) {
    onChange(
      normalizePricingInputs({
        ...value,
        [key]: rawValue === "" ? 0 : Number(rawValue),
      }),
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-executive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-teal-100" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Participants" placeholder="Enter participant count" value={value.numberOfParticipants} onChange={(next) => updateNumber("numberOfParticipants", next)} />
          <NumberField label="Professional fee (USD)" placeholder="Enter quoted professional fee" value={value.professionalFee} onChange={(next) => updateNumber("professionalFee", next)} />
          <Field label="VAT wording">
            <Select
              value={value.vatStatus}
              onChange={(event) =>
                onChange(
                  normalizePricingInputs({
                    ...value,
                    vatStatus: event.target.value,
                  }),
                )
              }
            >
              <option>Excluding VAT</option>
              <option>Including VAT</option>
            </Select>
          </Field>
          <NumberField label="Discount %" placeholder="Enter discount percent" value={value.discountPercent} onChange={(next) => updateNumber("discountPercent", next)} />
          <NumberField label="VAT / tax %" placeholder="Enter VAT or tax percent" value={value.taxPercent} onChange={(next) => updateNumber("taxPercent", next)} />
        </div>

        {pricingOutputs.warnings.length > 0 ? (
          <div className="rounded-lg border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
            {pricingOutputs.warnings.join(" ")}
          </div>
        ) : null}

      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: number;
  onChange: (value: string) => void;
}) {
  const formattedValue = Number.isFinite(value) && value !== 0 ? String(value) : "";
  const [draftValue, setDraftValue] = useState(formattedValue);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(formattedValue);
    }
  }, [formattedValue, isFocused]);

  function handleChange(nextValue: string) {
    if (!/^-?\d*\.?\d*$/.test(nextValue)) {
      return;
    }

    setDraftValue(nextValue);
    onChange(nextValue);
  }

  return (
    <Field label={label}>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={isFocused ? draftValue : formattedValue}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={(event) => {
          setIsFocused(true);
          setDraftValue(formattedValue);
          event.currentTarget.select();
        }}
        onBlur={() => setIsFocused(false)}
        className="tabular-nums"
      />
    </Field>
  );
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-3">
      <div className="text-xs text-teal-50/75">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

export function PricingPanel({
  pkg,
  canViewInternal,
}: {
  pkg: TrainingPackage;
  canViewInternal: boolean;
}) {
  const inputs = pkg.pricingInputs;
  const outputs = pkg.pricingOutputs;
  const costRows = [
    ["Trainer cost", outputs.trainerCost],
    ["Venue cost", inputs.venueCost],
    ["Participant variable cost", outputs.participantVariableCost],
    ["Admin cost", inputs.adminCost],
    ["Marketing cost", inputs.marketingCost],
    ["Travel cost", inputs.travelCost],
    ["Other cost", inputs.otherCost],
  ];

  return (
    <div className="max-h-[34rem] overflow-auto p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MiniMetric label="Final recommended price" value={formatMoney(outputs.finalPrice, inputs.currency)} />
        <MiniMetric label="Price per participant" value={formatMoney(outputs.pricePerParticipant, inputs.currency)} />
        {canViewInternal ? (
          <>
            <MiniMetric label="Total direct cost" value={formatMoney(outputs.totalDirectCost, inputs.currency)} />
            <MiniMetric label="Estimated profit" value={formatMoney(outputs.estimatedProfit, inputs.currency)} />
            <MiniMetric label="Estimated profit margin" value={formatPercent(outputs.estimatedProfitMargin)} />
          </>
        ) : null}
        <MiniMetric label="Discount / Tax" value={`${formatMoney(outputs.discountAmount, inputs.currency)} / ${formatMoney(outputs.taxAmount, inputs.currency)}`} />
      </div>

      {canViewInternal ? (
      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cost item</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {costRows.map(([label, value]) => (
              <tr key={label} className="border-t border-white/10">
                <td className="px-4 py-3 text-slate-100">{label}</td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {formatMoney(Number(value), inputs.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
          <div className="text-sm font-semibold text-teal-50">
            Client-facing pricing paragraph
          </div>
          <p className="mt-2 text-sm leading-6 text-teal-50/80">
            {clientPricingParagraph(inputs, outputs)}
          </p>
        </div>
        {canViewInternal ? (
        <div className="rounded-lg border border-[#d7a842]/25 bg-[#d7a842]/10 p-4">
          <div className="text-sm font-semibold text-[#f7d889]">
            Internal-only profitability note
          </div>
          <p className="mt-2 text-sm leading-6 text-[#f7d889]/85">
            {internalProfitabilityNote(inputs, outputs)}
          </p>
        </div>
        ) : null}
      </div>
    </div>
  );
}
