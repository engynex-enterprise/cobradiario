'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const nf = new Intl.NumberFormat('es-CO');

/**
 * Input de moneda: muestra el valor con separador de miles ($ 1.250.000) mientras se escribe
 * y expone el valor numérico entero (pesos) vía onValueChange.
 */
export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | undefined;
  onValueChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const display = value === undefined || Number.isNaN(value) ? '' : nf.format(value);
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
          $
        </span>
        <Input
          ref={ref}
          inputMode="numeric"
          value={display}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '');
            onValueChange(digits ? Number(digits) : 0);
          }}
          className={cn('pl-7', className)}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
