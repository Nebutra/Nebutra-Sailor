"use client";

import {
  type CSSProperties,
  createContext,
  type FieldsetHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  use,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { type RadioOrientation, radioTokens } from "../tokens/components/radio";
import { cn } from "../utils/cn";

type RadioValue = string;

type RadioGroupContextValue = {
  readonly name: string;
  readonly value: RadioValue;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly setValue: (value: RadioValue) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

type RadioGroupStyle = CSSProperties & {
  "--radio-group-gap": string;
  "--radio-label-gap": string;
  "--radio-label-size": string;
  "--radio-label-weight": number;
};

type RadioItemStyle = CSSProperties & {
  "--radio-item-gap": string;
  "--radio-item-min-height": string;
  "--radio-item-size": string;
  "--radio-item-weight": number;
  "--radio-description-size": string;
  "--radio-description-gap": string;
  "--radio-control-size": string;
  "--radio-dot-size": string;
  "--radio-border-width": string;
  "--radio-motion-duration": string;
  "--radio-motion-easing": string;
};

type RadioGroupBaseProps = Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "children" | "defaultValue" | "disabled" | "onChange" | "value"
>;

export type RadioGroupProps = RadioGroupBaseProps & {
  children: ReactNode;
  /** Visible group label rendered as a native legend. */
  label?: ReactNode;
  /** Form field name shared by all radios. Generated when omitted. */
  name?: string;
  /** Controlled selected value. */
  value?: RadioValue;
  /** Uncontrolled initial selected value. */
  defaultValue?: RadioValue;
  /** Geist-compatible change callback. */
  onChange?: (value: RadioValue) => void;
  /** Base UI / Radix-compatible change callback. */
  onValueChange?: (value: RadioValue) => void;
  disabled?: boolean;
  required?: boolean;
  orientation?: RadioOrientation;
  /** Applies to the options container. */
  className?: string;
  /** Applies to the fieldset root. */
  rootClassName?: string;
};

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children" | "className" | "type"
> &
  (
    | { "aria-label": string; "aria-labelledby"?: string | undefined; id?: string | undefined }
    | { "aria-labelledby": string; "aria-label"?: string | undefined; id?: string | undefined }
    | { id: string; "aria-label"?: string | undefined; "aria-labelledby"?: string | undefined }
  ) & {
    className?: string | undefined;
    indicatorClassName?: string | undefined;
    inputClassName?: string | undefined;
  };

export type RadioGroupItemProps = Omit<
  LabelHTMLAttributes<HTMLLabelElement>,
  "children" | "onChange"
> & {
  value: RadioValue;
  defaultChecked?: boolean;
  children?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  controlClassName?: string;
  inputClassName?: string;
};

export type UseRadioProps = {
  value: RadioValue;
  disabled?: boolean;
  disabledReason?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

const itemStyle: RadioItemStyle = {
  "--radio-item-gap": `${radioTokens.item.gap}px`,
  "--radio-item-min-height": `${radioTokens.item.minHeight}px`,
  "--radio-item-size": `${radioTokens.item.fontSize}px`,
  "--radio-item-weight": radioTokens.item.fontWeight,
  "--radio-description-size": `${radioTokens.item.descriptionSize}px`,
  "--radio-description-gap": `${radioTokens.item.descriptionGap}px`,
  "--radio-control-size": `${radioTokens.control.size}px`,
  "--radio-dot-size": `${radioTokens.control.dotSize}px`,
  "--radio-border-width": `${radioTokens.control.borderWidth}px`,
  "--radio-motion-duration": `${radioTokens.motion.duration}ms`,
  "--radio-motion-easing": radioTokens.motion.easing,
};

const radioControlClassName = cn(
  "relative inline-flex shrink-0 items-center justify-center rounded-[var(--radius-full)] border-[length:var(--radio-border-width)] border-[var(--neutral-7)] bg-background text-[var(--neutral-12)]",
  "size-[var(--radio-control-size)]",
  "transition-[background-color,border-color,box-shadow] duration-[var(--radio-motion-duration)] ease-[var(--radio-motion-easing)]",
  "after:size-[var(--radio-dot-size)] after:scale-0 after:rounded-[var(--radius-full)] after:bg-current after:opacity-0 after:transition-[opacity,transform] after:duration-[var(--radio-motion-duration)] after:ease-[var(--radio-motion-easing)] after:content-['']",
  "peer-checked:border-[var(--neutral-12)] peer-checked:after:scale-100 peer-checked:after:opacity-100",
  "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
  "peer-disabled:border-[var(--neutral-5)] peer-disabled:bg-[var(--neutral-2)] peer-disabled:text-[var(--neutral-8)]",
);

function useRadioGroupContext() {
  return use(RadioGroupContext);
}

function RadioRoot({ className, indicatorClassName, inputClassName, ...props }: RadioProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <input type="radio" className={cn("peer sr-only", inputClassName)} {...props} />
      <span aria-hidden="true" className={cn(radioControlClassName, indicatorClassName)} />
    </span>
  );
}

RadioRoot.displayName = "Radio";

function RadioGroupItemRoot({
  children,
  className,
  controlClassName,
  description,
  disabled,
  disabledReason,
  id,
  inputClassName,
  style,
  value,
  ...props
}: RadioGroupItemProps) {
  const generatedId = useId();
  const inputId = id ?? `radio-${generatedId.replace(/:/g, "")}`;
  const reasonId = disabledReason ? `${inputId}-reason` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const context = useRadioGroupContext();
  const isDisabled = Boolean(disabled || context?.disabled);
  const isChecked = context ? context.value === value : undefined;
  const required = context?.required;
  const name = context?.name;
  const describedBy = [descriptionId, reasonId].filter(Boolean).join(" ");

  const radio = (
    <RadioRoot
      id={inputId}
      value={value}
      disabled={isDisabled}
      indicatorClassName={controlClassName}
      inputClassName={inputClassName}
      onChange={(event) => {
        if (event.currentTarget.checked) {
          context?.setValue(value);
        }
      }}
      {...(name ? { name } : {})}
      {...(isChecked === undefined ? {} : { checked: isChecked })}
      {...(context || props.defaultChecked === undefined
        ? {}
        : { defaultChecked: props.defaultChecked })}
      {...(required ? { required } : {})}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
      {...(!children && props["aria-label"] ? { "aria-label": props["aria-label"] } : {})}
      {...(props["aria-labelledby"] ? { "aria-labelledby": props["aria-labelledby"] } : {})}
    />
  );

  const mergedStyle = { ...itemStyle, ...style };

  if (!children && !description) {
    return (
      <span
        className={cn(
          "inline-flex min-h-[var(--radio-item-min-height)] items-center gap-[var(--radio-item-gap)]",
          isDisabled && "cursor-not-allowed opacity-60",
          className,
        )}
        style={mergedStyle}
        title={isDisabled ? disabledReason : undefined}
      >
        {radio}
        {disabledReason ? (
          <span id={reasonId} className="sr-only">
            {disabledReason}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group inline-flex min-h-[var(--radio-item-min-height)] items-start gap-[var(--radio-item-gap)] text-[length:var(--radio-item-size)] text-[var(--neutral-12)] leading-5",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
      style={mergedStyle}
      title={isDisabled ? disabledReason : undefined}
      {...props}
    >
      <span className="pt-0.5">{radio}</span>
      <span className="min-w-0">
        <span style={{ fontWeight: "var(--radio-item-weight)" }}>{children}</span>
        {description ? (
          <span
            id={descriptionId}
            className="mt-[var(--radio-description-gap)] block text-[length:var(--radio-description-size)] text-[var(--neutral-10)] leading-4"
          >
            {description}
          </span>
        ) : null}
        {disabledReason ? (
          <span id={reasonId} className="sr-only">
            {disabledReason}
          </span>
        ) : null}
      </span>
    </label>
  );
}

RadioGroupItemRoot.displayName = "RadioGroupItem";

function RadioGroupRoot({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  defaultValue = "",
  disabled = false,
  label,
  name,
  onChange,
  onValueChange,
  orientation = "vertical",
  required = false,
  rootClassName,
  style,
  value,
  ...props
}: RadioGroupProps) {
  const generatedName = useId();
  const initialDefaultValue = useRef(defaultValue);
  const [internalValue, setInternalValue] = useState(initialDefaultValue.current);
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : internalValue;
  const legendId = useId();

  const groupStyle: RadioGroupStyle = {
    "--radio-group-gap": `${radioTokens.group.gap}px`,
    "--radio-label-gap": `${radioTokens.group.labelGap}px`,
    "--radio-label-size": `${radioTokens.label.fontSize}px`,
    "--radio-label-weight": radioTokens.label.fontWeight,
    ...style,
  };

  const contextValue = useMemo<RadioGroupContextValue>(
    () => ({
      name: name ?? `radio-group-${generatedName.replace(/:/g, "")}`,
      value: selectedValue,
      disabled,
      required,
      setValue: (nextValue) => {
        if (!isControlled) {
          setInternalValue(nextValue);
        }
        onChange?.(nextValue);
        onValueChange?.(nextValue);
      },
    }),
    [disabled, generatedName, isControlled, name, onChange, onValueChange, required, selectedValue],
  );

  return (
    <fieldset
      disabled={disabled}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? legendId : ariaLabelledBy}
      className={cn("m-0 min-w-0 border-0 p-0", rootClassName)}
      style={groupStyle}
      {...props}
    >
      {label ? (
        <legend
          id={legendId}
          className="mb-[var(--radio-label-gap)] text-[length:var(--radio-label-size)] text-[var(--neutral-12)]"
          style={{ fontWeight: "var(--radio-label-weight)" }}
        >
          {label}
        </legend>
      ) : null}
      <RadioGroupContext.Provider value={contextValue}>
        <div
          className={cn(
            "flex gap-[var(--radio-group-gap)]",
            orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
            className,
          )}
          data-orientation={orientation}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    </fieldset>
  );
}

RadioGroupRoot.displayName = "RadioGroup";

export function useRadio({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  disabled,
  disabledReason,
  id,
  value,
}: UseRadioProps) {
  const context = useRadioGroupContext();
  const generatedId = useId();
  const inputId = id ?? `radio-${generatedId.replace(/:/g, "")}`;
  const reasonId = disabledReason ? `${inputId}-reason` : undefined;
  const isDisabled = Boolean(disabled || context?.disabled);
  const checked = context ? context.value === value : false;

  const inputProps = {
    id: inputId,
    value,
    checked,
    disabled: isDisabled,
    onChange: () => context?.setValue(value),
    ...(context?.name ? { name: context.name } : {}),
    ...(context?.required ? { required: context.required } : {}),
    ...(reasonId ? { "aria-describedby": reasonId } : {}),
    ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
    ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
  } satisfies RadioProps;

  return {
    checked,
    disabled: isDisabled,
    inputProps,
    component: (
      <>
        <RadioRoot {...inputProps} id={inputId} />
        {disabledReason ? (
          <span id={reasonId} className="sr-only">
            {disabledReason}
          </span>
        ) : null}
      </>
    ),
  };
}

export const Radio = RadioRoot;
export const RadioGroupItem = RadioGroupItemRoot;
export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItemRoot,
});
