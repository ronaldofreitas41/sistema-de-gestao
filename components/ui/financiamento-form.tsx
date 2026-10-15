"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ParcelaForm = { valor: string; data_vencimento: string };

export type FinanciamentoState = {
  situacao_financeira: "Quitado" | "Financiamento";
  modalidade_financiamento: string;
  banco_financiamento: string;
  tipo_parcela: "fixa" | "variavel";
  quantidade_parcelas: string;
  valor_fixo: string;
  primeira_data: string;
  parcelas: ParcelaForm[];
  /** Parcelas já lançadas no Contas a Pagar (não podem ser regeneradas). */
  gerado: boolean;
};

export const financiamentoInicial = (): FinanciamentoState => ({
  situacao_financeira: "Quitado",
  modalidade_financiamento: "",
  banco_financiamento: "",
  tipo_parcela: "fixa",
  quantidade_parcelas: "",
  valor_fixo: "",
  primeira_data: "",
  parcelas: [],
  gerado: false,
});

function somarMeses(dataISO: string, meses: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dia, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

/** Trecho do payload comum a veículo e implemento: campos financeiros + parcelas. */
export function payloadFinanciamento(f: FinanciamentoState) {
  const financiado = f.situacao_financeira === "Financiamento";
  return {
    situacao_financeira: f.situacao_financeira,
    modalidade_financiamento: financiado ? f.modalidade_financiamento : null,
    banco_financiamento: financiado ? f.banco_financiamento : null,
    tipo_parcela: financiado ? f.tipo_parcela : null,
    quantidade_parcelas: financiado ? Number(f.quantidade_parcelas) || null : null,
    parcelas:
      financiado && !f.gerado
        ? f.parcelas.map((p) => ({ valor: Number(p.valor), data_vencimento: p.data_vencimento }))
        : undefined,
  };
}

export function FinanciamentoForm({
  value,
  onChange,
}: {
  value: FinanciamentoState;
  onChange: (valor: FinanciamentoState) => void;
}) {
  const financiado = value.situacao_financeira === "Financiamento";
  const set = (parcial: Partial<FinanciamentoState>) => onChange({ ...value, ...parcial });

  function alterarQuantidade(texto: string) {
    const quantidade = Math.min(Math.max(Number(texto) || 0, 0), 120);
    const parcelas = Array.from({ length: quantidade }, (_, i) => value.parcelas[i] ?? { valor: "", data_vencimento: "" });
    set({ quantidade_parcelas: texto, parcelas });
  }

  function gerarFixas() {
    const quantidade = Number(value.quantidade_parcelas) || 0;
    if (!quantidade || !(Number(value.valor_fixo) > 0) || !value.primeira_data) {
      return alert("Informe a quantidade, o valor da parcela e a data da primeira parcela.");
    }
    set({
      parcelas: Array.from({ length: quantidade }, (_, i) => ({
        valor: Number(value.valor_fixo).toFixed(2),
        data_vencimento: somarMeses(value.primeira_data, i),
      })),
    });
  }

  function atualizarParcela(indice: number, campo: keyof ParcelaForm, texto: string) {
    set({ parcelas: value.parcelas.map((p, i) => (i === indice ? { ...p, [campo]: texto } : p)) });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Informações financeiras</Label>
          <Select
            value={value.situacao_financeira}
            onValueChange={(v) => set({ situacao_financeira: (v ?? "Quitado") as FinanciamentoState["situacao_financeira"] })}
            disabled={value.gerado}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quitado">Quitado</SelectItem>
              <SelectItem value="Financiamento">Financiamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {financiado && (
          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Select
              value={value.modalidade_financiamento}
              onValueChange={(v) => set({ modalidade_financiamento: v ?? "" })}
              disabled={value.gerado}
            >
              <SelectTrigger>
                <SelectValue placeholder="CDC, Finame ou consórcio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CDC">CDC</SelectItem>
                <SelectItem value="Finame">Finame</SelectItem>
                <SelectItem value="Consórcio">Consórcio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {financiado && (
        <>
          {value.gerado && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              As parcelas deste financiamento já foram lançadas no Contas a Pagar. Para ajustar valores ou datas,
              edite as parcelas por lá.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Banco / instituição</Label>
              <Input value={value.banco_financiamento} disabled={value.gerado} onChange={(e) => set({ banco_financiamento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Select
                value={value.tipo_parcela}
                onValueChange={(v) => set({ tipo_parcela: (v ?? "fixa") as "fixa" | "variavel" })}
                disabled={value.gerado}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade de parcelas</Label>
              <Input type="number" min="1" max="120" value={value.quantidade_parcelas} disabled={value.gerado} onChange={(e) => alterarQuantidade(e.target.value)} />
            </div>
          </div>

          {!value.gerado && value.tipo_parcela === "fixa" && (
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>Valor da parcela (R$)</Label>
                <Input type="number" step="0.01" value={value.valor_fixo} onChange={(e) => set({ valor_fixo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento da 1ª parcela</Label>
                <Input type="date" value={value.primeira_data} onChange={(e) => set({ primeira_data: e.target.value })} />
              </div>
              <Button type="button" variant="outline" onClick={gerarFixas}>
                Gerar parcelas
              </Button>
            </div>
          )}

          {!value.gerado && value.parcelas.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {value.parcelas.map((parcela, indice) => (
                <div key={indice} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                  <span className="w-10 text-xs font-semibold text-muted-foreground">{indice + 1}/{value.parcelas.length}</span>
                  <Input type="number" step="0.01" placeholder="Valor (R$)" value={parcela.valor} onChange={(e) => atualizarParcela(indice, "valor", e.target.value)} />
                  <Input type="date" value={parcela.data_vencimento} onChange={(e) => atualizarParcela(indice, "data_vencimento", e.target.value)} />
                </div>
              ))}
            </div>
          )}
          {!value.gerado && (
            <p className="text-[11px] text-muted-foreground">
              Ao salvar, cada parcela entra no Contas a Pagar com seu valor e vencimento.
            </p>
          )}
        </>
      )}
    </div>
  );
}
