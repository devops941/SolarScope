"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSites } from "@/features/sites/useSites";
import { useCreateSystem, type SolarSystem } from "./useSystems";

type FormValues = {
  site_id: string;
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

interface SystemCreateModalProps {
  open: boolean;
  onClose: () => void;
  defaultSiteId?: string;
  onCreated?: (system: SolarSystem) => void;
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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

const inputClass = (hasError?: boolean) =>
  cn(
    "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal",
    hasError ? "border-danger" : "border-border"
  );

export default function SystemCreateModal({
  open,
  onClose,
  defaultSiteId,
  onCreated,
}: SystemCreateModalProps) {
  const { data: sitesData } = useSites();
  const sites = sitesData?.items ?? [];

  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId ?? "");
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateSystem(selectedSiteId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      site_id: defaultSiteId ?? "",
      name: "",
      dc_capacity_kwp: "25",
      ac_capacity_kw: "22.5",
      panel_count: "60",
      panel_rating_w: "415",
      tilt_degrees: "15",
      azimuth_degrees: "180",
      inverter_make: "",
      commissioning_date: "",
    },
  });

  const dcVal = watch("dc_capacity_kwp");

  // Keep selectedSiteId in sync with props or form
  useEffect(() => {
    if (defaultSiteId) {
      setSelectedSiteId(defaultSiteId);
      setValue("site_id", defaultSiteId);
    } else if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
      setValue("site_id", sites[0].id);
    }
  }, [defaultSiteId, sites, selectedSiteId, setValue]);

  // Auto-calculate suggested AC capacity (90% of DC)
  useEffect(() => {
    const dc = Number(dcVal);
    if (dc > 0) {
      setValue("ac_capacity_kw", String(Math.round(dc * 0.9 * 10) / 10));
    }
  }, [dcVal, setValue]);

  async function onSubmit(v: FormValues) {
    const targetSiteId = v.site_id || selectedSiteId;
    if (!targetSiteId) {
      setServerError("Please select a target solar site.");
      return;
    }

    const dc = Number(v.dc_capacity_kwp);
    const ac = Number(v.ac_capacity_kw);

    if (!v.name.trim()) {
      setServerError("System name is required.");
      return;
    }
    if (!dc || dc <= 0) {
      setServerError("DC Capacity must be greater than 0.");
      return;
    }
    if (!ac || ac <= 0) {
      setServerError("AC Capacity must be greater than 0.");
      return;
    }
    if (ac > dc * 1.25) {
      setServerError(`AC capacity cannot exceed DC capacity × 1.25 (max ${dc * 1.25} kW).`);
      return;
    }

    setServerError(null);

    try {
      const created = await createMutation.mutateAsync({
        name: v.name.trim(),
        dc_capacity_kwp: dc,
        ac_capacity_kw: ac,
        panel_count: v.panel_count ? Number(v.panel_count) : undefined,
        panel_rating_w: v.panel_rating_w ? Number(v.panel_rating_w) : undefined,
        tilt_degrees: v.tilt_degrees ? Number(v.tilt_degrees) : undefined,
        azimuth_degrees: v.azimuth_degrees ? Number(v.azimuth_degrees) : undefined,
        inverter_make: v.inverter_make || undefined,
        commissioning_date: v.commissioning_date || undefined,
      });

      reset();
      onCreated?.(created);
      onClose();
    } catch (err: any) {
      setServerError(err?.message || "Failed to create solar system");
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pale-mint text-primary-teal">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-app-text">Add Solar System</h2>
              <p className="text-xs text-muted">Configure PV array, inverters, and physical orientation</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-app-text transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5">
          {serverError && (
            <div className="rounded-xl border border-danger/30 bg-red-50 p-3.5 text-xs text-danger font-medium">
              {serverError}
            </div>
          )}

          {/* Target Site */}
          <Field label="Parent Solar Site" required hint="The site location where this PV system is installed.">
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
                setValue("site_id", e.target.value);
              }}
              className={inputClass()}
            >
              <option value="">Select a site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.timezone})
                </option>
              ))}
            </select>
          </Field>

          {/* System Name */}
          <Field label="System Name" required hint="Unique identifier (e.g. Array-1 East, Rooftop Inverter-A)">
            <input
              {...register("name", { required: true })}
              placeholder="e.g. Rooftop Array A"
              className={inputClass(!!errors.name)}
            />
          </Field>

          {/* Capacities */}
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="DC Capacity (kWp)" required hint="Total panel capacity">
              <input
                type="number"
                step="0.1"
                min="0.1"
                {...register("dc_capacity_kwp", { required: true })}
                className={inputClass(!!errors.dc_capacity_kwp)}
              />
            </Field>

            <Field label="AC Capacity (kW)" required hint="Inverter rated output">
              <input
                type="number"
                step="0.1"
                min="0.1"
                {...register("ac_capacity_kw", { required: true })}
                className={inputClass(!!errors.ac_capacity_kw)}
              />
            </Field>
          </div>

          {/* Panels */}
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Panel Count" hint="Total PV modules">
              <input
                type="number"
                min="0"
                {...register("panel_count")}
                placeholder="e.g. 60"
                className={inputClass()}
              />
            </Field>

            <Field label="Panel Rating (W)" hint="Per panel wattage">
              <input
                type="number"
                min="0"
                {...register("panel_rating_w")}
                placeholder="e.g. 415"
                className={inputClass()}
              />
            </Field>
          </div>

          {/* Angles */}
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Tilt Angle (°)" hint="0° (flat) to 90° (vertical)">
              <input
                type="number"
                step="0.5"
                min="0"
                max="90"
                {...register("tilt_degrees")}
                className={inputClass()}
              />
            </Field>

            <Field label="Azimuth (°)" hint="180° = South, 90° = East">
              <input
                type="number"
                step="1"
                min="0"
                max="360"
                {...register("azimuth_degrees")}
                className={inputClass()}
              />
            </Field>
          </div>

          {/* Inverter Make */}
          <Field label="Inverter Make / Model" hint="Manufacturer and serial line">
            <input
              {...register("inverter_make")}
              placeholder="e.g. SMA Sunny Boy 25000TL"
              className={inputClass()}
            />
          </Field>

          {/* Commissioning Date */}
          <Field label="Commissioning Date">
            <input
              type="date"
              {...register("commissioning_date")}
              className={inputClass()}
            />
          </Field>
        </form>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-canvas/30">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-app-text transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || createMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-primary-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition disabled:opacity-50"
          >
            {isSubmitting || createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Adding System…</span>
              </>
            ) : (
              <span>Add System</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
