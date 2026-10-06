"use client";

import { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";

type PlacaInputProps = {
  id: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function PlacaInput({
  id,
  value,
  options,
  onValueChange,
  placeholder = "Selecione ou digite a placa",
  className,
  disabled,
}: PlacaInputProps) {
  const datalistId = `${id}-placas`;

  return (
    <>
      <Input
        id={id}
        type="text"
        list={datalistId}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.target.value.toUpperCase())
        }
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={datalistId}>
        {Array.from(new Set(options.filter(Boolean))).map((placa) => (
          <option key={placa} value={placa} />
        ))}
      </datalist>
    </>
  );
}