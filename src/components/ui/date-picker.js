"use client";

import { useRef } from "react";
import { formatDateForDisplay, formatDateForStorage } from "../../lib/dateFormat.js";
import { cn } from "../../lib/utils.js";

export function DatePicker({ className, name, onChange, placeholder = "DD/MM/YYYY", value = "" }) {
  const pickerRef = useRef(null);
  const safeValue = value ?? "";

  function emit(nextValue) {
    onChange?.({
      target: {
        name,
        value: nextValue
      }
    });
  }

  function openPicker() {
    const input = pickerRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  return (
    <div className={cn("ui-date-picker", className)}>
      <input
        className="ui-date-input"
        inputMode="numeric"
        name={name}
        onChange={(event) => emit(event.target.value)}
        placeholder={placeholder}
        value={safeValue}
      />
      <button className="ui-date-trigger" onClick={openPicker} type="button">
        Pick
      </button>
      <input
        ref={pickerRef}
        className="ui-date-native"
        onChange={(event) => emit(formatDateForDisplay(event.target.value))}
        tabIndex={-1}
        type="date"
        value={formatDateForStorage(safeValue) || ""}
      />
    </div>
  );
}
