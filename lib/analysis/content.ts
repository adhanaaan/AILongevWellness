import { colors } from "@/lib/theme/tokens";

// Sample content for the two "deeper analysis" reports (TCM Analysis, Nutritional
// Corrective Medicine). These showcase capabilities the platform offers; the copy
// is realistic and consistent with the James Chen demo numbers (LDL 5.24, HbA1c
// 6.0), and deliberately WELLNESS-framed — constitutional/nutritional guidance and
// "areas to support", never diagnosis, medication, or dosing. Real per-participant
// generation is on the roadmap; this is the reviewed sample shown in the app.

export type AnalysisStatStatus = "good" | "monitor" | "support";

export interface AnalysisStat {
  label: string;
  value?: string;
  status?: AnalysisStatStatus;
  note?: string;
}

export interface AnalysisSection {
  heading: string;
  body?: string;
  stats?: AnalysisStat[];
  steps?: string[];
}

export interface AnalysisReportContent {
  key: "tcm" | "nutrition";
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  reviewer: string;
  sections: AnalysisSection[];
}

export const TCM_ANALYSIS: AnalysisReportContent = {
  key: "tcm",
  eyebrow: "Traditional Chinese Medicine",
  title: "TCM Analysis",
  subtitle:
    "A constitutional wellness read drawn from your intake and screening, reviewed by a TCM practitioner alongside your Western results.",
  accent: colors.terracotta,
  reviewer: "Reviewed by Dr. Mei Lin, TCM Practitioner (Reg. TCMB)",
  sections: [
    {
      heading: "Your constitution",
      body:
        "Predominantly Qi-deficient (气虚) with a mild internal-heat tendency. In everyday terms: energy that starts strong but dips in the afternoon, a tendency to feel warm, and digestion that runs better on lighter, cooked food than on heavy or raw meals.",
    },
    {
      heading: "Organ-system balance",
      stats: [
        { label: "Spleen & Stomach", note: "Digestion & energy", status: "support" },
        { label: "Liver", note: "Flow & stress regulation", status: "monitor" },
        { label: "Kidney", note: "Foundational reserve", status: "good" },
        { label: "Heart", note: "Sleep & calm", status: "good" },
        { label: "Lung", note: "Immunity & skin", status: "good" },
      ],
    },
    {
      heading: "What we're seeing",
      body:
        "The raised lipid and glucose patterns in your screening read, in TCM terms, as some 'damp accumulation' from Spleen qi working harder than it should — often linked to rich diet and irregular meals. Mild Liver qi stagnation fits the stress and afternoon energy dips. None of this is cause for alarm; it points to a few high-leverage habits.",
    },
    {
      heading: "Suggested focus",
      steps: [
        "Favour warming, easily-digested meals — congee, ginger, cooked vegetables, soups — over heavy, cold, or raw foods.",
        "Choose gentle daily movement (walking, qi gong, tai chi) over intense training on low-energy days.",
        "Keep a consistent bedtime before 11pm to support Liver restoration.",
        "Build in short daily wind-down to ease Liver qi flow and steady the afternoon dip.",
      ],
    },
  ],
};

export const NUTRITION_ANALYSIS: AnalysisReportContent = {
  key: "nutrition",
  eyebrow: "Functional Nutrition",
  title: "Nutritional Corrective Medicine",
  subtitle:
    "A corrective-nutrition strategy targeting the specific patterns in your screening, reviewed by your care team.",
  accent: colors.metabolic,
  reviewer: "Reviewed by your care team",
  sections: [
    {
      heading: "Priority patterns to correct",
      stats: [
        { label: "LDL cholesterol", value: "5.24 mmol/L", status: "monitor", note: "Above your ideal — the main lever" },
        { label: "HbA1c", value: "6.0 %", status: "monitor", note: "Edging up — steady glucose is the aim" },
        { label: "Inflammation & kidney markers", value: "Watch", status: "support", note: "Support and re-check" },
      ],
    },
    {
      heading: "Corrective nutrition strategy",
      body:
        "The pattern is diet-responsive, and food is the first lever. The emphasis is a Mediterranean-style base with the carbohydrate load timed around activity.",
      steps: [
        "Emphasise: oily fish, extra-virgin olive oil, legumes, soluble-fibre vegetables, oats, nuts, and berries.",
        "Reduce: refined carbohydrates, added sugars, processed meats, and deep-fried foods.",
        "Time most of your carbohydrates around exercise to keep glucose steadier through the day.",
      ],
    },
    {
      heading: "Targeted support to discuss",
      body:
        "Nutrient support your care team may consider alongside the diet — to review together, not to start on your own:",
      stats: [
        { label: "Omega-3 (EPA/DHA)", note: "Lipid & inflammation support", status: "support" },
        { label: "Magnesium", note: "Glucose metabolism & sleep", status: "support" },
        { label: "Vitamin D", note: "If your level comes back low", status: "support" },
      ],
    },
    {
      heading: "Your first three steps",
      steps: [
        "Swap one refined-carb meal a day for a fibre-and-protein plate.",
        "Add two portions of oily fish this week.",
        "Take a 10-minute walk after your largest meal to blunt the glucose spike.",
      ],
    },
  ],
};

export const ANALYSIS_REPORTS: Record<"tcm" | "nutrition", AnalysisReportContent> = {
  tcm: TCM_ANALYSIS,
  nutrition: NUTRITION_ANALYSIS,
};
