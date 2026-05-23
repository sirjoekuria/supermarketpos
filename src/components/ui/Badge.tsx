import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          {
            "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300":
              variant === "default",
            "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400":
              variant === "success",
            "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400":
              variant === "warning",
            "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400":
              variant === "danger",
            "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400":
              variant === "info",
          },
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
