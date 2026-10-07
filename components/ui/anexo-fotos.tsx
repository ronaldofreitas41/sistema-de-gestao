"use client";

import { Plus, X } from "lucide-react";

type AnexoFotosProps = {
  id: string;
  titulo: string;
  grupo: string;
  previews: string[];
  onAdicionar: (
    grupo: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onRemover: (grupo: string, index: number) => void;
  opcional?: boolean;
};

export function AnexoFotos({
  id,
  titulo,
  grupo,
  previews,
  onAdicionar,
  onRemover,
  opcional = false,
}: AnexoFotosProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">
          {titulo}
        </h4>

        {opcional ? (
          <span className="text-xs text-muted-foreground">
            opcional
          </span>
        ) : null}
      </div>

      {previews.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {previews.map((src, index) => (
            <div
              key={`${grupo}-${index}-${src}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={src}
                alt={`${titulo} - Foto ${index + 1}`}
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                onClick={() => onRemover(grupo, index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                aria-label={`Remover foto ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-center text-[10px] text-white">
                Foto {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors hover:bg-muted/50">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => onAdicionar(grupo, event)}
          className="hidden"
          id={id}
        />

        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center"
        >
          <Plus className="mb-2 h-6 w-6 text-muted-foreground" />

          <span className="text-xs text-muted-foreground">
            Adicionar fotos
          </span>
        </label>
      </div>
    </div>
  );
}