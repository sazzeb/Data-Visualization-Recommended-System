
export type BudgetMode =
  | "personal"
  | "group-person"
  | "group-total";

export type TravelStyle =
  | ""
  | "Budget"
  | "Comfort"
  | "Luxury";

export type ListField =
  | "interests"
  | "countries"
  | "services"
  | "activities";

export type DashboardTab =
  | "Overall"
  | "Cost"
  | "Weather"
  | "Events"
  | "Popularity";

export interface TravelPlan {
  step: number;
  interests: string[];
  recommendationFilters: Record<
    string,
    string[]
  >;
  recommendationFilterIndex: number;
  recommendationPreviewReady: boolean;
  budget: number;
  budgetMode: BudgetMode;
  budgetSelected: boolean;
  travelDatesSelected: boolean;
  individualBudgets: number[];
  travelerNames: string[];
  countries: string[];
  services: string[];
  activities: string[];
  accommodation: string;
  accommodationChoices: string[];
  adults: number;
  children: number;
  destination: string;
  selectedDestinationId: string | null;
  checkIn: string;
  checkOut: string;
  style: TravelStyle;
  flexibleDates: boolean;
}

export interface RecommendationItem {
  id: string;
  source: string;
  type: string;
  name: string;
  country: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  matchedFilters: string[];
  matchedFilterCategories: string[];
  accommodationReference: string;
  metadata: Record<string, string>;
  sourceRow: Record<string, string>;
}

export interface RecommendationItinerary {
  rank: number;
  budgetFitPercentage: number;
  totalCost: number;
  budget: number;
  remainingBudget: number;
  nights: number;
  travelers: number;
  accommodationCost: number;
  activityCost: number;
  transportCost: number;
  distanceKm: number;
  accommodation: RecommendationItem;
  activities: RecommendationItem[];
  childRecommendations: Record<string, RecommendationItem[]>;
  transport: RecommendationItem | null;
}

export interface RecommendationResponse {
  generatedAt: string;
  criteria: {
    countries: string[];
    accommodationChoices: string[];
    filters: Record<string, string[]>;
  };
  top10: RecommendationItinerary[];
  firstRecommendation: RecommendationItinerary | null;
  dataSources: string[];
  totalCandidates: number;
}

export interface Destination {
  city: string;
  country: string;
  cost: number;
  activities: number;
  weather: number;
  popularity: number;
  image: string;
  x: number;
  y: number;
}

export interface Hotel {
  id: string;
  city: string;
  name: string;
  type: string;
  stars: number;
  nightly: number;
  rating: number;
  area: string;
  image: string;
}

export interface Experience {
  id: string;
  city: string;
  name: string;
  category: string;
  score: number;
  price: number;
  image: string;
}

export interface LocalEvent {
  id: string;
  city: string;
  name: string;
  category: string;
  date: string;
  price: number;
  location: string;
  image: string;
}

export const INITIAL_PLAN: TravelPlan = {
  step: 1,
  interests: [],
  recommendationFilters: {},
  recommendationFilterIndex: 0,
  recommendationPreviewReady: false,
  budget: 0,
  budgetMode: "personal",
  budgetSelected: false,
  travelDatesSelected: false,
  individualBudgets: [0],
  travelerNames: [""],
  countries: [],
  services: [],
  activities: [],
  accommodation: "",
  accommodationChoices: [],
  adults: 1,
  children: 0,
  destination: "",
  selectedDestinationId: null,
  checkIn: "",
  checkOut: "",
  style: "",
  flexibleDates: false,
};
