import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface MontoValidation {
  valid: boolean;
  error: string | null;
}

export interface MontoInputValidadoProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  helpText?: string;
  className?: string;
  disabled?: boolean;
}

/** Returns validation result for a numeric amount against min/max bounds */
export function validateMonto(
  value: string,
  min?: number,
  max?: number,
  minLabel?: string,
  maxLabel?: string,
): MontoValidation {
  const num = Number(value) || 0;
  if (!value || num <= 0) return { valid: false, error: null }; // empty = no error shown yet

  if (min != null && num < min) {
    return {
      valid: false,
      error: `Monto insuficiente. Mínimo: ₲ ${min.toLocaleString('es-PY')}${minLabel ? ` (${minLabel})` : ''}`,
    };
  }

  if (max != null && num > max) {
    return {
      valid: false,
      error: `Monto mayor al ${maxLabel || 'máximo permitido'} (₲ ${max.toLocaleString('es-PY')}). No se permite un monto superior.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Reusable validated amount input for the entire system.
 * Shows real-time validation messages and exposes validation state.
 */
const MontoInputValidado = React.forwardRef<HTMLInputElement, MontoInputValidadoProps>(
  (
    {
      value,
      onChange,
      label = 'Monto',
      required = false,
      min,
      max,
      minLabel,
      maxLabel,
      placeholder,
      helpText,
      className,
      disabled = false,
    },
    ref,
  ) => {
    const validation = validateMonto(value, min, max, minLabel, maxLabel);
    const numValue = Number(value) || 0;
    const hasValue = !!value && numValue > 0;
    const showError = hasValue && !validation.valid && validation.error;
    const showSuccess = hasValue && validation.valid;

    const inputBorderClass = showError
      ? 'border-destructive focus:ring-destructive/30'
      : showSuccess
        ? 'border-success focus:ring-success/30'
        : '';

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1">
            {label}{' '}
            {required ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground font-normal">(opcional)</span>
            )}
          </label>
        )}

        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value ? Number(value).toLocaleString('es-PY') : ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            onChange(v);
          }}
          disabled={disabled}
          className={`input-field ${inputBorderClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          placeholder={
            placeholder ||
            (min != null ? `Mínimo: ₲ ${min.toLocaleString('es-PY')}` : '0')
          }
        />

        <div className="mt-1.5 space-y-0.5">
          {helpText && (
            <p className="text-xs text-muted-foreground">{helpText}</p>
          )}

          {showError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {validation.error}
            </p>
          )}

          {showSuccess && (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Monto válido
            </p>
          )}
        </div>
      </div>
    );
  },
);

MontoInputValidado.displayName = 'MontoInputValidado';

export { MontoInputValidado };

/**
 * Helper: wraps a submit button and disables it when validation fails.
 * Shows a tooltip explaining why the button is disabled.
 */
export const ValidatedSubmitButton = ({
  validation,
  hasValue,
  loading,
  onClick,
  children,
  className = '',
}: {
  validation: MontoValidation;
  hasValue: boolean;
  loading: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const isDisabled = loading || (hasValue && !validation.valid) || !hasValue;
  const tooltipMsg = !hasValue
    ? 'Debe ingresar el monto'
    : validation.error || '';

  if (isDisabled && tooltipMsg) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <button disabled className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
                {children}
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {tooltipMsg}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button onClick={onClick} disabled={isDisabled} className={`${className} disabled:opacity-50`}>
      {children}
    </button>
  );
};
