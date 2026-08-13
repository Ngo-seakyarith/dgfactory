"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave<T>({
  value,
  enabled,
  onSave,
  onError,
  delay = 2000,
}: {
  value: T;
  enabled: boolean;
  onSave: (value: T) => Promise<void>;
  onError?: (error: unknown) => void;
  delay?: number;
}) {
  const snapshot = useMemo(() => JSON.stringify(value), [value]);
  const valueRef = useRef(value);
  const snapshotRef = useRef(snapshot);
  const lastSavedRef = useRef(snapshot);
  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  valueRef.current = value;
  snapshotRef.current = snapshot;
  onSaveRef.current = onSave;
  onErrorRef.current = onError;

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const saveVersion = useCallback(async (nextValue: T, nextSnapshot: string) => {
    if (nextSnapshot === lastSavedRef.current) return;
    while (inFlightRef.current) await inFlightRef.current;
    if (nextSnapshot === lastSavedRef.current) return;

    setStatus("saving");
    const operation = onSaveRef.current(nextValue)
      .then(() => {
        lastSavedRef.current = nextSnapshot;
        setStatus(
          snapshotRef.current === nextSnapshot ? "saved" : "idle",
        );
      })
      .catch((error) => {
        setStatus("error");
        onErrorRef.current?.(error);
      })
      .finally(() => {
        inFlightRef.current = null;
      });
    inFlightRef.current = operation;
    await operation;
  }, []);

  const flush = useCallback(async () => {
    cancel();
    if (!enabled) return;
    await saveVersion(valueRef.current, snapshotRef.current);
  }, [cancel, enabled, saveVersion]);

  const waitForPending = useCallback(async () => {
    while (inFlightRef.current) await inFlightRef.current;
  }, []);

  const markSaved = useCallback((savedValue: T) => {
    cancel();
    lastSavedRef.current = JSON.stringify(savedValue);
    setStatus("saved");
  }, [cancel]);

  useEffect(() => {
    cancel();
    if (!enabled || snapshot === lastSavedRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveVersion(valueRef.current, snapshotRef.current);
    }, delay);
    return cancel;
  }, [cancel, delay, enabled, saveVersion, snapshot]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const flushOnPageHide = () => void flush();
    window.addEventListener("pagehide", flushOnPageHide);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushOnPageHide);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [flush]);

  return { status, flush, cancel, markSaved, waitForPending };
}
