
export const PLANNER_STEPS = [
  "Discover",
  "Countries of Interest",
  "Estimated Budget",
  "What are you looking for?",
  "Select Services",
  "Explore Destinations",
  "Accommodation Insights",
] as const;

export const PRIMARY_NAVIGATION = [
  { label: "Home", step: 1 },
  { label: "Explore", step: 7 },
  { label: "Trips", step: 8 },
] as const;

export const PLANNER_STEP_COUNT = PLANNER_STEPS.length;

export function normalizeStep(step: number): number {
  if (!Number.isFinite(step)) {
    return 1;
  }

  return Math.min(
    PLANNER_STEP_COUNT,
    Math.max(1, Math.trunc(step))
  );
}

export function getStepName(step: number): string {
  return PLANNER_STEPS[normalizeStep(step) - 1];
}

export function getStepProgress(step: number): number {
  return Math.round(
    (normalizeStep(step) / PLANNER_STEP_COUNT) * 100
  );
}
