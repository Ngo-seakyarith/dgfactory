"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createDefaultSlideBlueprint,
  learningBlockPresetsForTrainingType,
  trainingTypes,
  type SlideDeckBlueprint,
  type TrainingType,
} from "@/features/delivery/domain/slide-blueprint";

type Props = {
  value: SlideDeckBlueprint;
  onChange: (value: SlideDeckBlueprint) => void;
  disabled?: boolean;
};

export function SlideBlueprintEditor({ value, onChange, disabled }: Props) {
  const blockPresets = learningBlockPresetsForTrainingType(value.trainingType);
  const selectedPresetIds = new Set(value.selectedPresetIds);

  function changeTrainingType(trainingType: TrainingType) {
    onChange(createDefaultSlideBlueprint(trainingType));
  }

  function togglePreset(presetId: string, checked: boolean) {
    const nextSelected = new Set(value.selectedPresetIds);
    if (checked) {
      nextSelected.add(presetId);
    } else if (nextSelected.size > 1) {
      nextSelected.delete(presetId);
    }

    onChange({
      ...value,
      selectedPresetIds: blockPresets
        .filter((blockPreset) => nextSelected.has(blockPreset.id))
        .map((blockPreset) => blockPreset.id),
    });
  }

  return (
    <section className="space-y-5 border-y border-border py-5">
      <div className="max-w-sm">
        <Label htmlFor="slide-training-type">Training type</Label>
        <Select
          id="slide-training-type"
          value={value.trainingType}
          disabled={disabled}
          onChange={(event) => changeTrainingType(event.target.value as TrainingType)}
        >
          {trainingTypes.map((trainingType) => (
            <option key={trainingType} value={trainingType}>
              {trainingType}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">Slide content</h3>
          <span className="text-sm text-muted-foreground">
            {value.selectedPresetIds.length} selected
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {blockPresets.map((blockPreset) => {
            const checked = selectedPresetIds.has(blockPreset.id);
            const checkboxId = `slide-content-${blockPreset.id}`;
            return (
              <Label
                key={blockPreset.id}
                htmlFor={checkboxId}
                className="flex min-h-11 cursor-pointer items-center gap-3 border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/60"
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  disabled={disabled || (checked && value.selectedPresetIds.length === 1)}
                  onCheckedChange={(next) => togglePreset(blockPreset.id, next === true)}
                />
                <span>{blockPreset.label}</span>
              </Label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
