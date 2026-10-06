"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type PlacaInputProps = {
  id: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showManualInput?: boolean;
};

export function PlacaInput({
  id,
  value,
  options,
  onValueChange,
  placeholder = "Selecione ou digite a placa",
  className,
  disabled,
  showManualInput = true,
}: PlacaInputProps) {
  const placaSelecionada = options.includes(value) ? value : undefined;

  return (
    <div className="w-full space-y-2">
      <Select value={placaSelecionada} onValueChange={onValueChange}>
        <SelectTrigger id={`${id}-cadastrada`} className={className} disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
          {options.length ? options.map((placa) => (
            <SelectItem key={placa} value={placa}>{placa}</SelectItem>
          )) : (
            <SelectItem value="sem-placas" disabled>Nenhuma placa cadastrada</SelectItem>
          )}
        </SelectContent>
      </Select>
      {showManualInput && (
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value.toUpperCase())}
          placeholder="Ou digite a placa manualmente"
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
      )}
    </div>
  );
}