import { Utensils, Activity, Pill, Moon, Wind, type LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/theme/tokens";
import type { PlanCategory } from "@/lib/types/db";

export interface CarePlanCategoryConfig {
  key: PlanCategory;
  label: string;
  Icon: LucideIcon;
  color: string;
  /** One-line summary of the generic guidance (used where only a snippet fits). */
  fallback: string;
  /**
   * A full, substantive starter plan shown before a personalized AI draft exists,
   * so the Care Plan is never an empty placeholder — every account opens onto a
   * real, multi-point protocol. Deliberately GENERIC best-practice wellness
   * guidance (not personalized to any biomarker), surfaced without the
   * "AI-drafted" badge so it's never presented as a reviewed or tailored plan;
   * a real `AiDraft.care_plan` replaces it the moment one is generated.
   */
  starter: string[];
  /**
   * Whether this category has a daily self-report interaction. Deliberately
   * only true for things a wearable/lab capture can never tell us on its own
   * (what you take, how you feel) — nutrition/exercise/sleep are plan-only
   * until real wearable sync exists (still on the roadmap), rather than
   * asking participants to manually re-enter data their wearable should
   * already have.
   */
  tracked: boolean;
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
    fallback: "Anchor each meal around protein and fiber to steady energy and appetite.",
    starter: [
      "Anchor each meal around protein and fiber — it steadies energy, appetite, and blood sugar through the day.",
      "Favor whole foods and consistent meal timing over restrictive dieting.",
      "Keep hydration steady across the day rather than front- or back-loading it.",
      "Treat the last two hours before bed as a lighter window to protect sleep and overnight recovery.",
    ],
    tracked: false,
  },
  {
    key: "exercise",
    label: "Exercise",
    Icon: Activity,
    color: colors.vascular,
    fallback: "Aim for movement most days — even a brisk 20–30 minute walk counts.",
    starter: [
      "Aim for movement most days — even a brisk 20–30 minute walk counts.",
      "Include at least one strength session a week to preserve muscle and metabolic health.",
      "Add easy Zone 2 cardio (a conversational pace you could hold for an hour) to build your aerobic base.",
      "Break up long sitting with a couple of minutes of movement every hour.",
    ],
    tracked: false,
  },
  {
    key: "medications",
    label: "Medications & Supplements",
    Icon: Pill,
    color: colors.sageDark,
    fallback: "Add what you currently take so it's all in one place.",
    starter: [
      "Add what you currently take — prescriptions and supplements — so it's all in one place.",
      "Check in daily to keep a simple adherence record your care team can see.",
      "Always review any supplement change with your care team before starting or stopping.",
    ],
    tracked: true,
  },
  {
    key: "sleep",
    label: "Sleep & Recovery",
    Icon: Moon,
    color: colors.mental,
    fallback: "Protect a consistent 7–9 hour sleep window with a steady wake time.",
    starter: [
      "Protect a consistent 7–9 hour sleep window, with the same wake time each day.",
      "Wind down screen-free for the last 30 minutes before bed.",
      "Keep the bedroom cool, dark, and quiet to protect deep sleep.",
      "Keep your wind-down routine consistent on travel and high-stress days, when sleep slips first.",
    ],
    tracked: false,
  },
  {
    key: "mindfulness",
    label: "Mindfulness & Stress",
    Icon: Wind,
    color: colors.mentalDark,
    fallback: "Build in a few minutes of daily rest — even one slow-breathing break helps.",
    starter: [
      "Build in a few minutes of daily rest — even one slow-breathing break helps reset stress.",
      "Do a short midday reset on your highest-demand days.",
      "Notice which parts of your week drain you most, and build a little recovery around them.",
    ],
    tracked: true,
  },
];

export const CARE_PLAN_CATEGORIES_BY_KEY: Record<PlanCategory, CarePlanCategoryConfig> = Object.fromEntries(
  CARE_PLAN_CATEGORIES.map((c) => [c.key, c])
) as Record<PlanCategory, CarePlanCategoryConfig>;
