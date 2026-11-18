"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFile: (file: File) => void;
  accept?: string;
  maxMB?: number;
  label?: string;
}

export default function FileDropzone({
  onFile,
  accept = ".csv",
  maxMB = 50,
  label = "Drag & drop your CSV here",
}: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setError(null);
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }
    if (f.size > maxMB * 1024 * 1024) {
      setError(`File exceeds ${maxMB} MB limit.`);
      return;
    }
    setFile(f);
    onFile(f);
  }

  function clearFile() {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
            dragging
              ? "border-primary-teal bg-pale-mint"
              : "border-border hover:border-primary-teal/50 hover:bg-canvas"
          )}
        >
          <Upload className="h-10 w-10 text-muted mb-3" />
          <p className="text-sm font-medium text-app-text">{label}</p>
          <p className="text-xs text-muted mt-1 mb-3">or</p>
          <span className="rounded-lg bg-primary-teal px-4 py-2 text-sm font-medium text-white">
            Browse Files
          </span>
          <p className="text-xs text-muted mt-3">Max {maxMB} MB · CSV files only</p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-solar-green/30 bg-pale-mint px-4 py-3">
          <FileText className="h-8 w-8 text-solar-green shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-app-text truncate">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-muted hover:text-danger transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
