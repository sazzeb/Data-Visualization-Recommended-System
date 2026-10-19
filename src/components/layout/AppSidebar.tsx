
"use client";

import { Check, ChevronLeft } from "lucide-react";

import {
  PLANNER_STEPS,
  getStepProgress,
} from "@/features/planner/planner.config";

interface AppSidebarProps {
  currentStep: number;
  onChoose: (step: number) => void;
  onClose: () => void;
}

export function AppSidebar({
  currentStep,
  onChoose,
  onClose,
}: AppSidebarProps) {
  const progress = getStepProgress(currentStep);

  return (
    <aside
      id="travelwise-step-navigation"
      className="step-sidebar sidebar-panel"
      aria-label="Travel planner steps"
    >
      <div className="sidebar-heading">
        <p className="rail-eyebrow">
          YOUR TRAVEL PLAN
        </p>

        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Hide step navigation"
        >
          <ChevronLeft
            size={18}
            aria-hidden="true"
          />
        </button>
      </div>

      <h2>Plan your next getaway</h2>

      <p className="rail-description">
        Move between the twelve screens and see
        your choices come together.
      </p>

      <nav
        className="step-nav"
        aria-label="Choose a planning step"
      >
        {PLANNER_STEPS.map((name, index) => {
          const step = index + 1;
          const isCurrent = step === currentStep;
          const isComplete = step < currentStep;

          const className = [
            "step-link",
            isCurrent ? "current" : "",
            isComplete ? "finished" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={name}
              type="button"
              className={className}
              aria-current={
                isCurrent ? "step" : undefined
              }
              onClick={() => onChoose(step)}
            >
              <span className="step-number">
                {isComplete ? (
                  <Check
                    size={14}
                    aria-hidden="true"
                  />
                ) : (
                  step
                )}
              </span>

              <span>{name}</span>
            </button>
          );
        })}
      </nav>

      <div className="rail-bottom">
        <div className="rail-progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        <strong>{progress}% complete</strong>
      </div>
    </aside>
  );
}

