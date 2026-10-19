
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  INITIAL_PLAN,
  type ListField,
  type TravelPlan,
} from "@/types/travel";

import { BrowserStorage } from "@/lib/storage";

import {
  normalizeStep,
} from "@/features/planner/planner.config";

const STORAGE_KEY = "travelwise-plan-v6";

const MIN_INDIVIDUAL_BUDGET = 0;

function clamp(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, parsed)
  );
}

function normalizeAmount(
  value: unknown,
  fallback: number
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : fallback;
}

function normalizePlan(
  value: Partial<TravelPlan>
): TravelPlan {
  const adults = clamp(value.adults, 1, 20, 1);
  const children = clamp(value.children, 0, 20, 0);
  const travelerCount = adults + children;
  const savedBudgets = Array.isArray(
    value.individualBudgets
  )
    ? value.individualBudgets
        .map(item =>
          clamp(
            item,
            MIN_INDIVIDUAL_BUDGET,
            Number.MAX_SAFE_INTEGER,
            0
          )
        )
    : [];
  const individualBudgets = Array.from(
    { length: travelerCount },
    (_, index) =>
      savedBudgets[index] ??
      Math.round(
        (Number(value.budget) || INITIAL_PLAN.budget) /
          travelerCount
      )
  );
  const travelerNames = Array.from(
    { length: travelerCount },
    (_, index) =>
      Array.isArray(value.travelerNames)
        ? value.travelerNames[index] ?? ""
        : ""
  );
  const accommodationChoices =
    Array.isArray(value.accommodationChoices)
      ? value.accommodationChoices
          .filter(
            item => typeof item === "string"
          )
          .slice(0, 3)
      : value.accommodation
        ? [value.accommodation]
        : [];

  return {
    ...INITIAL_PLAN,
    ...value,

    step: normalizeStep(Number(value.step) || 1),

    budget: normalizeAmount(
      value.budget,
      0
    ),

    adults,
    children,
    individualBudgets,
    travelerNames,
    recommendationFilters:
      value.recommendationFilters &&
      typeof value.recommendationFilters ===
        "object"
        ? value.recommendationFilters
        : {},
    recommendationFilterIndex: Math.max(
      0,
      Math.trunc(
        Number(value.recommendationFilterIndex) || 0
      )
    ),
    recommendationPreviewReady:
      value.recommendationPreviewReady === true,
    accommodationChoices,
    budgetSelected:
      value.budgetSelected === true,
    travelDatesSelected:
      value.travelDatesSelected === true,
  };
}

export function useTravelPlanner() {
  const [plan, setPlan] = useState<TravelPlan>(
    INITIAL_PLAN
  );

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = BrowserStorage.read<
      Partial<TravelPlan>
    >(STORAGE_KEY);

    if (saved && typeof saved === "object") {
      setPlan(normalizePlan(saved));
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    BrowserStorage.write(STORAGE_KEY, plan);
  }, [plan, ready]);

  const update = useCallback(
    <K extends keyof TravelPlan>(
      key: K,
      value: TravelPlan[K]
    ) => {
      setPlan(current =>
        normalizePlan({
          ...current,
          [key]: value,
        })
      );
    },
    []
  );

  const toggle = useCallback(
    (field: ListField, value: string) => {
      setPlan(current => {
        const selected = current[field];

        const nextSelected = selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected, value];

        return {
          ...current,
          [field]: nextSelected,
        };
      });
    },
    []
  );

  const goTo = useCallback((step: number) => {
    setPlan(current => ({
      ...current,
      step: normalizeStep(step),
    }));

    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  const reset = useCallback(() => {
    setPlan(INITIAL_PLAN);
    BrowserStorage.remove(STORAGE_KEY);
  }, []);

  return {
    plan,
    ready,
    update,
    toggle,
    goTo,
    reset,
  };
}
