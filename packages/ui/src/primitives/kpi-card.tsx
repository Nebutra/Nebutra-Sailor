import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../utils/cn";
import { Card, CardContent } from "./card";

export interface KpiCardProps {
  title: string;
  value: string | number | never;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}

export function KpiCard({ title, value, icon, trend, description, className }: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>

            {trend && (
              <div className="mt-2 flex items-center gap-1">
                {trend.isPositive ? (
                  <>
                    <TrendingUp className="size-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      +{Math.abs(trend.value)}%
                    </span>
                  </>
                ) : trend.value === 0 ? (
                  <>
                    <Minus className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">0%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="size-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">{trend.value}%</span>
                  </>
                )}
                <span className="text-sm text-muted-foreground">vs last week</span>
              </div>
            )}

            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
