"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortDirection = "asc" | "desc";
export type SortValueGetter<T> = (item: T) => unknown;
export type SortOption<T> = {
  label: string;
  key: string;
  getValue: SortValueGetter<T>;
};

function parseDate(value: string): number | null {
  const brazilianDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilianDate) {
    return Date.UTC(
      Number(brazilianDate[3]),
      Number(brazilianDate[2]) - 1,
      Number(brazilianDate[1]),
    );
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null || left === "") return right == null || right === "" ? 0 : 1;
  if (right == null || right === "") return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  const leftString = String(left).trim();
  const rightString = String(right).trim();
  const leftDate = parseDate(leftString);
  const rightDate = parseDate(rightString);
  if (leftDate !== null && rightDate !== null) return leftDate - rightDate;

  return leftString.localeCompare(rightString, "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

export function useSortableData<T>(items: readonly T[]) {
  const [sort, setSort] = useState<{
    key: string;
    direction: SortDirection;
    getValue: SortValueGetter<T>;
  } | null>(null);

  const sortedItems = useMemo(() => {
    if (!sort) return [...items];

    return items
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const leftValue = sort.getValue(left.item);
        const rightValue = sort.getValue(right.item);
        const leftEmpty = leftValue == null || leftValue === "";
        const rightEmpty = rightValue == null || rightValue === "";
        if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;

        const comparison = compareValues(leftValue, rightValue);
        if (comparison === 0) return left.index - right.index;
        return sort.direction === "asc" ? comparison : -comparison;
      })
      .map(({ item }) => item);
  }, [items, sort]);

  function toggleSort(key: string, getValue: SortValueGetter<T>) {
    setSort((current) => ({
      key,
      getValue,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return {
    sortedItems,
    sortKey: sort?.key ?? null,
    sortDirection: sort?.direction ?? null,
    toggleSort,
  };
}

export function SortableTableHead<T>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  getValue,
}: {
  label: string;
  sortKey: string;
  activeSortKey: string | null;
  direction: SortDirection | null;
  onSort: (key: string, getValue: SortValueGetter<T>) => void;
  getValue: SortValueGetter<T>;
}) {
  const active = activeSortKey === sortKey;
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowDownUp;

  return (
    <TableHead aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-left hover:text-foreground"
        onClick={() => onSort(sortKey, getValue)}
      >
        {label}
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}

export function SortableListControls<T>({
  options,
  sortKey,
  direction,
  onSort,
}: {
  options: SortOption<T>[];
  sortKey: string | null;
  direction: SortDirection | null;
  onSort: (key: string, getValue: SortValueGetter<T>) => void;
}) {
  const selectedOption = options.find((option) => option.key === sortKey);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={sortKey ?? ""}
        onValueChange={(key) => {
          const option = options.find((item) => item.key === key);
          if (option) onSort(option.key, option.getValue);
        }}
      >
        <SelectTrigger aria-label="Ordenar por" className="w-48">
          <SelectValue placeholder="Ordenar por..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        disabled={!selectedOption}
        aria-label={
          direction === "asc" ? "Ordenação crescente" : "Ordenação decrescente"
        }
        title={
          direction === "asc"
            ? "Ordenação crescente"
            : "Ordenação decrescente"
        }
        onClick={() => {
          if (selectedOption) {
            onSort(selectedOption.key, selectedOption.getValue);
          }
        }}
      >
        {direction === "asc" ? (
          <ArrowUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ArrowDown aria-hidden="true" className="h-4 w-4" />
        )}
        {direction === "asc" ? "Crescente" : "Decrescente"}
      </Button>
    </div>
  );
}
