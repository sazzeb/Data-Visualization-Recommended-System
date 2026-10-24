
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppWorkspace } from "@/components/layout/AppWorkspace";
import { StepFooter } from "@/components/layout/StepFooter";

import { AccommodationDetail } from
  "@/components/travel/accommodation-detail";

import { PlannerStep } from
  "@/components/travel/planner-steps";

import { RecommendationPreview } from
  "@/components/travel/recommendation-preview";

import { useDisclosure } from
  "@/hooks/useDisclosure";

import { useTravelPlanner } from
  "@/hooks/use-travel-planner";

import type { TravelCountryRecord } from
  "@/hooks/use-travel-countries";

import {
  getStepName,
  PLANNER_STEP_COUNT,
} from "@/features/planner/planner.config";
import {
  getRecommendationFilterGroups,
} from "@/data/travel-catalog";
import type { RecommendationResponse, TravelPlan } from "@/types/travel";

const RECOMMENDATION_CACHE_KEY = "travelwise-recommendations-v1";

function recommendationInputKey(plan: TravelPlan): string {
  return JSON.stringify({
    interests: plan.interests,
    recommendationFilters: plan.recommendationFilters,
    countries: plan.countries,
    services: plan.services,
    activities: plan.activities,
    accommodation: plan.accommodation,
    accommodationChoices: plan.accommodationChoices,
    budget: plan.budget,
    budgetMode: plan.budgetMode,
    individualBudgets: plan.individualBudgets,
    travelerNames: plan.travelerNames,
    adults: plan.adults,
    children: plan.children,
    checkIn: plan.checkIn,
    checkOut: plan.checkOut,
    style: plan.style,
    flexibleDates: plan.flexibleDates,
  });
}

export default function Home() {
  const planner = useTravelPlanner();

  const { plan, update, goTo, reset } = planner;
  const [cachedRecommendation, setCachedRecommendation] = useState<{
    key: string;
    result: RecommendationResponse;
  } | null>(null);
  const requestKey = recommendationInputKey(plan);
  const cachedResult = cachedRecommendation?.key === requestKey
    ? cachedRecommendation.result : null;
  const saveRecommendation = useCallback((key: string, result: RecommendationResponse) => {
    setCachedRecommendation({ key, result });
    try {
      window.sessionStorage.setItem(
        RECOMMENDATION_CACHE_KEY,
        JSON.stringify({ key, result })
      );
    } catch {
      // The in-memory result remains available if browser storage is full.
    }
  }, []);

  useEffect(() => {
    if (cachedRecommendation) return;
    try {
      const saved = window.sessionStorage.getItem(RECOMMENDATION_CACHE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        key: string;
        result: RecommendationResponse;
      };
      if (parsed.key === requestKey && Array.isArray(parsed.result?.top10)) {
        setCachedRecommendation(parsed);
      }
    } catch {
      // An invalid or unavailable browser cache should not block the planner.
    }
  }, [cachedRecommendation, requestKey]);
  const setRecommendationPreviewReady =
    useCallback(
      (ready: boolean) => {
        update(
          "recommendationPreviewReady",
          ready
        );
      },
      [update]
    );

  const sidebar = useDisclosure();
  const mobileMenu = useDisclosure();
  const profile = useDisclosure();

  useEffect(() => {
    if (!sidebar.isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        sidebar.close();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [sidebar.isOpen, sidebar.close]);

  function navigate(step: number) {
    goTo(step);
    sidebar.close();
    mobileMenu.close();
    profile.close();
  }

  function restart() {
    setCachedRecommendation(null);
    try {
      window.sessionStorage.removeItem(RECOMMENDATION_CACHE_KEY);
    } catch {
      // Session storage may be unavailable in some browsers.
    }
    reset();
    sidebar.close();
    mobileMenu.close();
    profile.close();
  }

  function saveDestination(
    record: TravelCountryRecord
  ) {
    update(
      "selectedDestinationId",
      record.destination_id
    );

    update(
      "destination",
      `${record.city_town}, ${record.country}`
    );
  }

  function openDestination(
    record: TravelCountryRecord
  ) {
    saveDestination(record);
    navigate(7);
  }

  function toggleSidebar() {
    sidebar.toggle();
    mobileMenu.close();
    profile.close();
  }

  function toggleMobileMenu() {
    mobileMenu.toggle();
    sidebar.close();
  }

  function openProfileFromMobile() {
    mobileMenu.close();
    profile.open();
  }

  const validDates = Boolean(
    plan.checkIn &&
    plan.checkOut &&
    plan.checkOut > plan.checkIn
  );

  const canContinue =
    plan.step === 3
      ? validDates &&
        plan.travelDatesSelected &&
        plan.budgetSelected &&
        (plan.budgetMode !== "group-person" ||
          (plan.travelerNames.length > 0 &&
            plan.travelerNames.every(
              name => name.trim().length > 0
            ) &&
            plan.individualBudgets.length ===
              plan.travelerNames.length))
      : plan.step === 4
      ? plan.accommodationChoices.length > 0 &&
        plan.interests.length > 0
      : plan.step === 6
      ? Boolean(cachedResult && plan.recommendationPreviewReady)
      : true;

  const recommendationGroupCount =
    getRecommendationFilterGroups(
      plan.interests
    ).length;

  function nextStep() {
    if (
      plan.step === 4 &&
      recommendationGroupCount > 0
    ) {
      update("recommendationFilterIndex", 0);
      navigate(5);
      return;
    }

    if (
      plan.step === 5 &&
      plan.recommendationFilterIndex <
        recommendationGroupCount - 1
    ) {
      update(
        "recommendationFilterIndex",
        plan.recommendationFilterIndex + 1
      );
      return;
    }

    navigate(plan.step + 1);
  }

  function previousStep() {
    if (
      plan.step === 5 &&
      plan.recommendationFilterIndex > 0
    ) {
      update(
        "recommendationFilterIndex",
        plan.recommendationFilterIndex - 1
      );
      return;
    }

    navigate(plan.step - 1);
  }

  function renderCurrentScreen() {
    switch (plan.step) {
      case 6:
        return (
          <RecommendationPreview
            plan={plan}
            requestKey={requestKey}
            cachedResult={cachedResult}
            onResult={saveRecommendation}
            onReady={setRecommendationPreviewReady}
            onOpenDestination={openDestination}
          />
        );

      case 7:
        return (
          <AccommodationDetail
            plan={plan}
            recommendations={cachedResult}
            onSelectDestination={saveDestination}
          />
        );

      default:
        return <PlannerStep {...planner} />;
    }
  }

  return (
    <div className="site">
      <AppHeader
        currentStep={plan.step}
        sidebarOpen={sidebar.isOpen}
        mobileMenuOpen={mobileMenu.isOpen}
        profileOpen={profile.isOpen}
        onNavigate={navigate}
        onToggleSidebar={toggleSidebar}
        onToggleMobileMenu={toggleMobileMenu}
        onToggleProfile={profile.toggle}
        onOpenProfile={openProfileFromMobile}
        onReset={restart}
      />

      <AppWorkspace
        currentStep={plan.step}
        sidebarOpen={sidebar.isOpen}
        onNavigate={navigate}
        onCloseSidebar={sidebar.close}
      >
        {plan.step !== 1 && (
          <div className="step-kicker">
            <span>
              STEP{" "}
              {String(plan.step).padStart(2, "0")}{" "}
              OF {PLANNER_STEP_COUNT}
            </span>

            <span>
              {getStepName(plan.step)}
            </span>
          </div>
        )}

        <div
          key={plan.step}
          className={`step-content step-${plan.step}`}
        >
          {renderCurrentScreen()}
        </div>

        <StepFooter
          currentStep={plan.step}
          canContinue={canContinue}
          onBack={previousStep}
          onNext={nextStep}
          onRestart={restart}
        />
      </AppWorkspace>
    </div>
  );
}
