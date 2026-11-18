"use client";

import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import SpineNav from "@/components/perihelion/SpineNav";
import SentenceRibbon from "@/components/perihelion/SentenceRibbon";
import SunArcStrip from "@/components/perihelion/SunArcStrip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
        {/* Top Signature 1: Sentence Ribbon (Context) */}
        <Suspense fallback={<div className="h-10 bg-paper border-b border-rule" />}>
          <SentenceRibbon />
        </Suspense>

        {/* Top Signature 2: Sun-Arc Strip */}
        <SunArcStrip />

        {/* Main Application Body (offset right by 44px on desktop for SpineNav) */}
        <div className="flex-1 flex flex-col md:pr-[44px] pb-14 md:pb-6">
          <main
            id="main-content"
            className="flex-1 w-full max-w-[1360px] mx-auto p-4 sm:p-8"
            role="main"
          >
            {children}
          </main>
        </div>

        {/* Right Signature 3: Spine Navigation (Fixed right-edge strip) */}
        <SpineNav />
      </div>
    </QueryClientProvider>
  );
}
