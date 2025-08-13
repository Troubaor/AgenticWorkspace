import * as React from "react";
import { RotateCw } from "lucide-react";

const steps = [
  "Analyzing input…",
  "Retrieving context…",
  "Linking ideas…",
  "Formulating response…",
  "Refining output…",
];

export function ThinkingIndicator() {
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1500); // change every 1.5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
      <div className="relative flex items-center justify-center">
        {/* Pulsing gradient ring */}
        <span className="absolute h-6 w-6 animate-ping rounded-full bg-gradient-to-r from-primary/40 to-primary/10" />
        <RotateCw className="relative h-4 w-4 animate-spin" />
      </div>
      <span>{steps[stepIndex]}</span>
    </div>
  );
}
