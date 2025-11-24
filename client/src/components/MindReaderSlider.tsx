/**
 * Mind-Reader Slider Component
 * A draggable slider that controls text difficulty level (1.0 - 4.0)
 * with smooth visual feedback
 */

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface MindReaderSliderProps {
  microLevel: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const LEVEL_LABELS = [
  { value: 1, label: "Starter", sublabel: "Grade 1-2" },
  { value: 2, label: "Rising", sublabel: "Grade 5-6" },
  { value: 3, label: "Advanced", sublabel: "Grade 8-9" },
  { value: 4, label: "Original", sublabel: "Full text" },
];

export default function MindReaderSlider({
  microLevel,
  onChange,
  disabled = false,
  className,
}: MindReaderSliderProps) {
  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-foreground/80">
          Reading Level
        </label>
        <span className="text-xs text-muted-foreground font-mono">
          {microLevel.toFixed(1)}
        </span>
      </div>
      
      <Slider
        value={[microLevel]}
        min={1}
        max={4}
        step={0.1}
        disabled={disabled}
        onValueChange={(val) => onChange(val[0])}
        className="cursor-grab active:cursor-grabbing"
      />
      
      <div className="flex justify-between mt-2">
        {LEVEL_LABELS.map((level) => (
          <div
            key={level.value}
            className={cn(
              "text-center transition-opacity duration-150",
              Math.round(microLevel) === level.value
                ? "opacity-100"
                : "opacity-50"
            )}
          >
            <div className="text-xs font-medium">{level.label}</div>
            <div className="text-[10px] text-muted-foreground">
              {level.sublabel}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-3">
        Drag to bend the words
      </p>
    </div>
  );
}
