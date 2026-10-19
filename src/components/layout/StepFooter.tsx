
"use client";

import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

import {
  PLANNER_STEP_COUNT,
  getStepProgress,
} from "@/features/planner/planner.config";

interface StepFooterProps {
  currentStep: number;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
  onRestart: () => void;
}

export function StepFooter({
  currentStep,
  canContinue,
  onBack,
  onNext,
  onRestart,
}: StepFooterProps) {
  if (currentStep === 1) {
    return null;
  }

  const isLastStep =
    currentStep === PLANNER_STEP_COUNT;

  return (
    <footer className="step-footer">
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        <ArrowLeft
          size={17}
          aria-hidden="true"
        />
        Back
      </button>

      <div
        className="footer-progress"
        aria-label={
          `Step ${currentStep} of ${PLANNER_STEP_COUNT}`
        }
      >
        <span
          style={{
            width: `${getStepProgress(currentStep)}%`,
          }}
        />
      </div>

      {isLastStep ? (
        <button
          type="button"
          className="primary-button"
          onClick={onRestart}
        >
          <RotateCcw size={16} />
          Restart
        </button>
      ) : (
        <button
          type="button"
          className="primary-button"
          disabled={!canContinue}
          onClick={onNext}
        >
          Next
          <ArrowRight size={17} />
        </button>
      )}
    </footer>
  );
}
