"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { postJson, ApiRequestError } from "@/lib/http";
import { Button, ErrorNotice, Field, Input } from "@/components/ui";

export function AddProgressForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    weightKg: "",
    bodyFatPct: "",
    waistCm: "",
    chestCm: "",
    hipCm: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/progress", {
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : null,
        waistCm: form.waistCm ? Number(form.waistCm) : null,
        chestCm: form.chestCm ? Number(form.chestCm) : null,
        hipCm: form.hipCm ? Number(form.hipCm) : null,
        notes: form.notes.trim() || null,
      });
      setForm({ weightKg: "", bodyFatPct: "", waistCm: "", chestCm: "", hipCm: "", notes: "" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="px-5 py-2.5">
        <Plus className="h-4 w-4" /> Log measurements
      </Button>
    );
  }

  const fields = [
    { key: "weightKg", label: "Weight (kg)" },
    { key: "bodyFatPct", label: "Body fat (%)" },
    { key: "waistCm", label: "Waist (cm)" },
    { key: "chestCm", label: "Chest (cm)" },
    { key: "hipCm", label: "Hip (cm)" },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5">
      <div className="font-semibold text-slate-100">New progress entry</div>
      {error ? <ErrorNotice message={error} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input
              type="number"
              step="0.1"
              placeholder="—"
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      <Field label="Notes">
        <Input
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional note"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>Save entry</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}