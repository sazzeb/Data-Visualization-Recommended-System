"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import type {
  RecommendationResponse,
  TravelPlan,
} from "@/types/travel";
import { DestinationOverview } from
  "@/components/charts/destination-overview";
import type { TravelCountryRecord } from
  "@/hooks/use-travel-countries";

type RecommendationPreviewProps = {
  plan: TravelPlan;
  onReady: (ready: boolean) => void;
  onOpenDestination: (row: TravelCountryRecord) => void;
};

export function RecommendationPreview({
  plan,
  onReady,
  onOpenDestination,
}: RecommendationPreviewProps) {
  const [result, setResult] =
    useState<RecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [workCompleted, setWorkCompleted] = useState<number | null>(
    null
  );
  const [workTotal, setWorkTotal] = useState<number | null>(null);
  const [status, setStatus] = useState(
    "Starting recommendation search..."
  );
  const requestKey = JSON.stringify({
    countries: plan.countries,
    accommodationChoices: plan.accommodationChoices,
    recommendationFilters:
      plan.recommendationFilters,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setResult(null);
    setError("");
    setLoading(true);
    setProgress(0);
    setWorkCompleted(null);
    setWorkTotal(null);
    setStatus("Starting recommendation search...");
    onReady(false);

    const timeout = window.setTimeout(
      () => controller.abort(),
      120_000
    );

    fetch("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Recommendation request failed (${response.status}).`);
        }

        if (!response.body) {
          throw new Error("Recommendation stream was unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const chunk = await reader.read();

          if (chunk.done) {
            break;
          }

          buffer += decoder.decode(chunk.value, {
            stream: true,
          });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) {
              continue;
            }

            const event = JSON.parse(line) as
              | {
                  type: "progress";
                  percent: number;
                  message: string;
                  completed?: number;
                  total?: number;
                }
              | {
                  type: "result";
                  result: RecommendationResponse;
                }
              | {
                  type: "error";
                  message: string;
                };

            if (event.type === "progress") {
              if (!active) {
                return;
              }
              setProgress(event.percent);
              setStatus(event.message);
              if (
                typeof event.completed === "number" &&
                typeof event.total === "number"
              ) {
                setWorkCompleted(event.completed);
                setWorkTotal(event.total);
              } else {
                setWorkCompleted(null);
                setWorkTotal(null);
              }
            } else if (event.type === "result") {
              if (!active) {
                return;
              }
              setResult(event.result);
              setProgress(100);
              setStatus("Recommendations ready");
              setLoading(false);
              onReady(true);
            } else {
              throw new Error(event.message);
            }
          }
        }
      })
      .catch(reason => {
        if (!active) {
          return;
        }

        if (controller.signal.aborted) {
          setError(
            "Recommendation search exceeded the 2-minute limit. Try fewer countries or filters."
          );
          setLoading(false);
          onReady(false);
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to generate recommendations."
        );
        setLoading(false);
        onReady(false);
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [onReady, requestKey]);

  const processingStage =
    progress < 20
      ? 0
      : progress < 45
        ? 1
        : progress < 95
          ? 2
          : 3;
  const processingStages = [
    "Loading travel data",
    "Finding stays",
    "Matching nearby places",
    "Final ranking",
  ];

  return (
    <div className="wizard-wide recommendation-preview">
      {loading && (
        <div className="content-panel recommendation-loading-panel">
          <div className="recommendation-loading-content">
            <div className="recommendation-processing">
            <div className="recommendation-compass" aria-hidden="true">
              <span className="recommendation-compass-ring" />
              <span className="recommendation-compass-needle" />
              <span className="recommendation-compass-dot" />
            </div>
            <div>
              <div className="recommendation-loading-title">
                <strong>{status}</strong>
              </div>
              <p>
                Building your trip from the selected countries, budget,
                stays, and nearby places.
              </p>
            </div>
            <div className="recommendation-progress-summary">
              <strong>{progress}%</strong>
              <span>
                {workCompleted !== null && workTotal !== null
                  ? `${Math.max(
                      0,
                      workTotal - workCompleted
                    )} remaining`
                  : progress >= 95
                    ? "Finalizing"
                    : "Working"}
              </span>
            </div>
            </div>
            <div className="recommendation-stage-list" aria-label="Recommendation processing stages">
              {processingStages.map((stage, index) => (
                <div
                  className={`recommendation-stage ${
                    index < processingStage
                      ? "is-complete"
                      : index === processingStage
                        ? "is-active"
                        : ""
                  }`}
                  key={stage}
                >
                  <span>{index < processingStage ? "✓" : index + 1}</span>
                  <small>{stage}</small>
                </div>
              ))}
            </div>
            <div
              className="recommendation-progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="recommendation-buffer" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="recommendation-progress-meta">
              <span>
                {workCompleted !== null && workTotal !== null
                  ? `${workCompleted.toLocaleString()} of ${workTotal.toLocaleString()} accommodations processed`
                  : "Preparing the recommendation workspace"}
              </span>
              <span>{Math.max(0, 100 - progress)}% left</span>
            </div>
          </div>
          <div
            className="recommendation-loader-overlay"
            role="status"
            aria-live="polite"
          >
            <div className="recommendation-loader-card">
              <div
                className="recommendation-loader-ring"
                style={{
                  "--loader-progress": progress,
                } as CSSProperties}
              >
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="recommendation-loader-track" cx="50" cy="50" r="42" />
                  <circle className="recommendation-loader-value" cx="50" cy="50" r="42" />
                </svg>
                <strong>{progress}%</strong>
              </div>
              <span>Preparing your recommendations</span>
              <small>{status}</small>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="content-panel error-panel">
          <p>{error}</p>
        </div>
      )}

      {result && result.firstRecommendation && (
        <DestinationOverview
          plan={plan}
          recommendations={result}
          onOpenDestination={onOpenDestination}
        />
      )}

      {result && !result.firstRecommendation && !loading && !error && (
        <div className="content-panel error-panel">
          <p>
            No complete recommendation matched every selected option.
            Try removing one or two filters, or choose a different
            accommodation type.
          </p>
        </div>
      )}
    </div>
  );
}
