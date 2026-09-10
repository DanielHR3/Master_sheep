import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../../lib/utils";

type SegmentedProps = Omit<
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>,
  "type"
>;

export const Segmented = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedProps
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    type="single"
    className={cn(
      "inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/60 p-1",
      className
    )}
    {...(props as React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>)}
  />
));
Segmented.displayName = "Segmented";

export const SegmentedItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors",
      "hover:text-slate-100",
      "data-[state=on]:bg-agrotech-emerald data-[state=on]:text-white data-[state=on]:shadow",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agrotech-cyan",
      className
    )}
    {...props}
  />
));
SegmentedItem.displayName = "SegmentedItem";
