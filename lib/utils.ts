import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiResponse, Cliente, Permissoes } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("pt-BR");
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getToken() {
  if (typeof window === "undefined") return "";

  return sessionStorage.getItem("mh3_token") || "";
}

export function isVencida(value: unknown) {
  if (!value) return false;

  const date = new Date(String(value));
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

export async function fetcher(url: string): Promise<ApiResponse> {
  const token = getToken();

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível carregar as contas.");
  }

  return data;
}

export function normalizarPermissoes(
  permissoes: Permissoes | string | null | undefined,
): Permissoes {
  if (!permissoes) {
    return {};
  }

  if (typeof permissoes === "object") {
    return permissoes;
  }

  try {
    const resultado = JSON.parse(permissoes);

    if (
      resultado &&
      typeof resultado === "object" &&
      !Array.isArray(resultado)
    ) {
      return resultado as Permissoes;
    }

    return {};
  } catch (error) {
    console.error("Erro ao interpretar permissões:", error);
    return {};
  }
}

export function contarPermissoes(
  permissoes: Permissoes | string | null | undefined,
) {
  const permissoesNormalizadas = normalizarPermissoes(permissoes);

  const valores = Object.values(permissoesNormalizadas);

  return {
    ativas: valores.filter((valor) => valor === true).length,
    total: valores.length,
  };
}

export function formatarPermissoes(
  permissoes: Permissoes | string | null | undefined,
) {
  const { ativas, total } = contarPermissoes(permissoes);

  return `${ativas}/${total}`;
}

export function formatarTelefone(value: string) {
  const numeros = value.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numeros
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatarCPF(value: string) {
  const numeros = value.replace(/\D/g, "").slice(0, 11);

  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export async function fetchContas() {
    try {
      const res = await fetch("/api/contas-bancarias");
      const responseData = await res.json();
      return(responseData.data || responseData || []);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  }

export async function getNomesClientes(): Promise<string[]> {
  try {
    const token = getToken();
    const response = await fetch("/api/clientes", {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData?.error || "Não foi possível carregar os clientes.");
    }

    const clientes: Cliente[] = Array.isArray(responseData)
      ? responseData
      : responseData.data || [];

    return Array.from(new Set(clientes
      .map((cliente) => cliente.nome?.trim())
      .filter((nome): nome is string => Boolean(nome))));
  } catch (error) {
    console.error("Erro ao carregar nomes dos clientes:", error);
    return [];
  }
}

export async function deleteRegistro(url: string) {
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Não foi possível excluir o registro.");
  }

  return response;
}

export async function getPlacas(): Promise<string[]> {
  try {
    const token = getToken();
    const res = await fetch("/api/equipamentos?limit=1000", {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const responseData = await res.json();
    const equipamentos = responseData.data || responseData || [];

    if (!Array.isArray(equipamentos)) {
      return [];
    }

    const placas = equipamentos
      .map((eq: { placa?: string | null }) => eq.placa?.trim())
      .filter((placa): placa is string => Boolean(placa && placa.length > 0));

    return Array.from(new Set(placas)).sort();
  } catch (error) {
    console.error("Erro ao carregar placas:", error);
    return [];
  }
}

export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarValorPdf(valor: unknown): string {
  return formatCurrency(Number(valor) || 0);
}

function formatarPeriodoPdf(periodo?: string | null): string {
  if (!periodo) return "-";

  const [ano, mes] = periodo.split("-");

  if (!ano || !mes) return periodo;

  const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();

  return `${ano}-${mes}-01 a ${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
}

export function gerarPdfMedicao(medicao: any) {
  const placas = medicao.placas?.join(", ") || "-";
  const parceiro = medicao.parceiro || "-";
  const periodo = formatarPeriodoPdf(medicao.periodo);

  const valorLocacao = Number(medicao.valor) || 0;
  const valorTerceiro = Number(medicao.valor_terceiro) || 0;
  const horasExtras = Number(medicao.horas_extras) || 0;
  const valorHoraExtra = Number(
    medicao.valor_hora_extra ?? medicao.valor_horas_extras ?? 0,
  );

  const totalHorasExtras = horasExtras * valorHoraExtra;

  // Valor líquido calculado a partir dos campos disponíveis no formulário.
  const valorLiquido =
    valorLocacao -
    (medicao.terceiro ? valorTerceiro : 0) +
    totalHorasExtras;

  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  const linhas: string[] = [
    `
      <tr>
        <td>Locação do equipamento</td>
        <td class="valor">${formatarValorPdf(valorLocacao)}</td>
      </tr>
    `,
  ];

  if (medicao.terceiro && valorTerceiro > 0) {
    linhas.push(`
      <tr>
        <td>Repasse / valor de terceiro</td>
        <td class="valor">- ${formatarValorPdf(valorTerceiro)}</td>
      </tr>
    `);
  }

  if (horasExtras > 0 && valorHoraExtra > 0) {
    linhas.push(`
      <tr>
        <td>
          Horas extras (${horasExtras} × ${formatarValorPdf(valorHoraExtra)})
        </td>
        <td class="valor">${formatarValorPdf(totalHorasExtras)}</td>
      </tr>
    `);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Medicao-${escaparHtml(medicao.periodo || medicao.id)}</title>

        <style>
          @page {
            size: A4;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #fff;
            font-size: 12px;
          }

          .pagina {
            min-height: 297mm;
            display: flex;
            flex-direction: column;
            padding: 22mm 13mm 0;
          }

          .topo {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 17px;
            border-bottom: 4px solid #d71920;
          }


          .titulo {
            text-align: right;
            color: #c90000;
          }

          .titulo h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 1px;
          }

          .titulo p {
            margin: 8px 0 0;
            color: #6b7280;
            font-size: 10px;
            letter-spacing: 2px;
          }

          .conteudo {
            padding-top: 45px;
          }

          .secao {
            margin-bottom: 25px;
          }

          .secao-titulo {
            margin: 0 0 12px;
            padding-left: 10px;
            border-left: 4px solid #d71920;
            color: #c90000;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .dados {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 28px;
            font-size: 12px;
          }

          .dados strong {
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }

          thead th {
            padding: 12px;
            background: #c90000;
            color: #fff;
            font-size: 10px;
            text-align: center;
            text-transform: uppercase;
          }

          tbody td {
            padding: 14px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 12px;
          }

          tbody tr:last-child td {
            border-bottom: none;
          }

          tbody tr:nth-child(even) {
            background: #fafafa;
          }

          td.valor {
            width: 34%;
            text-align: right;
                        font-weight: 700;
          }

          .total td {
            background: #fff7f7;
            color: #c90000;
            font-size: 14px;
            font-weight: 800;
          }

          .total td:first-child {
            text-align: right;
          }

          .rodape {
            margin-top: auto;
            margin-left: -13mm;
            margin-right: -13mm;
            padding: 25px 15px 18px;
            background: #191919;
            color: #fff;
            text-align: center;
          }

          .rodape .marca {
            margin-bottom: 14px;
            font-size: 24px;
            font-weight: 900;
            font-style: italic;
          }

          .rodape p {
            margin: 8px 0 0;
            font-size: 11px;
          }

          .pagina-numero {
            margin-top: 12px;
            color: #cbd5e1;
            font-size: 9px;
            text-align: right;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .pagina {
              min-height: 297mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="pagina">
          <header class="topo">
            <img class="logo" src="/placeholder-logo.png" alt="MH3" />

            <div class="titulo">
              <h1>MEDIÇÃO</h1>
              <p>LOCAÇÃO DE EQUIPAMENTO</p>
            </div>
          </header>

          <main class="conteudo">
            <section class="secao">
              <h2 class="secao-titulo">Dados da medição</h2>

              <div class="dados">
                <div>
                  <strong>Parceiro:</strong>
                  ${escaparHtml(parceiro)}
                </div>

                <div>
                  <strong>Veículo/Placa:</strong>
                  ${escaparHtml(placas)}
                </div>

                <div>
                  <strong>Período:</strong>
                  ${escaparHtml(periodo)}
                </div>

                <div>
                  <strong>Mês Ref.:</strong>
                  ${escaparHtml(medicao.periodo || "-")}
                </div>
              </div>
            </section>

            <section class="secao">
              <h2 class="secao-titulo">Valor a pagar</h2>

              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th class="valor">Valor</th>
                  </tr>
                </thead>

                <tbody>
                  ${linhas.join("")}

                  <tr class="total">
                    <td>VALOR LÍQUIDO A PAGAR</td>
                    <td class="valor">
                      ${formatarValorPdf(valorLiquido)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </main>

          <footer class="rodape">
            <div class="marca">MH3 RENTAL LTDA</div>

            <p>
              CNPJ: 26.881.195/0001-10 · Rodovia BR 381, km 361 –
              João Monlevade/MG
            </p>

            <p>
              (31) 99977-6105 · Noninho · comercial@mh3rental.com.br
            </p>

            <div class="pagina-numero">
              Emitido em ${escaparHtml(dataEmissao)} · Página 1 de 1
            </div>
          </footer>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const janela = window.open("", "_blank");

  if (!janela) {
    alert(
      "Não foi possível abrir a janela do PDF. Verifique se o navegador bloqueou o pop-up.",
    );
    return;
  }

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}
