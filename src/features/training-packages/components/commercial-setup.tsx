"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  normalizePricingInputs,
  type PricingInputs,
} from "@/features/training-packages";

export function CommercialSetup({
  value,
  onChange,
  title = "Commercial Setup",
  description = "Client-facing participant count, professional fee, and VAT wording.",
  showParticipants = true,
}: {
  value: PricingInputs;
  onChange: (value: PricingInputs) => void;
  title?: string;
  description?: string;
  showParticipants?: boolean;
}) {
  function updateNumber(
    key: "numberOfParticipants" | "professionalFee",
    rawValue: string,
  ) {
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
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {showParticipants ? (
          <NumberField
            label="Participants"
            placeholder="Enter participant count"
            value={value.numberOfParticipants}
            onChange={(next) => updateNumber("numberOfParticipants", next)}
          />
        ) : null}
        <NumberField
          label="Professional fee (USD)"
          placeholder="Enter professional fee"
          value={value.professionalFee}
          onChange={(next) => updateNumber("professionalFee", next)}
        />
        <Field label="VAT wording" required>
          <Select
            required
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
    if (!isFocused) setDraftValue(formattedValue);
  }, [formattedValue, isFocused]);

  function handleChange(nextValue: string) {
    if (!/^\d*\.?\d*$/.test(nextValue)) return;
    setDraftValue(nextValue);
    onChange(nextValue);
  }

  return (
    <Field label={label} required>
      <Input
        required
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
