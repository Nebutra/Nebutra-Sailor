import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { type Activity, ActivityCalendar } from "react-activity-calendar";

export function ActivityMatrix() {
  const { theme } = useTheme();
  const [data, setData] = useState<Activity[]>([]);

  useEffect(() => {
    // Generate deterministic heatmap data for the last year
    const mockData: Activity[] = [];
    const today = new Date();

    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dateStr = date.toISOString().split("T")[0];
      if (!dateStr) continue;

      // Deterministic fake wave pattern for data visualization
      const isHigh = Math.sin(i / 3) + Math.sin(i / 13) > 0.5;
      const isIdle = Math.sin(i * 17 + 5) > 0.6;

      let level = 0;
      if (isHigh && !isIdle) level = 4;
      else if (isHigh) level = 3;
      else if (!isIdle) level = 2;
      else level = 1;

      // Force level to be 0|1|2|3|4 based on deterministic pattern
      const finalLevel = i % 7 === 0 || i % 11 === 0 ? 0 : level;

      mockData.push({
        date: dateStr,
        count: finalLevel * 10,
        level: finalLevel as 0 | 1 | 2 | 3 | 4,
      });
    }

    setData(mockData);
  }, []);

  return (
    <div className="mt-6 p-5 rounded-xl bg-muted/30 dark:bg-white/[0.02] border border-border/50 dark:border-white/5 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Fleet Telemetry
        </span>
        <div className="flex gap-4 text-[10px] font-mono font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />{" "}
            Active: 18,390
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> Idle: 2,156
          </span>
        </div>
      </div>

      <div className="w-full relative z-10 overflow-x-auto pb-4 scrollbar-hide">
        <div className="min-w-max">
          {data.length > 0 ? (
            <ActivityCalendar
              data={data}
              colorScheme={theme === "dark" ? "dark" : "light"}
              theme={{
                light: [
                  "#f0fdf4", // emerald-50
                  "#dcfce7", // emerald-100
                  "#6ee7b7", // emerald-300
                  "#10b981", // emerald-500
                  "#047857", // emerald-700
                ],
                dark: [
                  "rgba(255, 255, 255, 0.05)",
                  "rgba(16, 185, 129, 0.3)",
                  "rgba(16, 185, 129, 0.5)",
                  "rgba(16, 185, 129, 0.8)",
                  "rgba(16, 185, 129, 1)",
                ],
              }}
              labels={{
                totalCount: "{{count}} events in the last year",
              }}
              blockRadius={2}
              blockSize={10}
              blockMargin={4}
              fontSize={12}
              showMonthLabels={true}
              showWeekdayLabels={false}
            />
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground/50 text-xs">
              Loading telemetry data...
            </div>
          )}
        </div>
      </div>

      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/5 blur-[40px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-1000" />
    </div>
  );
}
