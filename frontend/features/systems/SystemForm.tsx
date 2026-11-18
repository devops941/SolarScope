"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateSystem, useUpdateSystem, type SolarSystem } from "./useSystems";

/* All inputs are strings in HTML; we coerce in onSubmit */
type FormValues = {
  name: string;
  dc_capacity_kwp: string;
  ac_capacity_kw: string;
  panel_count: string;
  panel_rating_w: string;
  tilt_degrees: string;
  azimuth_degrees: string;
  inverter_make: string;
  commissioning_date: string;
};

type ParsedValues = {
  name: string;
  dc_capacity_kwp: number;
  ac_capacity_kw: number;
  panel_count?: number;
  panel_rating_w?: number;
  tilt_degrees?: number;
  azimuth_degrees?: number;
  inverter_make?: string;
  commissioning_date?: string;
};

function parseValues(v: FormValues): ParsedValues | null {
  const dc = Number(v.dc_capacity_kwp);
  const ac = Number(v.ac_capacity_kw);
  if (!v.name.trim()) return null;
  if (!dc || dc <= 0) return null;
  if (!ac || ac <= 0) return null;
  return {
    name: v.name.trim(),
    dc_capacity_kwp: dc,
    ac_capacity_kw: ac,
    panel_count: v.panel_count ? Number(v.panel_count) : undefined,
    panel_rating_w: v.panel_rating_w ? Number(v.panel_rating_w) : undefined,
    tilt_degrees: v.tilt_degrees ? Number(v.tilt_degrees) : undefined,
    azimuth_degrees: v.azimuth_degrees ? Number(v.azimuth_degrees) : undefined,
    inverter_make: v.inverter_make || undefined,
    commissioning_date: v.commissioning_date || undefined,
  };
}

interface SystemFormProps {
  open: boolean;
  onClose: () => void;
  siteId: string;
  system?: SolarSystem;
}

function Field({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-app-text mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

const inputClass = (hasError?: boolean) => cn(
  "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal",
  hasError ? "border-danger" : "border-border"
);

export default function SystemForm({ open, onClose, siteId, system }: SystemFormProps) {
  const isEdit = !!system;
  const createMutation = useCreateSystem(siteId);
  const updateMutation = useUpdateSystem(system?.id ?? "");

  const [formError, setFormError] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<FormValues>({
      defaultValues: {
        name: "", dc_capacity_kwp: "25", ac_capacity_kw: "20",
        panel_count: "100", panel_rating_w: "250",
        tilt_degrees: "15", azimuth_degrees: "180",
        inverter_make: "", commissioning_date: "",
      },
    });

  useEffect(() => {
    if (system) {
      reset({
        name: system.name,
        dc_capacity_kwp: String(system.dc_capacity_kwp),
        ac_capacity_kw: String(system.ac_capacity_kw),
        panel_count: String(system.panel_count),
        panel_rating_w: String(system.panel_rating_w),
        tilt_degrees: String(system.tilt_degrees),
        azimuth_degrees: String(system.azimuth_degrees),
        inverter_make: system.inverter_make ?? "",
        commissioning_date: system.commissioning_date ?? "",
      });
    } else {
      reset({ name: "", dc_capacity_kwp: "25", ac_capacity_kw: "20",
        panel_count: "100", panel_rating_w: "250", tilt_degrees: "15",
        azimuth_degrees: "180", inverter_make: "", commissioning_date: "" });
    }
  }, [system, reset]);

  async function onSubmit(values: FormValues) {
    setFormError("");
    const parsed = parseValues(values);
    if (!parsed) {
      setFormError("Please fill all required fields with valid numbers.");
      return;
    }
    if (parsed.ac_capacity_kw > parsed.dc_capacity_kwp * 1.25) {
      setFormError("AC capacity cannot exceed DC capacity × 1.25.");
      return;
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(parsed);
      } else {
        await createMutation.mutateAsync(parsed);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to save system.");
    }
  }

  const mutation = isEdit ? updateMutation : createMutation;
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-app-text">
            {isEdit ? "Edit Solar System" : "Add Solar System"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-app-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {formError && (
            <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}

          <Field label="System name" required>
            <input {...register("name")} placeholder="e.g. Rooftop Array A" className={inputClass()} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="DC Capacity (kWp)" required hint="Total panel capacity">
              <input type="number" step="0.1" {...register("dc_capacity_kwp")} className={inputClass()} />
            </Field>
            <Field label="AC Capacity (kW)" required hint="Inverter output">
              <input type="number" step="0.1" {...register("ac_capacity_kw")} className={inputClass()} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Panel count">
              <input type="number" {...register("panel_count")} className={inputClass()} />
            </Field>
            <Field label="Panel rating (W)" hint="Watts per panel">
              <input type="number" {...register("panel_rating_w")} className={inputClass()} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tilt angle (°)" hint="0–90°">
              <input type="number" step="0.5" {...register("tilt_degrees")} className={inputClass()} />
            </Field>
            <Field label="Azimuth (°)" hint="180° = South">
              <input type="number" step="1" {...register("azimuth_degrees")} className={inputClass()} />
            </Field>
          </div>

          <Field label="Inverter make / model">
            <input {...register("inverter_make")} placeholder="e.g. SMA Sunny Boy"
              className={inputClass()} />
          </Field>

          <Field label="Commissioning date">
            <input type="date" {...register("commissioning_date")} className={inputClass()} />
          </Field>
        </form>

        <div className="border-t border-border px-5 py-4 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted hover:bg-canvas">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-teal py-2.5 text-sm font-medium text-white hover:bg-deep-teal disabled:opacity-60">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add system"}
          </button>
        </div>
      </aside>
    </>
  );
}
