"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = React.useState<{ width: number; x: number; visible: boolean }>({
    width: 0,
    x: 0,
    visible: false,
  });

  React.useLayoutEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    const updateIndicator = () => {
      const activeTrigger = listEl.querySelector(
        '[data-slot="tabs-trigger"][data-state="active"]',
      ) as HTMLElement | null;

      if (!activeTrigger) {
        setIndicator(prev => ({ ...prev, visible: false }));
        return;
      }

      const listRect = listEl.getBoundingClientRect();
      const triggerRect = activeTrigger.getBoundingClientRect();
      const x = triggerRect.left - listRect.left;
      const width = triggerRect.width;

      setIndicator({ x, width, visible: true });
    };

    updateIndicator();

    const mutationObserver = new MutationObserver(() => updateIndicator());
    mutationObserver.observe(listEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    const resizeObserver = new ResizeObserver(() => updateIndicator());
    resizeObserver.observe(listEl);

    window.addEventListener("resize", updateIndicator);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, []);

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      ref={listRef}
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        data-slot="tabs-indicator"
        className={cn(
          "pointer-events-none absolute inset-y-[3px] left-0 rounded-xl bg-card shadow-xs transition-[transform,width,opacity] duration-200 ease-out dark:bg-input/30",
          indicator.visible ? "opacity-100" : "opacity-0",
        )}
        style={{
          width: `${indicator.width}px`,
          transform: `translateX(${indicator.x}px)`,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring relative z-10 inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
