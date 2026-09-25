import React from 'react'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  type CellResultArt,
  type ExercicioKey,
  type RegimeId,
  type RepasseMode,
  type ScheduleRowArt,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * NOTAS EXPLICATIVAS (pedido da CEO, 25/09).
 * Camada didática que pormenoriza os efeitos de cada escolha do cliente
 * (combinação de regimes × cenário de repasse) e o resultado que a escolha gerou,
 * usando os números reais da célula calculada. Formato: leitura explicada,
 * pré-reforma × pós-reforma, efeitos no caixa e quem absorve o impacto.
 */

const REGIME_NOME: Record<RegimeId, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
  simples_hibrido: 'Simples Nacional híbrido (regime regular IBS/CBS)',
}

const REPASSE_NOME: Record<RepasseMode, string> = {
  integral: 'repasse integral',
  parcial: 'repasse parcial',
  nenhum: 'sem repasse',
}

function Par({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono text-slate-300 leading-relaxed text-justify">{children}</p>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
      {children}
    </div>
  )
}

/** Nota didática de UMA combinação comprador × fornecedor (números reais da célula). */
export function NotaExplicativaCruzamento({
  comprador,
  fornecedor,
  cell,
  row,
  repasse,
  repassePct,
}: {
  comprador: RegimeId
  fornecedor: RegimeId
  cell: CellResultArt
  row: ScheduleRowArt
  repasse: RepasseMode
  repassePct: number
}) {
  const hoje = cell.hoje.unitario
  const novo = cell.exercicio.unitario
  const d = cell.deltaPct
  const plenoC = comprador !== 'simples'
  const plenoF = fornecedor !== 'simples'
  const snF = fornecedor === 'simples'
  const snhF = fornecedor === 'simples_hibrido'
  const snC = comprador === 'simples'
  const snhC = comprador === 'simples_hibrido'

  const creditoF = plenoF
    ? 'ICMS, PIS e COFINS'
    : snhF
      ? 'ICMS, PIS e COFINS (a nota do SN híbrido destaca também CBS/IBS, que geram crédito)'
      : 'apenas ICMS (a nota do Simples não destaca crédito)'

  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-mono font-black uppercase text-orange-300">
          Comprador {REGIME_NOME[comprador]} × Fornecedor {REGIME_NOME[fornecedor]}
        </span>
        <Badge
          className={`text-[9px] font-mono border ${
            cell.semaforo === 'verde'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : cell.semaforo === 'ambar'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
          }`}
        >
          {d > 0 ? '+' : ''}
          {formatNumberBR(d)}% vs hoje
        </Badge>
      </div>

      <div className="space-y-2">
        <Titulo>Sistema pré-reforma (hoje)</Titulo>
        <Par>
          No sistema anterior, o custo de entrada do comprador {REGIME_NOME[comprador]} é{' '}
          <b className="text-slate-100">{formatBRL(hoje)}/un</b>. O que ele recupera depende só do
          regime DELE:{' '}
          {plenoC
            ? 'o Lucro Presumido recupera ICMS; o Lucro Real recupera ICMS, PIS e COFINS — por isso o LR compra mais barato que o LP'
            : snC
              ? 'o Simples Nacional não recupera crédito algum — o tributo embutido no preço vira custo integral, e é o comprador mais caro da matriz'
              : 'o SN híbrido segue com ICMS/PIS/COFINS no DAS, sem crédito deles'}
          . Importante: como os tributos vinham embutidos no preço da nota, a empresa compradora não
          precisava olhar o regime do fornecedor — via de regra, procurava o melhor preço.
        </Par>

        <Titulo>Sistema pós-reforma (exercício {row.exercicio})</Titulo>
        <Par>
          No novo sistema, a escolha do fornecedor passa a importar. A base de cálculo do IBS e da
          CBS deve chegar livre da tributação anterior (LC 214/2025, art. 12), mas a lei não garante
          que o preço negociado repasse isso —{' '}
          {snF
            ? 'e o fornecedor do Simples emite nota congelada (LC 123/2006), sem destaque de CBS/IBS: não há como o comprador separar o novo tributo'
            : snhF
              ? 'e o fornecedor SN híbrido destaca CBS/IBS por fora da nota (art. 41) — o destaque gera crédito ao adquirente em regime regular (art. 47)'
              : 'e é o destaque de CBS/IBS na nota do fornecedor que permite ao comprador pleno recuperar o valor (art. 47, §2º)'}
          . Com {REPASSE_NOME[repasse]}
          {repasse === 'parcial' ? ` (${formatNumberBR(repassePct)}%)` : ''}, o custo unitário vai a{' '}
          <b className="text-slate-100">{formatBRL(novo)}/un</b>
          {d === 0
            ? ' — estável frente a hoje'
            : ` — ${d > 0 ? 'aumento' : 'redução'} de ${formatNumberBR(Math.abs(d))}% frente a hoje`}{' '}
          ({formatBRL(hoje)} → {formatBRL(novo)}).
        </Par>

        <Titulo>O efeito que a escolha gerou</Titulo>
        <Par>
          {snC ? (
            <>
              O comprador SN não credita CBS/IBS (LC 123/2006 + art. 47): o destaque destacado na
              nota vira custo integral. O desembolso sobe, o caixa sente e não há compensação
              posterior — é o pior cenário da matriz quando o fornecedor repassa.
            </>
          ) : snhC ? (
            <>
              O comprador SN híbrido credita CBS/IBS da nota (regime regular — art. 41), mas ICMS,
              PIS e COFINS seguem no DAS, sem crédito. Ganha frente ao SN padrão, perde para os
              regimes plenos no que depende de crédito de ICMS.
            </>
          ) : (
            <>
              O desembolso na nota muda, mas o impacto no caixa é minimizado porque o valor pago a
              título de CBS e IBS torna-se crédito (art. 47, §2º):{' '}
              {plenoC
                ? 'o custo da mercadoria diminui pelo crédito integral — cadeia plena com crédito integral é neutra, e o custo acompanha o preço líquido do fornecedor'
                : 'o crédito recupera o destaque, e o custo fica próximo do preço líquido do fornecedor'}
              .{' '}
              {d < -0.5
                ? 'Neste cruzamento o custo cai de verdade: a recuperação supera o que o novo regime acrescenta.'
                : d > 0.5
                  ? 'Neste cruzamento o custo sobe: o que o comprador deixa de creditar supera o que o novo regime permite recuperar.'
                  : 'Neste cruzamento o custo fica estável: o crédito lava o destaque e a operação fecha neutra.'}
            </>
          )}{' '}
          {snF && !snhF
            ? 'Do lado do fornecedor SN, a nota congelada impede o repasse — quem define o custo aqui é o regime do comprador.'
            : snhF
              ? 'Do lado do fornecedor SN híbrido, a nota congelada + destaque por fora preserva o valor líquido dele e credita o adquirente pleno.'
              : repasse === 'integral'
                ? 'O fornecedor repassa o novo regime integralmente: quem compra de quem credita tudo, paga igual — a diferença entre compradores some no crédito.'
                : repasse === 'parcial'
                  ? `O fornecedor absorve ${formatNumberBR(100 - repassePct)}% do impacto na margem e o comprador paga o restante no preço — o custo fica entre o integral e o sem repasse.`
                  : 'Sem repasse, o fornecedor ganha no preço e o comprador absorve o impacto sozinho: é a escada de custo que sobe ano a ano.'}
        </Par>

        <Titulo>Base legal da leitura</Titulo>
        <Par>
          LC 214/2025, art. 12 (base = valor da operação; CBS/IBS por fora — §2º, I) e art. 47, §2º
          (crédito = débito destacado)
          {snhF || snhC ? '; art. 41 (opção do SN pelo regime regular de IBS/CBS)' : ''}
          {snF ? '; LC 123/2006 (nota congelada do Simples)' : ''}. Pendente de definição: base do
          ICMS na transição (tese do Fisco × PLP 16/25 — tese do Contribuinte).
        </Par>
      </div>
    </div>
  )
}

/** Modal NOTAS EXPLICATIVAS: as 16 combinações do exercício, agrupadas por comprador. */
export function NotasExplicativasDialog({
  matriz,
  row,
  exercicio,
  repasse,
  repassePct,
  open,
  onOpenChange,
}: {
  matriz: { comprador: RegimeId; cells: { fornecedor: RegimeId; cell: CellResultArt }[] }[]
  row: ScheduleRowArt
  exercicio: ExercicioKey
  repasse: RepasseMode
  repassePct: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-emerald-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>
              Notas explicativas — Exercício {exercicio} ·{' '}
              {repasse === 'parcial'
                ? `repasse parcial ${formatNumberBR(repassePct)}%`
                : REPASSE_NOME[repasse]}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            O efeito de cada escolha: o que muda para o comprador em cada combinação de regime com o
            fornecedor, pré-reforma × pós-reforma, com os números reais da célula. CBS{' '}
            {formatNumberBR(row.cbsRate)}% · IBS {formatNumberBR(row.ibsRate)}% · ICMS{' '}
            {formatNumberBR(row.icmsPct)}% da alíquota.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {matriz.map((linha) => (
            <div key={linha.comprador} className="space-y-3">
              {linha.cells.map(({ fornecedor, cell }) => (
                <NotaExplicativaCruzamento
                  key={`${linha.comprador}-${fornecedor}`}
                  comprador={linha.comprador}
                  fornecedor={fornecedor}
                  cell={cell}
                  row={row}
                  repasse={repasse}
                  repassePct={repassePct}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-slate-500 border-t border-slate-800 pt-2">
          Leitura transversal: no pré-reforma, o comprador olha o próprio regime (o que recupera) e
          procura o melhor preço — o regime do fornecedor é indiferente porque os tributos estão
          dentro do preço da nota. No pós-reforma, o regime do fornecedor passa a definir o que
          chega destacado na nota e o que o comprador consegue recuperar — e a negociação do repasse
          decide quem absorve o impacto. A tendência ao aumento dos preços vem da lógica do
          fornecedor: ele busca receber, líquido, no mínimo o que auferia antes — se o líquido era o
          bruto menos a tributação, o novo regime segue a mesma lógica, agora com CBS/IBS por fora.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/** Botão NOTAS EXPLICATIVAS — par do "Memória + base legal". */
export function BotaoNotasExplicativas({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-[10px] font-mono font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
    >
      <FileText className="w-3 h-3" /> Notas explicativas
    </Button>
  )
}
