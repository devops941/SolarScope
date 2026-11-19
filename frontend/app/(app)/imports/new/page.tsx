"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Download, Plus, Zap, AlertCircle } from "lucide-react";
import FileDropzone from "@/components/ui/FileDropzone";
import CsvMappingTable from "@/components/imports/CsvMappingTable";
import ImportPreviewTable from "@/components/imports/ImportPreviewTable";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite, useCreateSystem } from "@/features/systems/useSystems";
import SystemForm from "@/features/systems/SystemForm";
import { useUploadPreview, useConfirmImport, type PreviewResult } from "@/features/imports/useImports";
import ImportProgress from "@/features/imports/ImportProgress";
import { cn } from "@/lib/utils";

const STEPS = [
  "Choose Site/System",
  "Upload CSV",
  "Map Columns",
  "Units & Timezone",
  "Preview",
  "Review",
  "Duplicate Policy",
  "Confirm",
];

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Colombo", "Asia/Dubai", "Asia/Singapore",
  "UTC", "Europe/London", "America/New_York",
];

export default function ImportWizardPage() {
  const [step, setStep] = useState(0);
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceTimezone, setSourceTimezone] = useState("Asia/Kolkata");
  const [energyMode, setEnergyMode] = useState("interval");
  const [duplicatePolicy, setDuplicatePolicy] = useState("skip");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Array<{ source_column: string; canonical_column: string }>>([]);
  const [confirmedImportId, setConfirmedImportId] = useState<string | null>(null);

  const [createSystemOpen, setCreateSystemOpen] = useState(false);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: sitesData } = useSites();
  const { data: systems = [] } = useSystemsBySite(siteId);
  const createSystemMutation = useCreateSystem(siteId);
  const uploadMutation = useUploadPreview();
  const confirmMutation = useConfirmImport();

  const sites = sitesData?.items ?? [];

  // Auto-select system when available or created
  useEffect(() => {
    if (systems.length > 0 && !systemId) {
      setSystemId(systems[0].id);
    }
  }, [systems, systemId]);

  async function handleQuickCreateSystem() {
    if (!siteId) return;
    setIsQuickCreating(true);
    setCreateError(null);
    try {
      const selectedSite = sites.find((s) => s.id === siteId);
      const siteName = selectedSite ? selectedSite.name : "Solar";
      const created = await createSystemMutation.mutateAsync({
        name: `${siteName} - Array 1`,
        dc_capacity_kwp: 25.0,
        ac_capacity_kw: 22.5,
        tilt_degrees: 15,
        azimuth_degrees: 180,
      });
      setSystemId(created.id);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create solar system");
    } finally {
      setIsQuickCreating(false);
    }
  }

  async function runPreview() {
    if (!file || !siteId || !systemId) return;
    try {
      const result = await uploadMutation.mutateAsync({ file, siteId, systemId, sourceTimezone });
      setPreview(result);
      setMapping(result.suggested_mapping);
      setStep(2); // jump to mapping step
    } catch (err: any) {
      // error shown inline
    }
  }

  function canProceed(): boolean {
    if (step === 0) return !!(siteId && systemId);
    if (step === 1) return !!file;
    if (step === 2) {
      const hasTs = mapping.some((m) => m.canonical_column === "timestamp");
      const hasMeas = mapping.some((m) => m.canonical_column === "power_kw" || m.canonical_column === "energy_kwh");
      return hasTs && hasMeas;
    }
    return true;
  }

  async function handleNext() {
    if (step === 1) {
      await runPreview();
      return;
    }
    if (step === 7 && preview) {
      // Final confirm step — call the confirm API
      try {
        await confirmMutation.mutateAsync({
          importId: preview.import_id,
          duplicatePolicy,
          sourceTimezone,
          energyMode,
        });
        setConfirmedImportId(preview.import_id);
        setStep((s) => s + 1); // move to "done" state
      } catch {
        // error shown in UI
      }
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <div className="max-w-[860px] mx-auto">
      {/* Back */}
      <Link href="/imports" className="flex items-center gap-1 text-sm text-muted hover:text-app-text mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Imports
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-text">Import CSV Data</h1>
        <p className="text-sm text-muted mt-0.5">Upload solar performance readings in {STEPS.length} steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center overflow-x-auto pb-3 mb-6 gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < step ? "bg-solar-green text-white" :
                i === step ? "bg-primary-teal text-white" :
                "bg-border text-muted"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-[10px] whitespace-nowrap",
                i === step ? "text-primary-teal font-medium" : "text-muted"
              )}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-6 mx-1 mb-4", i < step ? "bg-solar-green" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl bg-surface border border-border p-6 min-h-[320px]">

        {/* Step 0: Choose Site/System */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-app-text">Choose Site & Solar System</h2>
              <Link
                href="/sites"
                className="text-xs text-primary-teal hover:underline font-medium"
              >
                + Manage Sites
              </Link>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">Site</label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setSystemId("");
                  setCreateError(null);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
              >
                <option value="">Select a site…</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {siteId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-app-text">Solar System</label>
                  <button
                    type="button"
                    onClick={() => setCreateSystemOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary-teal hover:text-deep-teal transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create New System
                  </button>
                </div>

                {createError && (
                  <div className="rounded-lg border border-danger/30 bg-red-50 p-3 text-xs text-danger">
                    {createError}
                  </div>
                )}

                {systems.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={systemId}
                      onChange={(e) => setSystemId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    >
                      <option value="">Select a system…</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.dc_capacity_kwp} kWp DC)</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted">
                      Telemetry logs will be normalized and linked to this solar array.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">No Solar System Found for this Site</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Inverter telemetry readings must be attached to a solar array system (e.g. 25 kWp). You can create one right now:
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleQuickCreateSystem}
                        disabled={isQuickCreating}
                        className="flex items-center gap-1.5 rounded-lg bg-primary-teal px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-deep-teal transition disabled:opacity-50"
                      >
                        {isQuickCreating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Creating System…</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5" />
                            <span>⚡ Quick Add 25 kWp Solar Array</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setCreateSystemOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-app-text hover:bg-canvas transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Custom System Specifications…</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-app-text">Upload CSV File</h2>
            <FileDropzone onFile={setFile} />
            {uploadMutation.error && (
              <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
                {uploadMutation.error.message}
              </div>
            )}
            <div className="flex gap-3 text-xs">
              <a href="/api/v1/imports/template" download className="flex items-center gap-1 text-primary-teal hover:underline">
                <Download className="h-3 w-3" /> Blank template
              </a>
              <span className="text-muted">·</span>
              <a href="/api/v1/imports/sample?variant=clean" download className="flex items-center gap-1 text-primary-teal hover:underline">
                <Download className="h-3 w-3" /> Sample 30-day CSV
              </a>
              <span className="text-muted">·</span>
              <a href="/api/v1/imports/sample?variant=validation" download className="flex items-center gap-1 text-primary-teal hover:underline">
                <Download className="h-3 w-3" /> Validation test CSV
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-app-text">Map Columns</h2>
              <span className="text-xs text-muted">
                {preview.total_rows} rows detected · {preview.headers.length} columns
              </span>
            </div>
            <CsvMappingTable
              mapping={mapping}
              columnTypes={preview.column_types}
              onChange={setMapping}
            />
          </div>
        )}

        {/* Step 3: Units & Timezone */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-app-text">Units & Timezone</h2>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">Source Timezone</label>
              <select
                value={sourceTimezone}
                onChange={(e) => setSourceTimezone(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
              <p className="text-xs text-muted mt-1">
                If your timestamps have no timezone offset, we apply this timezone.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">Energy column type</label>
              <div className="flex gap-3">
                {[
                  { value: "interval", label: "Interval energy", desc: "kWh per interval (e.g. per 15 min)" },
                  { value: "cumulative", label: "Cumulative meter", desc: "Ever-increasing kWh counter" },
                ].map(({ value, label, desc }) => (
                  <label key={value} className={cn(
                    "flex-1 cursor-pointer rounded-xl border p-4",
                    energyMode === value ? "border-primary-teal bg-pale-mint" : "border-border hover:bg-canvas"
                  )}>
                    <input
                      type="radio"
                      name="energyMode"
                      value={value}
                      checked={energyMode === value}
                      onChange={() => setEnergyMode(value)}
                      className="sr-only"
                    />
                    <p className="text-sm font-medium text-app-text">{label}</p>
                    <p className="text-xs text-muted mt-0.5">{desc}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && preview && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-app-text">Preview — first {preview.sample_rows.length} rows</h2>
            <ImportPreviewTable rows={preview.sample_rows as any} counts={preview.counts} />
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && preview && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-app-text">Review Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "File", value: preview.filename },
                { label: "Checksum (SHA-256)", value: preview.checksum.slice(0, 16) + "…" },
                { label: "Rows sampled", value: String(preview.total_rows) },
                { label: "Accepted", value: `${preview.counts.accepted} rows` },
                { label: "Rejected", value: preview.counts.rejected > 0 ? `${preview.counts.rejected} rows` : "None" },
                { label: "Flagged", value: preview.counts.flagged > 0 ? `${preview.counts.flagged} rows` : "None" },
                { label: "Timezone", value: sourceTimezone },
                { label: "Energy mode", value: energyMode },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-canvas px-4 py-3">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-sm font-medium text-app-text mt-0.5 break-all">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Duplicate Policy */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-app-text">Duplicate Row Policy</h2>
            <p className="text-sm text-muted">
              What should happen if this file contains timestamps that already exist for this system?
            </p>
            <div className="space-y-3">
              {[
                { value: "skip", label: "Skip duplicates", desc: "Keep the existing row. New row is counted as skipped. (Recommended)" },
                { value: "replace", label: "Replace duplicates", desc: "Overwrite the existing row with the new value. Previous value is recorded in audit." },
                { value: "reject", label: "Reject duplicates", desc: "Add duplicate rows to the error file. Strict governance mode." },
              ].map(({ value, label, desc }) => (
                <label key={value} className={cn(
                  "flex items-start gap-3 cursor-pointer rounded-xl border p-4",
                  duplicatePolicy === value ? "border-primary-teal bg-pale-mint" : "border-border hover:bg-canvas"
                )}>
                  <input
                    type="radio"
                    name="policy"
                    value={value}
                    checked={duplicatePolicy === value}
                    onChange={() => setDuplicatePolicy(value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-app-text">{label}</p>
                    <p className="text-xs text-muted mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Confirm */}
        {step === 7 && preview && !confirmedImportId && (
          <div className="text-center py-6 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pale-mint mx-auto">
              <Check className="h-8 w-8 text-solar-green" />
            </div>
            <h2 className="text-base font-semibold text-app-text">Ready to import</h2>
            <p className="text-sm text-muted max-w-sm mx-auto">
              <strong>{preview.counts.accepted}</strong> rows will be written to the readings collection.
              {preview.counts.rejected > 0 && (
                <> <strong>{preview.counts.rejected}</strong> rejected rows will be available as a download.</>
              )}
            </p>
            {confirmMutation.error && (
              <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
                {confirmMutation.error.message}
              </div>
            )}
          </div>
        )}

        {/* After confirm: live progress */}
        {confirmedImportId && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-app-text">Import in progress</h2>
            <ImportProgress
              importId={confirmedImportId}
              onDone={(status) => {
                if (status === "completed" || status === "completed_with_warnings") {
                  // Stay on page so user can see results
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-canvas disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {confirmedImportId ? (
          <Link
            href="/imports"
            className="flex items-center gap-1.5 rounded-lg bg-solar-green px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Check className="h-4 w-4" /> View All Imports
          </Link>
        ) : step < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed() || uploadMutation.isPending || confirmMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary-teal px-4 py-2 text-sm font-medium text-white hover:bg-deep-teal disabled:opacity-50"
          >
            {(uploadMutation.isPending || confirmMutation.isPending) ? (
              <><Loader2 className="h-4 w-4 animate-spin" />
                {uploadMutation.isPending ? "Uploading…" : "Confirming…"}</>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canProceed() || confirmMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-solar-green px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {confirmMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
            ) : (
              <><Check className="h-4 w-4" /> Confirm Import</>
            )}
          </button>
        )}
      </div>

      {/* System Form Drawer */}
      {siteId && (
        <SystemForm
          open={createSystemOpen}
          onClose={() => setCreateSystemOpen(false)}
          siteId={siteId}
        />
      )}
    </div>
  );
}
