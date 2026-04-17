import React from 'react';

export interface MoneyInputProps {
  /** Current numeric value. Use '' or null/undefined for empty. */
  value: number | string | null | undefined;
  /** Called with the raw numeric value (number) or '' when empty. */
  onChange: (value: number | '') => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  id?: string;
  name?: string;
  /** Optional currency prefix for visual context (Gs. / USD). */
  currency?: 'Gs.' | 'USD' | string;
  /** Additional input attributes */
  autoFocus?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * Standardized money input for the entire system.
 * - Empty by default (placeholder shows "0")
 * - Formats with thousand separators in real-time (10000 → 10.000)
 * - No browser spinner arrows
 * - Numeric keyboard on mobile
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      placeholder = '0',
      className = 'input-field',
      disabled = false,
      required = false,
      min,
      max,
      id,
      name,
      currency,
      autoFocus,
      onBlur,
    },
    ref,
  ) => {
    const rawNumber =
      value === '' || value === null || value === undefined
        ? ''
        : Number(value);
    const displayValue =
      rawNumber === '' || Number.isNaN(rawNumber)
        ? ''
        : (rawNumber as number).toLocaleString('es-PY');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '');
      if (digits === '') {
        onChange('');
        return;
      }
      const num = Number(digits);
      onChange(Number.isNaN(num) ? '' : num);
    };

    const input = (
      <input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`${className} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    );

    // Validation hint via min/max (no inline UI, parent decides)
    if (min != null && typeof rawNumber === 'number' && rawNumber !== '' && rawNumber < min) {
      // soft hint via title only, parent should handle UI
    }
    if (max != null && typeof rawNumber === 'number' && rawNumber !== '' && rawNumber > max) {
      // soft hint via title only, parent should handle UI
    }

    if (currency) {
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {currency}
          </span>
          {React.cloneElement(input, {
            className: `${input.props.className} pl-12`,
          })}
        </div>
      );
    }

    return input;
  },
);

MoneyInput.displayName = 'MoneyInput';
