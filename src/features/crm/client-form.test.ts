import { describe, expect, test } from "bun:test";
import { FieldApi, FormApi } from "@tanstack/react-form";
import { clientFormSchema } from "./client-form";
import { createEmptyClient } from "./domain";

describe("client editor validation", () => {
  test("requires a name and validates optional email", () => {
    const client = { ...createEmptyClient(), name: "Zuellig Pharma" };
    expect(clientFormSchema.safeParse(client).success).toBe(true);
    expect(clientFormSchema.safeParse({ ...client, name: "  " }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...client, email: "invalid" }).success).toBe(false);
    expect(clientFormSchema.parse({ ...client, email: " person@example.com " }).email).toBe("person@example.com");
  });
  test("invalid client input never reaches the save callback", async () => {
    let saves = 0;
    const form = new FormApi({ defaultValues: createEmptyClient(), validators: { onChange: clientFormSchema, onSubmit: clientFormSchema }, onSubmit: () => { saves++; } });
    const unmount = form.mount();
    const field = new FieldApi({ form, name: "name" });
    const unmountField = field.mount();
    try {
      await form.handleSubmit();
      expect(saves).toBe(0);
      field.handleChange("Client");
      await form.handleSubmit();
      expect(saves).toBe(1);
    } finally { unmountField(); unmount(); }
  });
  test("a server refetch does not replace a touched draft", () => {
    const client = { ...createEmptyClient(), name: "Client" };
    const form = new FormApi({ defaultValues: client });
    const unmount = form.mount();
    try {
      form.setFieldValue("contactPerson", "Unsaved contact");
      form.update({ defaultValues: { ...client, updatedAt: "2026-09-29T00:00:00Z" } });
      expect(form.state.values.contactPerson).toBe("Unsaved contact");
    } finally { unmount(); }
  });
});
