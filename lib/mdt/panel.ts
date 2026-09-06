// The Multidisciplinary Team (MDT) reviewing a participant's results — a panel of
// specialists who review the case together before the plan is finalised. Shown on
// the participant side as a trust signal (see components/participant/MdtReviewCard).
//
// This is demo/config content for now (Paul's MDT: Dr Tong, Dr Nick, Dr Jun),
// presented as a review IN PROGRESS. Real per-participant MDT status is on the
// roadmap; kept in one place so the names stay consistent across the app
// (Insights card + the TCM / nutrition analysis reports).

export type MdtReviewStatus = "reviewed" | "in_review";

export interface MdtReviewer {
  name: string;
  status: MdtReviewStatus;
}

export const MDT_PANEL: MdtReviewer[] = [
  { name: "Dr Tong", status: "reviewed" },
  { name: "Dr Nick", status: "reviewed" },
  { name: "Dr Jun", status: "in_review" },
];

// True while any member is still reviewing — drives the "in progress" framing.
export const MDT_IN_PROGRESS = MDT_PANEL.some((r) => r.status === "in_review");

// "Dr Tong, Dr Nick & Dr Jun" — for one-line references (e.g. analysis reports).
export function mdtNames(): string {
  const names = MDT_PANEL.map((r) => r.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
