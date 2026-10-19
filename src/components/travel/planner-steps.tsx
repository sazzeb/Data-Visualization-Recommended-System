
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  Building,
  Building2,
  CalendarDays,
  CarFront,
  Castle,
  Check,
  ChevronDown,
  Compass,
  Ellipsis,
  Heart,
  HeartPulse,
  Hotel as HotelIcon,
  House,
  Landmark,
  MapPin,
  Moon,
  Mountain,
  Palmtree,
  PartyPopper,
  Plane,
  Plus,
  Search,
  Shapes,
  ShoppingBag,
  Tent,
  Ticket,
  Trees,
  Trophy,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";

import {
  ACCOMMODATIONS,
  ACTIVITY_CATEGORIES,
  ACCOMMODATION_CHOICES,
  COUNTRY_CARDS,
  DESTINATIONS,
  EVENT_CATEGORIES,
  EVENTS,
  EXPERIENCES,
  HOTELS,
  INTERESTS,
  getRecommendationFilterGroups,
} from "@/data/travel-catalog";

import {
  ComparisonChart,
  Currency,
  DestinationMap,
  DonutChart,
  EventTimeline,
  HorizontalBars,
  VerticalBars,
} from "@/components/charts/travel-charts";

import type {
  BudgetMode,
  DashboardTab,
  ListField,
  TravelPlan,
} from "@/types/travel";

const ICONS: Record<string, LucideIcon> = {
  "bed-double": BedDouble,
  plane: Plane,
  shapes: Shapes,
  utensils: Utensils,
  "calendar-days": CalendarDays,
  "car-front": CarFront,
  landmark: Landmark,
  "shopping-bag": ShoppingBag,
  ellipsis: Ellipsis,
  waves: Waves,
  moon: Moon,
  mountain: Mountain,
  castle: Castle,
  "party-popper": PartyPopper,
  trophy: Trophy,
  ticket: Ticket,
  compass: Compass,
  "heart-pulse": HeartPulse,
  trees: Trees,
  "briefcase-business": BriefcaseBusiness,
  hotel: HotelIcon,
  "building-2": Building2,
  palmtree: Palmtree,
  house: House,
  home: House,
  building: Building,
  tent: Tent,
  plus: Plus,
};

export type PlannerActions = {
  plan: TravelPlan;
  update: <K extends keyof TravelPlan>(
    key: K,
    value: TravelPlan[K]
  ) => void;
  toggle: (key: ListField, value: string) => void;
  goTo: (step: number) => void;
};

// SHARED COMPONENTS

function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="step-heading">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`content-panel ${className}`}>
      <div className="panel-title">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SelectionGrid({
  options,
  selected,
  onSelect,
  columns = 3,
  imageByLabel,
  iconByLabel,
}: {
  options: readonly (readonly [string, string])[];
  selected: string[];
  onSelect: (value: string) => void;
  columns?: number;
  imageByLabel?: Record<string, string>;
  iconByLabel?: Record<string, string>;
}) {
  return (
    <div
      className={`tile-grid cols-${columns}`}
    >
      {options.map(([label, icon]) => {
        const Icon = ICONS[icon] || Shapes;
        const active = selected.includes(label);

        return (
          <button
            type="button"
            key={label}
            className={`selection-tile ${
              active ? "is-selected" : ""
            }`}
            aria-pressed={active}
            onClick={() => onSelect(label)}
          >
            {iconByLabel?.[label] ? (
              <span
                className="selection-tile-flag"
                role="img"
                aria-label={`${label} flag`}
              >
                {iconByLabel[label]}
              </span>
            ) : imageByLabel?.[label] ? (
              <span
                className="selection-tile-image"
                aria-hidden="true"
                style={{
                  backgroundImage: `url("${imageByLabel[label]}")`,
                }}
              />
            ) : (
              <Icon
                size={25}
                strokeWidth={1.85}
                aria-hidden="true"
              />
            )}

            <span>{label}</span>

            {active && (
              <Check
                className="tile-check"
                size={15}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Tabs({
  items,
  value,
  onChange,
}: {
  items: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="pill-tabs"
      role="group"
      aria-label="View filter"
    >
      {items.map(item => (
        <button
          key={item}
          type="button"
          className={value === item ? "active" : ""}
          aria-pressed={value === item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Counter({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="counter">
      <span>{label}</span>

      <div className="counter-controls">
        <button
          type="button"
          aria-label={`Remove ${label}`}
          disabled={value <= min}
          onClick={() =>
            onChange(Math.max(min, value - 1))
          }
        >
          −
        </button>

        <strong>{value}</strong>

        <button
          type="button"
          aria-label={`Add ${label}`}
          disabled={value >= 20}
          onClick={() =>
            onChange(Math.min(20, value + 1))
          }
        >
          +
        </button>
      </div>
    </div>
  );
}

function Cover({
  image,
  label,
  className = "",
}: {
  image: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`cover-image ${className}`}
      style={{
        backgroundImage: `linear-gradient(
          0deg,
          rgba(0,0,0,.18),
          transparent 55%
        ),url("${image}")`,
      }}
    />
  );
}

function DetailDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="dialog-scrim"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-header">
          <h2>{title}</h2>

          <button
            type="button"
            className="icon-button"
            aria-label="Close details"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}

        <button
          type="button"
          className="primary-button dialog-done"
          onClick={onClose}
        >
          Close details
        </button>
      </section>
    </div>
  );
}

function Notice() {
  return (
    <p className="sample-note">
      <span className="note-dot" />
      Illustrative preview data — replace with verified
      datasets for real recommendations.
    </p>
  );
}

// PAGE 1 — SPLASH

export function Splash({
  goTo,
}: Pick<PlannerActions, "goTo">) {
  return (
    <div className="splash-page">
      <div className="splash-hero">
        <Cover
          image={COUNTRY_CARDS[0].image}
          label="Barcelona city view"
        />

        <div className="hero-shade" />

        <div className="hero-content">
          <span className="eyebrow light">
            A smarter way to travel
          </span>

          <h1>
            Discover Your
            <br />
            Next Journey
          </h1>

          <p>
            Data-driven travel recommendations for
            unforgettable experiences.
          </p>

          <button
            type="button"
            className="primary-button large"
            onClick={() => goTo(2)}
          >
            Get Started
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="value-props">
        <div>
          <MapPin size={25} />
          <b>Real Data Ready</b>
          <small>Designed for trusted sources</small>
        </div>

        <div>
          <Compass size={25} />
          <b>Smart Insights</b>
          <small>Visualized for you</small>
        </div>

        <div>
          <Users size={25} />
          <b>Personalized Trips</b>
          <small>Built around your choices</small>
        </div>
      </div>
    </div>
  );
}

// PAGE 2 — COUNTRIES OF INTEREST

export function Countries({
  plan,
  toggle,
}: PlannerActions) {
  const [query, setQuery] = useState("");

  const countries = COUNTRY_CARDS.filter(item =>
    item.name
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="wizard-wide">
      <Heading
        title="Choose Countries of Interest"
        subtitle="Select one or more countries you’d like to explore."
      />

      <label className="search-field">
        <Search size={17} />
        <input
          type="search"
          placeholder="Search countries..."
          value={query}
          onChange={event =>
            setQuery(event.target.value)
          }
        />
      </label>

      <SelectionGrid
        options={countries.map(item => [
          item.name,
          "globe",
        ] as const)}
        selected={plan.countries}
        onSelect={value =>
          toggle("countries", value)
        }
        columns={4}
        iconByLabel={Object.fromEntries(
          COUNTRY_CARDS.map(item => [
            item.name,
            item.flag,
          ])
        )}
      />

      <p className="choice-hint">
        {plan.countries.length}{" "}
        {plan.countries.length === 1
          ? "country"
          : "countries"}{" "}
        selected
      </p>
    </div>
  );
}

// PAGE 4 — WHAT ARE YOU LOOKING FOR?

export function Welcome({
  plan,
  toggle,
  update,
}: PlannerActions) {
  function toggleAccommodation(value: string) {
    const selected =
      plan.accommodationChoices.includes(value);

    if (
      !selected &&
      plan.accommodationChoices.length >= 3
    ) {
      return;
    }

    const nextChoices = selected
      ? plan.accommodationChoices.filter(
          item => item !== value
        )
      : [...plan.accommodationChoices, value];

    update(
      "accommodationChoices",
      nextChoices
    );

    if (nextChoices.length > 0) {
      update("accommodation", nextChoices[0]);
    }
  }

  return (
    <div className="wizard-center">
      <Heading
        title="What are you looking for?"
        subtitle="Tell us your travel style so we can personalize your recommendations."
      />

      <section className="choice-section">
        <div className="choice-section-heading">
          <h2>Accommodation Choices</h2>
          <p>Choose the stay that best fits your trip.</p>
        </div>

        <SelectionGrid
          options={ACCOMMODATION_CHOICES}
          selected={plan.accommodationChoices}
          onSelect={toggleAccommodation}
          columns={4}
        />

        <p className="choice-hint">
          {plan.accommodationChoices.length} of 3
          accommodation choices selected
        </p>
      </section>

      <section className="choice-section">
        <div className="choice-section-heading">
          <h2>Events & Travel Interest</h2>
          <p>
            Choose one or both areas to personalize
            the filters on the next step.
          </p>
        </div>

        <SelectionGrid
          options={INTERESTS}
          selected={plan.interests}
          onSelect={value =>
            toggle("interests", value)
          }
          columns={3}
        />
      </section>

      <p className="choice-hint">
      Stay:{" "}
      <strong>
        {plan.accommodationChoices.join(", ")}
      </strong>
      {" · "}
      Areas:{" "}
      {plan.interests.length
        ? plan.interests.join(", ")
        : "Choose one or more filter categories"}
      </p>
    </div>
  );
}

// PAGE 3 — ESTIMATED BUDGET

export function EstimatedBudget({
  plan,
  update,
}: PlannerActions) {
  const travelerCount =
    plan.adults + plan.children;
  const individualBudgets = Array.from(
    { length: plan.individualBudgets.length },
    (_, index) =>
      plan.individualBudgets[index] ??
      Math.round(plan.budget / travelerCount)
  );
  const travelerNames = Array.from(
    { length: individualBudgets.length },
    (_, index) =>
      plan.travelerNames[index] ?? ""
  );

  function updateIndividualBudget(
    index: number,
    value: number
  ) {
    const nextBudgets = individualBudgets.map(
      (budget, budgetIndex) =>
        budgetIndex === index
          ? Math.max(0, value)
          : budget
    );

    update("individualBudgets", nextBudgets);
    update(
      "budget",
      nextBudgets.reduce(
        (total, budget) => total + budget,
        0
      )
    );
    update("budgetSelected", true);
  }

  const modeFactor: Record<BudgetMode, number> = {
    personal: 1,
    "group-person": Math.max(
      1,
      plan.adults + plan.children
    ),
    "group-total": 1,
  };

  const factor = modeFactor[plan.budgetMode];

  const shownAmount = Math.round(
    plan.budget / factor
  );
  const [budgetInput, setBudgetInput] =
    useState(
      plan.budgetSelected
        ? String(shownAmount)
        : ""
    );
  const [individualInputs, setIndividualInputs] =
    useState<string[]>([]);

  useEffect(() => {
    setBudgetInput(
      plan.budgetSelected
        ? String(shownAmount)
        : ""
    );
  }, [
    plan.budgetMode,
    plan.budgetSelected,
    shownAmount,
  ]);

  useEffect(() => {
    setIndividualInputs(
      individualBudgets.map(value =>
        plan.budgetMode === "group-person" &&
        value === 0 &&
        !plan.budgetSelected
          ? ""
          : String(value)
      )
    );
  }, [
    travelerCount,
    plan.budgetMode,
    plan.budgetSelected,
  ]);

  const setShown = (value: number) => {
    const nextValue = Math.max(0, value);

    setBudgetInput(String(nextValue));
    update(
      "budget",
      nextValue * factor
    );
  };

  function commitBudgetInput(value: string) {
    const amount = Number(value);

    if (value.trim() !== "" && Number.isFinite(amount)) {
      setShown(amount);
      update("budgetSelected", true);
    } else {
      update("budgetSelected", false);
    }
  }

  function addTraveler() {
    update(
      "individualBudgets",
      [...individualBudgets, 0]
    );
    update(
      "travelerNames",
      [...travelerNames, ""]
    );
    update("adults", plan.adults + 1);
  }

  function selectBudgetMode(value: string) {
    const mode =
      value === "Group · Per Person"
        ? "group-person"
        : value === "Group · Entire Budget"
        ? "group-total"
        : "personal";

    update("budgetMode", mode);

    if (mode === "group-person") {
      update("individualBudgets", [0]);
      update("travelerNames", [""]);
      update("adults", 1);
      setIndividualInputs([""]);
      update("budgetSelected", false);
    }
  }

  return (
    <div className="wizard-narrow">
      <Heading
        title="Set Your Estimated Budget"
        subtitle="Help us find the best options within your range."
      />

      <Tabs
        items={[
          "Personal",
          "Group · Per Person",
          "Group · Entire Budget",
        ]}
        value={
          {
            personal: "Personal",
            "group-person": "Group · Per Person",
            "group-total": "Group · Entire Budget",
          }[plan.budgetMode]
        }
        onChange={selectBudgetMode}
      />

      <Panel title="Set your budget">
        {plan.budgetMode === "group-person" ? (
          <div className="group-budget-editor">
            <p className="muted tiny">
              Set a separate budget for each traveler.
              Each person can have a different amount.
            </p>

            {individualBudgets.map((budget, index) => (
              <div
                className="traveler-budget-row"
                key={`traveler-budget-${index}`}
              >
                <input
                  id={`traveler-name-${index}`}
                  type="text"
                  aria-label="Traveler name"
                  placeholder="Traveler name"
                  value={travelerNames[index]}
                  onChange={event =>
                    update(
                      "travelerNames",
                      travelerNames.map(
                        (name, nameIndex) =>
                          nameIndex === index
                            ? event.target.value
                            : name
                      )
                    )
                  }
                />

                <div className="amount-controls">
                  <span>$</span>
                  <input
                    id={`traveler-budget-${index}`}
                    type="number"
                    min="0"
                    aria-label={`Budget for traveler ${index + 1}`}
                    step="1"
                    value={
                      individualInputs[index] ??
                      String(budget)
                    }
                    onChange={event =>
                      {
                        setIndividualInputs(current => {
                          const next = [...current];
                          next[index] =
                            event.target.value;
                          return next;
                        });

                        if (
                          event.target.value.trim() ===
                          ""
                        ) {
                          update(
                            "budgetSelected",
                            false
                          );
                        }
                      }
                    }
                    onBlur={event =>
                      event.target.value.trim() === ""
                        ? update("budgetSelected", false)
                        : updateIndividualBudget(
                            index,
                            Number(event.target.value)
                          )
                    }
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="add-traveler-button"
              onClick={addTraveler}
            >
              <Plus size={16} />
              Add more traveler
            </button>

            <div className="group-budget-total">
              <span>
                <small>Group total</small>
                <b>
                  {individualBudgets.length}{" "}
                  {individualBudgets.length === 1
                    ? "traveler"
                    : "travelers"}
                </b>
              </span>
              <strong>
                <Currency value={plan.budget} />
              </strong>
            </div>
          </div>
        ) : (
        <div className="budget-field">
          <label htmlFor="trip-budget">
            {plan.budgetMode === "personal"
              ? "Personal budget (USD)"
              : "Entire group budget (USD)"}
          </label>

          <div className="amount-controls">
            <span>$</span>

            <input
              id="trip-budget"
              type="number"
              min="0"
              step="100"
              value={budgetInput}
              onChange={e => {
                setBudgetInput(e.target.value);

                if (e.target.value.trim() === "") {
                  update("budgetSelected", false);
                }
              }}
              onBlur={e =>
                commitBudgetInput(e.target.value)
              }
            />

            <button
              type="button"
              aria-label="Decrease budget"
              onClick={() =>
                setShown(shownAmount - 100)
              }
            >
              −
            </button>

            <button
              type="button"
              aria-label="Increase budget"
              onClick={() =>
                setShown(shownAmount + 100)
              }
            >
              +
            </button>
          </div>
        </div>
        )}

        {plan.budgetMode !== "group-person" && <input
          className="green-range"
          type="range"
          min={0}
          max={10000}
          step={100}
          value={Math.min(10000, shownAmount)}
          aria-label="Estimated budget amount"
          onChange={e =>
            setShown(Number(e.target.value))
          }
        />}

        {plan.budgetMode !== "group-person" && <div className="range-labels">
          <span>$0</span>
          <span>$2.5K</span>
          <span>$5K</span>
          <span>$10K+</span>
        </div>}

        <p className="muted tiny">
          {plan.budgetMode === "group-person"
            ? "Estimated group budget: "
            : "Estimated budget: "}
          <strong>
            <Currency
              value={plan.budget}
            />
          </strong>
          {" · "}
          {plan.adults + plan.children} travelers
        </p>
      </Panel>

      <Panel title="Estimated Travel Time">
        <div className="field-grid two">
          <DateField
            label="From"
            value={plan.checkIn}
            onChange={value => {
              update("checkIn", value);
              update(
                "travelDatesSelected",
                Boolean(value && plan.checkOut)
              );
            }}
          />

          <DateField
            label="To"
            value={plan.checkOut}
            min={plan.checkIn}
            onChange={value => {
              update("checkOut", value);
              update(
                "travelDatesSelected",
                Boolean(plan.checkIn && value)
              );
            }}
          />
        </div>

        {plan.checkOut <= plan.checkIn && (
          <p className="field-error">
            The end date must be after the start date.
          </p>
        )}
      </Panel>

      <Notice />
    </div>
  );
}

// PAGE 5 — RECOMMENDATION FILTERS

export function RecommendationFilters({
  plan,
  update,
}: PlannerActions) {
  function toggleFilter(
    group: string,
    value: string
  ) {
    const selected =
      plan.recommendationFilters[group] ?? [];
    const next =
      group === "Preferable activities time"
        ? selected.includes(value)
          ? []
          : [value]
        : selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected, value];

    update("recommendationFilters", {
      ...plan.recommendationFilters,
      [group]: next,
    });
  }

  const selectedGroups =
    getRecommendationFilterGroups(plan.interests);
  const activeGroup =
    selectedGroups[
      Math.min(
        plan.recommendationFilterIndex,
        Math.max(0, selectedGroups.length - 1)
      )
    ];

  function openRecommendationGroup(index: number) {
    update("recommendationFilterIndex", index);
  }

  return (
    <div className="wizard-wide">
      <Heading
        title="Personalize Your Filters"
        subtitle="Choose the details you want to use for your recommendations."
      />

      <Panel title="Accommodation">
        <div className="filter-summary-list">
          {plan.accommodationChoices.map(choice => (
            <span key={choice}>{choice}</span>
          ))}
        </div>
      </Panel>

      {selectedGroups.length > 0 && (
        <div className="recommendation-summary-list">
          {selectedGroups
            .map((group, index) => ({
              group,
              index,
              choices:
                plan.recommendationFilters[group.label] ?? [],
            }))
            .filter(
              ({ index, choices }) =>
                index !== plan.recommendationFilterIndex &&
                choices.length > 0
            )
            .map(({ group, index, choices }) => (
              <button
                type="button"
                className="recommendation-summary-widget"
                key={group.label}
                onClick={() => openRecommendationGroup(index)}
                aria-label={`Edit ${group.label} choices`}
              >
                <span className="recommendation-summary-title">
                  {group.label}
                </span>
                <span className="filter-summary-list">
                  {choices.map(choice => (
                    <span key={choice}>{choice}</span>
                  ))}
                </span>
              </button>
            ))}
        </div>
      )}

      {selectedGroups.length === 0 ? (
        <Panel title="Choose a recommendation area">
          <p className="empty-state">
            Go back and select one or more filter
            categories to see their choices.
          </p>
        </Panel>
      ) : activeGroup ? (
          <section
            className="filter-category-panel"
            key={activeGroup.label}
          >
            <div className="filter-category-heading">
              <span className="filter-category-icon">
                ✦
              </span>
              <div>
                <h2>{activeGroup.label}</h2>
                <p>
                  Select any filters from this area.
                </p>
              </div>
            </div>

            <div className="filter-child-group">
              <h3>Available choices</h3>
              <SelectionGrid
                options={activeGroup.options.map(
                  option =>
                    [option, "shapes"] as const
                )}
                selected={
                  plan.recommendationFilters[
                    activeGroup.label
                  ] ?? []
                }
                onSelect={value =>
                  toggleFilter(
                    activeGroup.label,
                    value
                  )
                }
                columns={3}
              />
            </div>
          </section>
        ) : null}

      <p className="choice-hint">
        Selected filters:{" "}
        {Object.values(
          plan.recommendationFilters
        ).reduce(
          (total, values) => total + values.length,
          0
        )}
      </p>
    </div>
  );
}

// PAGE 6 — ACTIVITIES

const ACTIVITIES = [
  {
    name: "City Tour",
    category: "Cultural",
    image: COUNTRY_CARDS[0].image,
  },
  {
    name: "Food Tour",
    category: "Food & Drink",
    image: EXPERIENCES[1].image,
  },
  {
    name: "Wine Tasting",
    category: "Food & Drink",
    image: EVENTS[2].image,
  },
  {
    name: "Beach Activities",
    category: "Relaxation",
    image: EXPERIENCES[3].image,
  },
  {
    name: "Hiking",
    category: "Adventure",
    image: EXPERIENCES[6].image,
  },
  {
    name: "Museum Visit",
    category: "Cultural",
    image: EXPERIENCES[5].image,
  },
  {
    name: "Local Markets",
    category: "Unique",
    image: EXPERIENCES[7].image,
  },
  {
    name: "Concerts & Events",
    category: "Nightlife",
    image: EXPERIENCES[4].image,
  },
  {
    name: "Family Excursion",
    category: "Family",
    image: COUNTRY_CARDS[2].image,
  },
];

export function Activities({
  plan,
  toggle,
}: PlannerActions) {
  const [category, setCategory] =
    useState("All");

  const [more, setMore] =
    useState(false);

  const visible = ACTIVITIES.filter(
    item =>
      more ||
      category === "All" ||
      item.category === category
  ).filter(
    (_item, index) =>
      more || index < 8
  );

  return (
    <div className="wizard-wide">
      <Heading
        title="Select Activities"
        subtitle="Choose specific activities or travel experiences."
      />

      <Tabs
        items={ACTIVITY_CATEGORIES}
        value={category}
        onChange={value => {
          setCategory(value);
          setMore(false);
        }}
      />

      <div className="activity-grid">
        {visible.map(item => {
          const active =
            plan.activities.includes(item.name);

          return (
            <button
              key={item.name}
              type="button"
              className={`activity-card ${
                active ? "is-selected" : ""
              }`}
              aria-pressed={active}
              onClick={() =>
                toggle("activities", item.name)
              }
            >
              <Cover
                label={item.name}
                image={item.image}
              />

              <b>{item.name}</b>

              {active && (
                <span className="country-check">
                  <Check size={15} />
                </span>
              )}
            </button>
          );
        })}

        {category === "All" && !more && (
          <button
            type="button"
            className="more-card"
            onClick={() => setMore(true)}
          >
            <Plus size={22} />
            More Activities
          </button>
        )}
      </div>

      {visible.length === 0 && (
        <p className="empty-state">
          No activities in this category.
        </p>
      )}
    </div>
  );
}

// PAGE 7 — ACCOMMODATION

export function Accommodation({
  plan,
  update,
}: PlannerActions) {
  const [showMore, setShowMore] =
    useState(false);

  const all = showMore
    ? [
        ...ACCOMMODATIONS.filter(
          x => x[0] !== "Add More"
        ),
        [
          "Serviced Apartment",
          "building-2",
        ] as const,
      ]
    : ACCOMMODATIONS;

  return (
    <div className="wizard-wide">
      <Heading
        title="Select Accommodation Type"
        subtitle="Choose the type that fits your needs."
      />

      <SelectionGrid
        options={all}
        selected={[plan.accommodation]}
        onSelect={value =>
          value === "Add More"
            ? setShowMore(true)
            : update("accommodation", value)
        }
      />

      <Panel title="Number of Travelers">
        <div className="field-grid two">
          <Counter
            label="Adults"
            min={1}
            value={plan.adults}
            onChange={value =>
              update("adults", value)
            }
          />

          <Counter
            label="Children"
            value={plan.children}
            onChange={value =>
              update("children", value)
            }
          />
        </div>
      </Panel>

      <Panel title="Stay Duration">
        <div className="field-grid two">
          <DateField
            label="Check-in"
            value={plan.checkIn}
            onChange={value =>
              update("checkIn", value)
            }
          />

          <DateField
            label="Check-out"
            value={plan.checkOut}
            min={plan.checkIn}
            onChange={value =>
              update("checkOut", value)
            }
          />
        </div>

        {plan.checkOut <= plan.checkIn && (
          <p className="field-error">
            Check-out must be after check-in.
          </p>
        )}
      </Panel>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-label">
      {label}

      <span className="date-input">
        <CalendarDays size={16} />

        <input
          type="date"
          value={value}
          min={min}
          onChange={e =>
            onChange(e.target.value)
          }
        />
      </span>
    </label>
  );
}

// PAGE 8 — TRAVEL DETAILS

export function TravelDetails({
  plan,
  update,
}: PlannerActions) {
  const available = DESTINATIONS.filter(
    d =>
      plan.countries.length === 0 ||
      plan.countries.includes(d.country)
  );

  const suggestions = available.some(
    d =>
      `${d.city}, ${d.country}` ===
      plan.destination
  )
    ? available
    : DESTINATIONS;

  return (
    <div className="wizard-narrow">
      <Heading
        title="Where & When?"
        subtitle="Provide a few details to refine your recommendations."
      />

      <Panel title="Trip Details">
        <div className="field-stack">
          <label className="field-label">
            Destination

            <span className="select-wrapper">
              <MapPin size={16} />

              <select
                value={plan.destination}
                onChange={e =>
                  update(
                    "destination",
                    e.target.value
                  )
                }
              >
                {!suggestions.some(
                  d =>
                    `${d.city}, ${d.country}` ===
                    plan.destination
                ) && (
                  <option
                    value={plan.destination}
                  >
                    {plan.destination}
                  </option>
                )}

                {suggestions.map(d => (
                  <option
                    value={`${d.city}, ${d.country}`}
                    key={d.city}
                  >
                    {d.city}, {d.country}
                  </option>
                ))}
              </select>

              <ChevronDown size={16} />
            </span>
          </label>

          <div className="field-grid two">
            <DateField
              label="Check-in"
              value={plan.checkIn}
              onChange={value =>
                update("checkIn", value)
              }
            />

            <DateField
              label="Check-out"
              value={plan.checkOut}
              min={plan.checkIn}
              onChange={value =>
                update("checkOut", value)
              }
            />
          </div>

          <label className="field-label">
            Travelers

            <span className="select-wrapper">
              <Users size={16} />

              <span>
                {plan.adults}{" "}
                {plan.adults === 1
                  ? "Adult"
                  : "Adults"}
                , {plan.children}{" "}
                {plan.children === 1
                  ? "Child"
                  : "Children"}
              </span>
            </span>
          </label>

          <div>
            <span className="field-label">
              Travel Style
            </span>

            <Tabs
              items={[
                "Budget",
                "Comfort",
                "Luxury",
              ]}
              value={plan.style}
              onChange={value =>
                update(
                  "style",
                  value as TravelPlan["style"]
                )
              }
            />
          </div>

          <label className="checkline">
            <input
              type="checkbox"
              checked={
                plan.flexibleDates
              }
              onChange={e =>
                update(
                  "flexibleDates",
                  e.target.checked
                )
              }
            />

            <span>
              I'm flexible with dates
              (show better deals)
            </span>
          </label>
        </div>
      </Panel>
    </div>
  );
}

// PAGE 9 — DESTINATION INSIGHTS

export function DestinationInsights({
  plan,
  update,
  goTo,
}: PlannerActions) {
  const [tab, setTab] =
    useState<DashboardTab>("Overall");

  const ranked = useMemo(
    () =>
      [...DESTINATIONS]
        .sort(
          (a, b) =>
            Number(
              plan.countries.includes(
                b.country
              )
            ) -
              Number(
                plan.countries.includes(
                  a.country
                )
              ) ||
            a.cost - b.cost
        )
        .slice(0, 5),
    [plan.countries]
  );

  const metricMap: Record<
    DashboardTab,
    string
  > = {
    Overall: "cost",
    Cost: "cost",
    Weather: "weather",
    Events: "activities",
    Popularity: "popularity",
  };

  const itemKey = metricMap[tab];

  const metricItems = ranked.map(d => ({
    label: d.city,
    value:
      itemKey === "cost"
        ? Math.round(d.cost / 20)
        : d[
            itemKey as
              | "weather"
              | "activities"
              | "popularity"
          ],
  }));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Heading
          title="Explore Destinations"
          subtitle="Compare destinations by your interests, estimated budget, weather, events, and more."
        />

        <Notice />
      </div>

      <Tabs
        items={[
          "Overall",
          "Cost",
          "Weather",
          "Events",
          "Popularity",
        ]}
        value={tab}
        onChange={value =>
          setTab(value as DashboardTab)
        }
      />

      <div className="dashboard-layout">
        <Panel
          title="Destination Overview"
          aside={
            <span className="section-tag">
              {plan.countries.length} selected
              countries
            </span>
          }
        >
          <DestinationMap
            destinations={ranked}
          />
        </Panel>

        <Panel
          title={`${
            tab === "Overall"
              ? "Destination"
              : tab
          } Comparison`}
        >
          {tab === "Overall" ? (
            <ComparisonChart
              destinations={ranked}
            />
          ) : (
            <VerticalBars
              items={metricItems}
              title={`${tab} comparison`}
              color={
                tab === "Weather"
                  ? "#f7ac24"
                  : tab === "Popularity"
                  ? "#8957db"
                  : "#007a32"
              }
            />
          )}
        </Panel>

        <Panel
          title="Recommended Destinations"
          aside={
            <span className="muted tiny">
              Based on selected countries first
            </span>
          }
        >
          <div className="recommend-list">
            {ranked.map(d => (
              <button
                className="recommend-row"
                type="button"
                key={d.city}
                onClick={() => {
                  update(
                    "destination",
                    `${d.city}, ${d.country}`
                  );
                  goTo(8);
                }}
              >
                <Cover
                  image={d.image}
                  label={d.city}
                />

                <span>
                  <b>
                    {d.city}, {d.country}
                  </b>

                  <small>
                    {plan.countries.includes(
                      d.country
                    )
                      ? "Matches your selection"
                      : "Alternative destination"}
                  </small>
                </span>

                <strong>
                  <Currency value={d.cost} />
                </strong>

                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// PAGE 10 — ACCOMMODATION INSIGHTS

export function AccommodationInsights({
  plan,
}: PlannerActions) {
  const [maxPrice, setMaxPrice] =
    useState(500);

  const [stars, setStars] =
    useState(0);

  const [area, setArea] =
    useState("All Areas");

  const [detail, setDetail] =
    useState<string | null>(null);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const city =
    plan.destination.split(",")[0];

  const current = HOTELS.filter(
    h => h.city === city
  );

  const visible = current.filter(
    h =>
      h.nightly <= maxPrice &&
      (stars === 0 || h.stars === stars) &&
      (area === "All Areas" ||
        h.area === area)
  );

  const chosen = HOTELS.find(
    h => h.id === detail
  );

  const priceGroups = [
    100, 150, 200, 250, 300, 350, 400, 500,
  ].map((value, index) => ({
    label: `$${value}`,
    value: current.filter(
      h =>
        h.nightly >=
          (index === 0
            ? 0
            : [
                100, 150, 200, 250,
                300, 350, 400, 500,
              ][index - 1]) &&
        h.nightly < value
    ).length,
  }));

  const typeGroups = Object.entries(
    current.reduce<
      Record<string, number>
    >(
      (out, h) => ({
        ...out,
        [h.type]:
          (out[h.type] || 0) + 1,
      }),
      {}
    )
  ).map(([label, value]) => ({
    label,
    value,
  }));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Heading
          title={`Hotel Recommendations in ${city}`}
          subtitle="Explore hotel options based on price, location, and guest ratings."
        />

        <Notice />
      </div>

      <Panel
        title="Refine hotel results"
        className="filter-panel"
      >
        <div className="hotel-filters">
          <div className="filter-section">
            <label htmlFor="hotel-price">
              Price Range
              <b>
                $0 – ${maxPrice}
                {maxPrice === 500 ? "+" : ""}
              </b>
            </label>

            <input
              id="hotel-price"
              className="green-range"
              type="range"
              min="50"
              max="500"
              step="25"
              value={maxPrice}
              onChange={e =>
                setMaxPrice(
                  Number(e.target.value)
                )
              }
            />
          </div>

          <div className="filter-section">
            <span className="field-label">
              Star Rating
            </span>

            <Tabs
              items={[
                "All",
                "3★",
                "4★",
                "5★",
              ]}
              value={
                stars === 0
                  ? "All"
                  : `${stars}★`
              }
              onChange={v =>
                setStars(
                  v === "All"
                    ? 0
                    : Number(v[0])
                )
              }
            />
          </div>

          <label className="field-label">
            Area

            <select
              className="input-bordered"
              value={area}
              onChange={e =>
                setArea(e.target.value)
              }
            >
              <option>All Areas</option>

              {Array.from(
                new Set(
                  current.map(h => h.area)
                )
              ).map(a => (
                <option key={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      <div className="two-panel-grid">
        <Panel title="Price Distribution">
          <VerticalBars
            items={priceGroups}
            title="Number of hotel options by price"
          />
        </Panel>

        <Panel title="Hotel Types">
          <DonutChart
            items={
              typeGroups.length
                ? typeGroups
                : [
                    {
                      label: "No listings",
                      value: 1,
                    },
                  ]
            }
            total={`${current.length}`}
            label="Listings"
          />
        </Panel>
      </div>

      <Panel
        title={`Top Hotel Picks in ${city}`}
        aside={
          <span className="section-tag">
            {visible.length} results
          </span>
        }
      >
        {visible.length ? (
          <div className="result-cards">
            {visible.map(h => (
              <article
                className="result-card"
                key={h.id}
              >
                <div className="result-photo">
                  <Cover
                    image={h.image}
                    label={h.name}
                  />

                  <button
                    type="button"
                    className={`favorite ${
                      favorites.includes(
                        h.id
                      )
                        ? "liked"
                        : ""
                    }`}
                    aria-label={`${
                      favorites.includes(h.id)
                        ? "Remove"
                        : "Add"
                    } ${h.name} ${
                      favorites.includes(h.id)
                        ? "from"
                        : "to"
                    } favorites`}
                    onClick={() =>
                      setFavorites(v =>
                        v.includes(h.id)
                          ? v.filter(
                              id =>
                                id !== h.id
                            )
                          : [...v, h.id]
                      )
                    }
                  >
                    <Heart
                      size={17}
                      fill={
                        favorites.includes(h.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>

                <div className="result-body">
                  <b>{h.name}</b>

                  <small>
                    <span className="rating">
                      ★
                    </span>
                    {h.rating.toFixed(1)} ·{" "}
                    {h.stars} stars ·{" "}
                    {h.area}
                  </small>

                  <p>
                    <strong>
                      <Currency
                        value={h.nightly}
                      />
                    </strong>{" "}
                    <span className="muted">
                      / night
                    </span>
                  </p>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() =>
                      setDetail(h.id)
                    }
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No preview hotels match these
            filters. Try increasing your
            price range or changing the
            rating and area.
          </div>
        )}
      </Panel>

      {chosen && (
        <DetailDialog
          title={chosen.name}
          onClose={() =>
            setDetail(null)
          }
        >
          <Cover
            image={chosen.image}
            label={chosen.name}
            className="dialog-cover"
          />

          <p>
            <b>Area:</b> {chosen.area}
          </p>

          <p>
            <b>Type:</b> {chosen.type} ·{" "}
            {chosen.stars} stars
          </p>

          <p>
            <b>Illustrative rate:</b>{" "}
            <Currency
              value={chosen.nightly}
            />{" "}
            per night
          </p>

          <p>
            <b>Illustrative rating:</b>{" "}
            {chosen.rating}/5
          </p>

          <Notice />
        </DetailDialog>
      )}
    </div>
  );
}

// PAGE 11 — ACTIVITIES & EXPERIENCES

export function ActivityInsights({
  plan,
}: PlannerActions) {
  const [sort, setSort] =
    useState("Popularity");

  const [category, setCategory] =
    useState("All");

  const [detail, setDetail] =
    useState<string | null>(null);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const city =
    plan.destination.split(",")[0];

  const cityEntries =
    EXPERIENCES.filter(
      e => e.city === city
    );

  const list = cityEntries
    .filter(
      e =>
        category === "All" ||
        e.category === category
    )
    .sort((a, b) =>
      sort === "Price: Low to High"
        ? a.price - b.price
        : sort === "Price: High to Low"
        ? b.price - a.price
        : b.score - a.score
    );

  const picked = EXPERIENCES.find(
    e => e.id === detail
  );

  const grouped = Object.entries(
    cityEntries.reduce<
      Record<string, number>
    >(
      (out, entry) => ({
        ...out,
        [entry.category]:
          (out[entry.category] || 0) + 1,
      }),
      {}
    )
  ).map(([label, value]) => ({
    label,
    value,
  }));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Heading
          title="Activities & Experiences"
          subtitle="Discover popular experiences with clear visual comparisons."
        />

        <Notice />
      </div>

      <Panel
        title="Activity Popularity"
        aside={
          <select
            aria-label="Sort activities"
            className="input-bordered compact"
            value={sort}
            onChange={e =>
              setSort(e.target.value)
            }
          >
            <option>Popularity</option>
            <option>
              Price: Low to High
            </option>
            <option>
              Price: High to Low
            </option>
          </select>
        }
      >
        <HorizontalBars
          title="Activity popularity scores"
          items={list.map(item => ({
            label: item.name,
            value: item.score,
          }))}
        />

        {!list.length && (
          <p className="empty-state">
            No preview activities in
            this category.
          </p>
        )}
      </Panel>

      <div className="two-panel-grid">
        <Panel title="Activity Types">
          <DonutChart
            items={
              grouped.length
                ? grouped
                : [
                    {
                      label: "No listings",
                      value: 1,
                    },
                  ]
            }
            total={`${cityEntries.length}`}
            label="Activities"
          />
        </Panel>

        <Panel title="Compare Activity Prices">
          <HorizontalBars
            title="Illustrative activity prices"
            max={100}
            suffix="$"
            items={list
              .slice(0, 5)
              .map(e => ({
                label: e.name,
                value: e.price,
              }))}
          />
        </Panel>
      </div>

      <Panel
        title="Recommended Activities"
        aside={
          <select
            aria-label="Filter activities by category"
            className="input-bordered compact"
            value={category}
            onChange={e =>
              setCategory(e.target.value)
            }
          >
            <option>All</option>

            {ACTIVITY_CATEGORIES.filter(
              v => v !== "All"
            ).map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        }
      >
        {list.length ? (
          <div className="result-cards">
            {list.map(e => (
              <article
                key={e.id}
                className="result-card"
              >
                <div className="result-photo">
                  <Cover
                    image={e.image}
                    label={e.name}
                  />

                  <button
                    className={`favorite ${
                      favorites.includes(e.id)
                        ? "liked"
                        : ""
                    }`}
                    type="button"
                    aria-label={`Toggle favorite ${e.name}`}
                    onClick={() =>
                      setFavorites(f =>
                        f.includes(e.id)
                          ? f.filter(
                              id =>
                                id !== e.id
                            )
                          : [...f, e.id]
                      )
                    }
                  >
                    <Heart
                      size={17}
                      fill={
                        favorites.includes(
                          e.id
                        )
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>

                <div className="result-body">
                  <b>{e.name}</b>

                  <small>
                    <span className="rating">
                      ★
                    </span>
                    {e.score}/100 ·{" "}
                    {e.category}
                  </small>

                  <p>
                    <strong>
                      <Currency
                        value={e.price}
                      />
                    </strong>{" "}
                    <span className="muted">
                      / person
                    </span>
                  </p>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() =>
                      setDetail(e.id)
                    }
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No sample activities available
            for this destination and
            category.
          </p>
        )}
      </Panel>

      {picked && (
        <DetailDialog
          title={picked.name}
          onClose={() =>
            setDetail(null)
          }
        >
          <Cover
            image={picked.image}
            label={picked.name}
            className="dialog-cover"
          />

          <p>
            <b>Category:</b>{" "}
            {picked.category}
          </p>

          <p>
            <b>Illustrative popularity:</b>{" "}
            {picked.score}/100
          </p>

          <p>
            <b>Illustrative cost:</b>{" "}
            <Currency
              value={picked.price}
            />
          </p>

          <Notice />
        </DetailDialog>
      )}
    </div>
  );
}

// PAGE 12 — EVENTS & ITINERARY INSIGHTS

export function EventInsights({
  plan,
}: PlannerActions) {
  const [category, setCategory] =
    useState("All");

  const [period, setPeriod] =
    useState("All dates");

  const [detail, setDetail] =
    useState<string | null>(null);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const city =
    plan.destination.split(",")[0];

  const allCityEvents =
    EVENTS.filter(
      e => e.city === city
    );

  const periods: Record<
    string,
    number
  > = {
    "All dates": Infinity,
    "Next 3 months": 92,
    "Next 6 months": 183,
  };

  const now = new Date();

  const filtered = allCityEvents.filter(
    e =>
      (category === "All" ||
        e.category === category) &&
      (period === "All dates" ||
        ((new Date(
          `${e.date}T00:00:00`
        ).getTime() -
          now.getTime()) /
          86400000 >= 0 &&
          (new Date(
            `${e.date}T00:00:00`
          ).getTime() -
            now.getTime()) /
            86400000 <=
            periods[period]))
  );

  const selected = EVENTS.find(
    e => e.id === detail
  );

  const countByType = Object.entries(
    filtered.reduce<
      Record<string, number>
    >(
      (out, e) => ({
        ...out,
        [e.category]:
          (out[e.category] || 0) + 1,
      }),
      {}
    )
  ).map(([label, value]) => ({
    label,
    value,
  }));

  const categoryPrices = Object.entries(
    filtered.reduce<
      Record<string, number[]>
    >(
      (out, e) => ({
        ...out,
        [e.category]: [
          ...(out[e.category] || []),
          e.price,
        ],
      }),
      {}
    )
  ).map(([label, prices]) => ({
    label,
    value: Math.round(
      prices.reduce(
        (sum, price) => sum + price,
        0
      ) / prices.length
    ),
  }));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Heading
          title={`Upcoming Events in ${city}`}
          subtitle="Explore concerts, festivals, sports, and cultural events."
        />

        <Notice />
      </div>

      <Tabs
        items={EVENT_CATEGORIES}
        value={category}
        onChange={setCategory}
      />

      <Panel
        title="Events Timeline"
        aside={
          <select
            className="input-bordered compact"
            aria-label="Event date range"
            value={period}
            onChange={e =>
              setPeriod(e.target.value)
            }
          >
            {Object.keys(periods).map(
              p => (
                <option key={p}>{p}</option>
              )
            )}
          </select>
        }
      >
        {filtered.length ? (
          <EventTimeline events={filtered} />
        ) : (
          <p className="empty-state">
            No sample events in this
            category and date range.
          </p>
        )}
      </Panel>

      <div className="two-panel-grid">
        <Panel title="Events by Category">
          <DonutChart
            items={
              countByType.length
                ? countByType
                : [
                    {
                      label: "No events",
                      value: 1,
                    },
                  ]
            }
            total={`${filtered.length}`}
            label="Events"
          />
        </Panel>

        <Panel title="Average Event Cost">
          <VerticalBars
            title="Average estimated event cost by category"
            items={categoryPrices}
            color="#3989f5"
          />
        </Panel>
      </div>

      <Panel
        title="Featured Events"
        aside={
          <span className="section-tag">
            {filtered.length} preview
            events
          </span>
        }
      >
        {filtered.length ? (
          <div className="result-cards">
            {filtered.map(e => (
              <article
                className="result-card"
                key={e.id}
              >
                <div className="result-photo">
                  <Cover
                    image={e.image}
                    label={e.name}
                  />

                  <button
                    type="button"
                    className={`favorite ${
                      favorites.includes(e.id)
                        ? "liked"
                        : ""
                    }`}
                    aria-label={`Toggle favorite ${e.name}`}
                    onClick={() =>
                      setFavorites(v =>
                        v.includes(e.id)
                          ? v.filter(
                              id =>
                                id !== e.id
                            )
                          : [...v, e.id]
                      )
                    }
                  >
                    <Heart
                      size={17}
                      fill={
                        favorites.includes(
                          e.id
                        )
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>

                <div className="result-body">
                  <b>{e.name}</b>

                  <small>
                    <CalendarDays size={13} />
                    {new Date(
                      `${e.date}T12:00:00`
                    ).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </small>

                  <small>
                    <MapPin size={13} />
                    {e.location}
                  </small>

                  <p>
                    <strong>
                      <Currency
                        value={e.price}
                      />
                    </strong>{" "}
                    <span className="muted">
                      est.
                    </span>
                  </p>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() =>
                      setDetail(e.id)
                    }
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            Try a different event category
            or date range.
          </p>
        )}
      </Panel>

      {selected && (
        <DetailDialog
          title={selected.name}
          onClose={() =>
            setDetail(null)
          }
        >
          <Cover
            image={selected.image}
            label={selected.name}
            className="dialog-cover"
          />

          <p>
            <b>Category:</b>{" "}
            {selected.category}
          </p>

          <p>
            <b>Illustrative date:</b>{" "}
            {selected.date}
          </p>

          <p>
            <b>Location:</b>{" "}
            {selected.location}
          </p>

          <p>
            <b>Illustrative ticket estimate:</b>{" "}
            <Currency
              value={selected.price}
            />
          </p>

          <Notice />
        </DetailDialog>
      )}
    </div>
  );
}

// SINGLE REUSABLE SCREEN DISPATCHER

export function PlannerStep(
  props: PlannerActions
) {
  switch (props.plan.step) {
    case 1:
      return (
        <Splash goTo={props.goTo} />
      );

    case 2:
      return (
        <Countries {...props} />
      );

    case 3:
      return (
        <EstimatedBudget {...props} />
      );

    case 4:
      return (
        <Welcome {...props} />
      );

    case 5:
      return (
        <RecommendationFilters {...props} />
      );

    case 6:
      return (
        <DestinationInsights {...props} />
      );

    case 7:
      return (
        <AccommodationInsights {...props} />
      );

    default:
      return null;
  }
}
