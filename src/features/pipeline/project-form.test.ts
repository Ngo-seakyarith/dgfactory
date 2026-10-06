import { describe, expect, test } from "bun:test";
import { FormApi } from "@tanstack/react-form";
import { emptyClientProject, projectInputSchema } from "./project-domain";

const input = () => ({ ...emptyClientProject("11111111-1111-4111-8111-111111111111"), title: "Leadership training" });

describe("pipeline editor form", () => {
  test("creation validates the same contract as the API", async () => {
    let saves = 0;
    const form = new FormApi({ defaultValues: input(), validators: { onChange: projectInputSchema, onSubmit: projectInputSchema }, onSubmit: () => { saves++; } });
    const unmount = form.mount();
    try {
      form.setFieldValue("title", " ");
      await form.handleSubmit();
      expect(saves).toBe(0);
      form.setFieldValue("title", "Leadership training");
      form.setFieldValue("targetValue", -1);
      await form.handleSubmit();
      expect(saves).toBe(0);
      form.setFieldValue("targetValue", 500);
      form.setFieldValue("projectType", "Intelligent System");
      await form.handleSubmit();
      expect(saves).toBe(1);
    } finally { unmount(); }
  });
  test("an untouched server update keeps its values after updating form options", () => {
    const original = input();
    const form = new FormApi({ defaultValues: original });
    const unmount = form.mount();
    try {
      form.reset({ ...original, stage: "Confirmed" }, { keepDefaultValues: true });
      form.update({ defaultValues: original });
      expect(form.state.values.stage).toBe("Confirmed");
      form.setFieldValue("notes", "Unsaved note");
      form.update({ defaultValues: original });
      expect(form.state.values.notes).toBe("Unsaved note");
    } finally { unmount(); }
  });
});
