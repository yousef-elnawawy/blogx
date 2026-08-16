"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, X, Check } from "lucide-react";
import { format, addHours, addDays, setHours, setMinutes } from "date-fns";

interface SchedulePickerPanelProps {
  open: boolean;
  onClose: () => void;
  scheduledAt: string | null;
  onScheduleChange: (dateString: string | null) => void;
}

export default function SchedulePickerPanel({
  open,
  onClose,
  scheduledAt,
  onScheduleChange,
}: SchedulePickerPanelProps) {
  const getInitialDateTimeLocal = () => {
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      return format(d, "yyyy-MM-dd'T'HH:mm");
    }
    const defaultDate = addHours(new Date(), 2);
    return format(defaultDate, "yyyy-MM-dd'T'HH:mm");
  };

  const [dateValue, setDateValue] = useState<string>(getInitialDateTimeLocal());

  useEffect(() => {
    if (open) {
      setDateValue(getInitialDateTimeLocal());
    }
  }, [open, scheduledAt]);

  if (!open) return null;

  const applyPreset = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    setDateValue(formatted);
  };

  const handleConfirm = () => {
    if (dateValue) {
      const selected = new Date(dateValue);
      if (selected <= new Date()) {
        alert("Please choose a future date and time.");
        return;
      }
      onScheduleChange(selected.toISOString());
    }
    onClose();
  };

  const handleClear = () => {
    onScheduleChange(null);
    onClose();
  };

  return (
    <div className="shrink-0 mx-3 sm:mx-6 mb-3 p-3.5 rounded-xl bg-card/95 backdrop-blur-xl border border-amber-500/30 shadow-lg shadow-black/5 dark:shadow-black/40 animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-amber-500" />
          <span className="text-xs sm:text-[13px] font-bold text-foreground">
            Schedule Publishing Date & Time
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Quick Presets */}
      <div className="py-2.5 space-y-1.5">
        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Presets
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(addHours(new Date(), 2))}
            className="text-xs rounded-lg h-7.5 hover:border-amber-500/50 hover:bg-amber-500/5"
          >
            In 2 hours
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const tmrw = addDays(new Date(), 1);
              applyPreset(setMinutes(setHours(tmrw, 9), 0));
            }}
            className="text-xs rounded-lg h-7.5 hover:border-amber-500/50 hover:bg-amber-500/5"
          >
            Tomorrow 9 AM
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const tmrw = addDays(new Date(), 1);
              applyPreset(setMinutes(setHours(tmrw, 18), 0));
            }}
            className="text-xs rounded-lg h-7.5 hover:border-amber-500/50 hover:bg-amber-500/5"
          >
            Tomorrow 6 PM
          </Button>
        </div>
      </div>

      {/* Custom Datetime Input */}
      <div className="space-y-1.5 pb-2.5">
        <Label htmlFor="schedule-time-input" className="text-[11px] font-semibold text-foreground">
          Custom Date & Time
        </Label>
        <Input
          id="schedule-time-input"
          type="datetime-local"
          value={dateValue}
          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
          onChange={(e) => setDateValue(e.target.value)}
          className="rounded-lg text-xs sm:text-[13px] h-8 bg-background"
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        {scheduledAt ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-destructive hover:bg-destructive/10 rounded-full h-7.5 px-3"
          >
            <X className="size-3.5 mr-1" />
            Remove Schedule
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full text-xs h-7.5 px-3.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="rounded-full text-xs font-bold h-7.5 px-4 bg-amber-500 text-white hover:bg-amber-600 shadow-xs"
          >
            <Check className="size-3.5 mr-1" />
            Set Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
