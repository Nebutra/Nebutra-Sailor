"use client";

import clsx from "clsx";
import React, { createContext, useContext, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

const SwitchContext = createContext<{
  value: string | null;
  setValue: React.Dispatch<React.SetStateAction<string | null>>;
} | null>(null);

export interface SwitchProps extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  children?: React.ReactNode;
  name?: string;
  size?: "small" | "medium" | "large";
  style?: React.CSSProperties;
}

export const Switch = ({
  children,
  name = "default",
  size = "medium",
  style,
  className,
  ...props
}: SwitchProps) => {
  const [value, setValue] = useState<string | null>(null);

  return (
    <SwitchContext.Provider value={{ value, setValue }}>
      <div
        className={clsx(
          "flex bg-background-100 p-1 border border-gray-alpha-400",
          size === "small" && "h-8 rounded-md",
          size === "medium" && "h-10 rounded-md",
          size === "large" && "h-12 rounded-lg",
          className,
        )}
        style={style}
        {...props}
      >
        {React.Children.map(children, (child) =>
          React.cloneElement(child as React.ReactElement<SwitchControlProps>, { size, name }),
        )}
      </div>
    </SwitchContext.Provider>
  );
};

interface SwitchControlProps {
  label?: string;
  value: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
}

const SwitchControl = ({
  label,
  value,
  defaultChecked,
  disabled = false,
  name,
  size = "medium",
  icon,
}: SwitchControlProps) => {
  const context = useContext(SwitchContext);
  const checked = value === context?.value;

  useEffect(() => {
    if (defaultChecked) {
      context?.setValue(value);
    }
  }, [context?.setValue, defaultChecked, value]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <label
      className={clsx("flex flex-1 h-full", disabled && "cursor-not-allowed pointer-events-none")}
      onClick={() => context?.setValue(value)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        checked={checked}
        className="hidden"
        readOnly
      />
      <span
        className={twMerge(
          clsx(
            "flex items-center justify-center flex-1 cursor-pointer font-medium font-sans duration-150",
            checked
              ? "bg-muted text-muted-foreground fill-muted-foreground rounded-sm"
              : "text-foreground hover:text-muted-foreground fill-foreground hover:fill-muted-foreground",
            disabled && "text-neutral-8 fill-neutral-8",
            !icon && size === "small" && "text-sm px-3",
            !icon && size === "medium" && "text-sm px-3",
            !icon && size === "large" && "text-base px-4",
            icon && size === "small" && "py-1 px-2",
            icon && size === "medium" && "py-2 px-3",
            icon && size === "large" && "p-3",
          ),
        )}
      >
        {icon ? <span className={clsx(size === "large" && "scale-125")}>{icon}</span> : label}
      </span>
    </label>
  );
};

Switch.Control = SwitchControl;
