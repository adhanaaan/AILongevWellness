import {
  Infinity as InfinityIcon,
  Zap,
  Scale,
  Shield,
  Moon,
  HeartPulse,
  type LucideIcon,
} from "lucide-react-native";

// The shared wellness-goal catalog. Lives here (not in a screen) so both the
// onboarding quiz (app/onboarding/quiz.tsx) and the goals edit screen
// (app/onboarding/profile-goals.tsx) read the same list — the single source of
// truth after the old multi-screen questionnaire chain was consolidated.
export interface Goal {
  label: string;
  description: string;
  icon: LucideIcon;
}

export const GOALS: Goal[] = [
  { label: "Longevity", description: "Build habits that add healthy years.", icon: InfinityIcon },
  { label: "Energy & focus", description: "Feel sharper and less drained.", icon: Zap },
  { label: "Weight management", description: "Find a sustainable, healthy weight.", icon: Scale },
  { label: "Stress resilience", description: "Handle pressure with more ease.", icon: Shield },
  { label: "Sleep quality", description: "Fall asleep faster and rest deeper.", icon: Moon },
  { label: "Cardiovascular fitness", description: "Strengthen your heart and stamina.", icon: HeartPulse },
];
