"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useCreateSite, useUpdateSite, type Site } from "./useSites";

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Colombo", "Asia/Dubai", "Asia/Singapore",
  "Europe/London", "America/New_York", "America/Los_Angeles",
  "Australia/Sydney", "UTC",
];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  timezone: z.string().min(1, "Timezone is required"),
  address: z.string().optional(),
  initial_dc_capacity_kwp: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SiteFormProps {
  open: boolean;
  onClose: () => void;
  site?: Site;
}

export default function SiteForm({ open, onClose, site }: SiteFormProps) {
  const isEdit = !!site;
  const createMutation = useCreateSite();
  const updateMutation = useUpdateSite(site?.id ?? "");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { name: "", timezone: "Asia/Kolkata", address: "", initial_dc_capacity_kwp: "25.0" },
    });

  useEffect(() => {
    if (site) {
      reset({ name: site.name, timezone: site.timezone, address: site.address ?? "", initial_dc_capacity_kwp: "" });
    } else {
      reset({ name: "", timezone: "Asia/Kolkata", address: "", initial_dc_capacity_kwp: "25.0" });
    }
  }, [site, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          name: values.name,
          timezone: values.timezone,
          address: values.address,
        });
      } else {
        const createdSite = await createMutation.mutateAsync({
          name: values.name,
          timezone: values.timezone,
          address: values.address,
        });
        const cap = values.initial_dc_capacity_kwp ? Number(values.initial_dc_capacity_kwp) : 25.0;
        if (cap > 0 && createdSite?.id) {
          try {
            await apiClient.post(`/sites/${createdSite.id}/systems`, {
              name: `${values.name} - Array 1`,
              dc_capacity_kwp: cap,
              ac_capacity_kw: Math.round(cap * 0.9 * 10) / 10,
              tilt_degrees: 15,
              azimuth_degrees: 180,
            });
          } catch {
            // non-fatal if array creation fails
          }
        }
      }
      onClose();
    } catch {
      // error shown inline
    }
  }

  const mutation = isEdit ? updateMutation : createMutation;
  const serverError = mutation.error?.message;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-surface shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-app-text">
            {isEdit ? "Edit Site" : "Create New Site"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-app-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {serverError && (
            <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">
              Site name <span className="text-danger">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Chennai Rooftop Plant"
              className={cn(
                "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal",
                errors.name ? "border-danger" : "border-border"
              )}
            />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">
              Timezone <span className="text-danger">*</span>
            </label>
            <select
              {...register("timezone")}
              className={cn(
                "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal",
                errors.timezone ? "border-danger" : "border-border"
              )}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            {errors.timezone && <p className="text-xs text-danger mt-1">{errors.timezone.message}</p>}
            <p className="text-xs text-muted mt-1">Used for display and day-boundary calculations.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">Address</label>
            <input
              {...register("address")}
              placeholder="e.g. Anna Nagar, Chennai"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">
                Initial Solar Array Capacity (kWp)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                {...register("initial_dc_capacity_kwp")}
                placeholder="25.0"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal"
              />
              <p className="text-xs text-muted mt-1">
                Creates a default solar array for CSV imports. Default: 25.0 kWp.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-teal py-2.5 text-sm font-medium text-white hover:bg-deep-teal disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create site"}
          </button>
        </div>
      </aside>
    </>
  );
}
