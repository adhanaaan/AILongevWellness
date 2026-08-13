import { Utensils, Activity, Pill, Moon, Wind, type LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/theme/tokens";
import type { PlanCategory, PlanItem } from "@/lib/types/db";

/**
 * Coerce a care-plan item to the structured {title, detail} shape. Drafts
 * written before the PlanItem restructure stored plain strings — those become a
 * title-only item so old cards still render (they get replaced on regeneration).
 */
export function normalizePlanItem(item: PlanItem | string): PlanItem {
  return typeof item === "string" ? { title: item } : item;
}

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
  starter: PlanItem[];
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
      { title: "Anchor meals around protein and fibre", detail: "Steadies energy, appetite, and blood sugar through the day." },
      { title: "Favor whole foods over restrictive dieting", detail: "Consistent meal timing beats cutting whole food groups." },
      { title: "Keep hydration steady all day", detail: "Spread water out rather than front- or back-loading it." },
      { title: "Lighten the last two hours before bed", detail: "Protects sleep and overnight recovery." },
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
      { title: "Move most days", detail: "Even a brisk 20–30 minute walk counts." },
      { title: "Add one strength session a week", detail: "Preserves muscle and metabolic health." },
      { title: "Build an aerobic base with Zone 2", detail: "An easy, conversational pace you could hold for an hour." },
      { title: "Break up long sitting", detail: "A couple of minutes of movement every hour." },
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
      { title: "Add what you currently take", detail: "Prescriptions and supplements, all in one place." },
      { title: "Check in daily", detail: "Keeps a simple adherence record your care team can see." },
      { title: "Review changes with your care team", detail: "Before starting or stopping any supplement." },
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
      { title: "Keep a consistent sleep window", detail: "7–9 hours, with the same wake time each day." },
      { title: "Wind down screen-free", detail: "For the last 30 minutes before bed." },
      { title: "Keep the bedroom cool, dark, and quiet", detail: "Protects deep sleep." },
      { title: "Hold your routine on hard days", detail: "Travel and high-stress days are when sleep slips first." },
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
      { title: "Take a few minutes of daily rest", detail: "Even one slow-breathing break resets stress." },
      { title: "Do a midday reset", detail: "On your highest-demand days." },
      { title: "Notice what drains you", detail: "Build a little recovery around it." },
    ],
    tracked: true,
  },
];

export const CARE_PLAN_CATEGORIES_BY_KEY: Record<PlanCategory, CarePlanCategoryConfig> = Object.fromEntries(
  CARE_PLAN_CATEGORIES.map((c) => [c.key, c])
) as Record<PlanCategory, CarePlanCategoryConfig>;
