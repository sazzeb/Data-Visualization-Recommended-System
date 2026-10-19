
"use client";

import type { ReactNode } from "react";

import { AppSidebar } from "./AppSidebar";

interface AppWorkspaceProps {
  currentStep: number;
  sidebarOpen: boolean;
  children: ReactNode;
  onNavigate: (step: number) => void;
  onCloseSidebar: () => void;
}

export function AppWorkspace({
  currentStep,
  sidebarOpen,
  children,
  onNavigate,
  onCloseSidebar,
}: AppWorkspaceProps) {
  return (
    <div
      className={`workspace ${
        sidebarOpen
          ? "workspace--expanded"
          : "workspace--collapsed"
      }`}
    >
      {sidebarOpen && (
        <>
          <button
            type="button"
            className="mobile-sidebar-backdrop"
            aria-label="Close step navigation"
            onClick={onCloseSidebar}
          />

          <AppSidebar
            currentStep={currentStep}
            onChoose={onNavigate}
            onClose={onCloseSidebar}
          />
        </>
      )}

      <main
        className="main-area"
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
