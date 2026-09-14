"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function PageSizeSelect({
  pageSize,
  onChange,
  options = PAGE_SIZE_OPTIONS,
}: {
  pageSize: number;
  onChange: (size: number) => void;
  options?: number[];
}) {
  return (
    <Select
      value={String(pageSize)}
      onValueChange={(value) => onChange(Number(value))}
    >
      <SelectTrigger className="w-full sm:w-40 bg-input border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option} por página
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {total === 0
          ? "Nenhum registro encontrado"
          : `Mostrando ${start}–${end} de ${total}`}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
