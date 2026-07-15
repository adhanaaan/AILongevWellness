import { OnboardingStepper } from "@/components/layout/OnboardingStepper";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OnboardingStepper>{children}</OnboardingStepper>;
}
