"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { apiClient, extractError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

interface RollbackDialogProps {
  importId: string;
  filename: string;
  acceptedCount: number;
  onClose: () => void;
  onRolledBack: () => void;
}

export default function RollbackDialog({
  importId, filename, acceptedCount, onClose, onRolledBack,
}: RollbackDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  async function handleRollback() {
    setLoading(true);
    setError("");
    try {
      await apiClient.post(`/imports/${importId}/rollback`);
      qc.invalidateQueries({ queryKey: ["imports"] });
      onRolledBack();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <h2 className="text-base font-semibold text-app-text">Rollback Import</h2>
            </div>
            <button onClick={onClose} className="text-muted hover:text-app-text">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-muted mb-4">
            This will delete all <strong className="text-app-text">{acceptedCount.toLocaleString()} readings</strong> that
            were created by the import <strong className="text-app-text">{filename}</strong>.
          </p>

          <div className="rounded-lg bg-orange-50 border border-warning/30 px-4 py-3 text-sm text-warning mb-5">
            <strong>This cannot be undone.</strong> Other imports and their readings are not affected.
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm text-muted hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={handleRollback}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-danger py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Rolling back…" : "Rollback"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
