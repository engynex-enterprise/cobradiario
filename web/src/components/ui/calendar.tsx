'use client';

import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Calendario shadcn-like sobre react-day-picker v10 (estilos base + tema Duolingo). */
export function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn('rdp-duo p-3', className)}
      {...props}
    />
  );
}
