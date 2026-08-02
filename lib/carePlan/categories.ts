import { Utensils, Activity, Pill, Moon, Wind, type LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/theme/tokens";
import type { PlanCategory } from "@/lib/types/db";

export interface CarePlanCategoryConfig {
  key: PlanCategory;
  label: string;
  Icon: LucideIcon;
  color: string;
  /** Shown when no doctor-verified plan exists yet for this category (before delivery, or a category the reviewer left blank). Generic, non-personalized wellness guidance only. */
  fallback: string;
}

// Order here is the display order everywhere (Care Plan tab, drill-down nav,
// admin editor) — deliberately nutrition/exercise first (the two every
// participant expects), medications third (self-report, not a recommendation
// to act on), sleep/mindfulness last (mental-pillar adjacent).
export const CARE_PLAN_CATEGORIES: CarePlanCategoryConfig[] = [
  {
    key: "nutrition",
    label: "Nutrition",
    Icon: Utensils,
    color: colors.metabolic,
    fallback: "General guidance: favor balanced, whole-food meals with consistent timing.",
  },
  {
    key: "exercise",
    label: "Exercise",
    Icon: Activity,
    color: colors.vascular,
    fallback: "General guidance: aim for regular movement most days of the week.",
  },
  {
    key: "medications",
    label: "Medications & Supplements",
    Icon: Pill,
    color: colors.sageDark,
    fallback: "Track what you currently take below — your care team will weigh in once your card is reviewed.",
  },
  {
    key: "sleep",
    label: "Sleep & Recovery",
    Icon: Moon,
    color: colors.mental,
    fallback: "General guidance: protect a consistent 7-9 hour sleep window.",
  },
  {
    key: "mindfulness",
    label: "Mindfulness & Stress",
    Icon: Wind,
    color: colors.mentalDark,
    fallback: "General guidance: build in a few minutes of rest or recovery each day.",
  },
];

export const CARE_PLAN_CATEGORIES_BY_KEY: Record<PlanCategory, CarePlanCategoryConfig> = Object.fromEntries(
  CARE_PLAN_CATEGORIES.map((c) => [c.key, c])
) as Record<PlanCategory, CarePlanCategoryConfig>;
