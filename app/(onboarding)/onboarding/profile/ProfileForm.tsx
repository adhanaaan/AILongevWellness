"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { updateParticipantAction } from "@/lib/data/actions";
import type { Participant } from "@/lib/types/db";

const GOAL_OPTIONS = ["Longevity", "Energy & focus", "Weight management", "Stress resilience", "Sleep quality", "Cardiovascular fitness"];

export function ProfileForm({ participant }: { participant: Participant }) {
  const router = useRouter();
  const [enteredBy, setEnteredBy] = useState("me");
  const [name, setName] = useState(participant.name);
  const [age, setAge] = useState(String(participant.age));
  const [sex, setSex] = useState(participant.sex);
  const [height, setHeight] = useState(String(participant.height_cm));
  const [weight, setWeight] = useState(String(participant.weight_kg));
  const [goals, setGoals] = useState<string[]>(participant.goals);
  const [exercise, setExercise] = useState("regularly");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState("occasionally");
  const [isPending, startTransition] = useTransition();

  function toggleGoal(goal: string) {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  }

  function onContinue() {
    startTransition(async () => {
      await updateParticipantAction(participant.id, {
        name,
        age: Number(age),
        sex,
        height_cm: Number(height),
        weight_kg: Number(weight),
        goals,
      });
      router.push("/capture");
    });
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg text-charcoal">Your profile</h1>
        <SegmentedControl
          options={[
            { value: "me", label: "Me" },
            { value: "admin", label: "Admin" },
          ]}
          value={enteredBy}
          onChange={setEnteredBy}
        />
      </div>
      <p className="mt-2 text-body-md text-ink-muted">
        {enteredBy === "me" ? "Fill this in yourself." : "A care team member is entering this on your behalf."}
      </p>

      <div className="mt-6 space-y-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          <Select label="Sex" value={sex} onChange={(e) => setSex(e.target.value as Participant["sex"])}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Height (cm)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          <Input label="Weight (kg)" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>

        <div>
          <p className="mb-2 text-label-md text-charcoal">Goals</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <Chip key={goal} selected={goals.includes(goal)} onToggle={() => toggleGoal(goal)}>
                {goal}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-label-md text-charcoal">Basic health</p>
          <Select label="Exercise frequency" value={exercise} onChange={(e) => setExercise(e.target.value)}>
            <option value="never">Rarely / never</option>
            <option value="sometimes">A few times a month</option>
            <option value="regularly">Most weeks</option>
          </Select>
          <div className="flex items-center justify-between">
            <span className="text-body-md text-charcoal">Smoking</span>
            <Toggle checked={smoking} onChange={setSmoking} label="Smoking" />
          </div>
          <Select label="Alcohol" value={alcohol} onChange={(e) => setAlcohol(e.target.value)}>
            <option value="never">Never</option>
            <option value="occasionally">Occasionally</option>
            <option value="regularly">Regularly</option>
          </Select>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Button className="w-full" size="lg" disabled={isPending} onClick={onContinue}>
          Continue to capture
        </Button>
      </div>
    </div>
  );
}
