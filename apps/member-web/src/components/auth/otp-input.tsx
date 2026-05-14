"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { cn } from "@grwfit/ui";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const focusBox = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  useEffect(() => {
    if (autoFocus) focusBox(0);
  }, [autoFocus, focusBox]);

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    onChange(newDigits.join("").slice(0, length));
    if (digit && index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const nd = [...digits]; nd[index] = ""; onChange(nd.join(""));
      } else if (index > 0) focusBox(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) focusBox(index - 1);
    else if (e.key === "ArrowRight" && index < length - 1) focusBox(index + 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) { onChange(pasted); focusBox(Math.min(pasted.length, length - 1)); }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[index] ?? ""}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-14 rounded-xl border-2 bg-background text-center text-xl font-bold",
            "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:opacity-50",
            digits[index] ? "border-primary" : "border-input",
          )}
        />
      ))}
    </div>
  );
}
