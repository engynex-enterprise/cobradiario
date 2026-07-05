'use client';

import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-3',
        month_caption: 'flex justify-center pt-1 relative items-center h-8',
        caption_label: 'text-sm font-extrabold capitalize',
        nav: 'absolute inset-x-1 top-1 flex items-center justify-between',
        button_previous: 'inline-flex size-7 items-center justify-center rounded-lg border-2 border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40',
        button_next: 'inline-flex size-7 items-center justify-center rounded-lg border-2 border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[11px] font-semibold uppercase text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'p-0 text-center text-sm',
        day_button:
          'inline-flex size-9 items-center justify-center rounded-lg font-medium transition-colors hover:bg-accent aria-selected:bg-primary aria-selected:font-bold aria-selected:text-primary-foreground',
        today: 'text-primary font-extrabold',
        outside: 'text-muted-foreground/40',
        disabled: 'opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
