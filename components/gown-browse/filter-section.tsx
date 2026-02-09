'use client';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FilterSectionProps {
  id: string;
  title: string;
  options: readonly string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

export function FilterSection({
  id,
  title,
  options,
  selectedValues,
  onToggle,
}: FilterSectionProps) {
  const selectedCount = selectedValues.length;

  return (
    <AccordionItem value={id} className="border-border">
      <AccordionTrigger className="py-3 hover:no-underline">
        <span className="flex items-center gap-2">
          {title}
          {selectedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {selectedCount}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pb-2">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);
            return (
              <label
                key={option}
                className={cn(
                  'flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                  'hover:bg-secondary/50',
                  isSelected && 'bg-primary/10'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(option)}
                />
                <span className="text-sm">{option}</span>
              </label>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
