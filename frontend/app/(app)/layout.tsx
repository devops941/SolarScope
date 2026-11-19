"use client";

import { Suspense, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-full bg-canvas">
        <Suspense fallback={<div className="w-[268px] bg-[#0D212F] shrink-0" />}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </Suspense>

        <div className="flex flex-1 flex-col min-w-0 lg:pl-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 w-full flex flex-col justify-between"
            role="main"
          >
            <div className="w-full max-w-[1720px] mx-auto flex-1">
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
