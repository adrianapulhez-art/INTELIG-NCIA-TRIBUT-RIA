import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  type RepasseMode,
  type ScheduleRowArt,
  type SideResultArt,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * NOTAS EXPLICATIVAS — relatório da situação, atrelado ao CARD (pedido da CEO, 25/09).
 * Cada quadro de bloco (Formação do preço do fornecedor / Custo da aquisição do comprador)
 * ganha o botão abaixo do "Memória + base legal"; a nota pormenoriza a situação daquele
 * card específico: o que a escolha gerou, com os números reais da memória exibida.
 */

function Par({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono text-slate-300 leading-relaxed text-justify">{children}</p>
  )
}

function TituloNota({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">
      {children}
    </div>
  )
}

function LinhaRelato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 border border-slate-800/70 px-2 py-1">
      <span className="text-[10px] font-mono text-slate-400">{label}</span>
      <span className="text-[10px] font-mono font-bold text-slate-100">{valor}</span>
    </div>
  )
}

/** Extrai o valor de uma linha do bloco pela key (para relatar com número real). */
const val = (side: SideResultArt, key: string) => {
  const l = side.lines.find((x) => x.key === key)
  return l ? l.value : 0
}

/** Nota explicativa de UM bloco (card) — relato da situação com os números do próprio card. */
export function NotaExplicativaBloco({
  side,
  bloco,
  cell,
  row,
  exercicio,
  repasse,
  repassePct,
  titulo,
  forn,
}: {
  side: SideResultArt
  bloco: 1 | 2
  cell: CellResultArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  repasse: RepasseMode
  repassePct: number
  titulo: string
  forn: boolean
}) {
  const hojeU = cell.hoje.unitario
  const novoU = cell.exercicio.unitario
  const d = cell.deltaPct
  const cbsV = Math.abs(val(side, 'cbs') || val(side, 'cbsibs') || val(cell.exercicio, 'cbs'))
  const ibsV = Math.abs(val(side, 'ibs') || val(cell.exercicio, 'ibs'))
  const credIcms = Math.abs(val(side, 'creditoicms'))
  const comprasLiq = val(side, 'comprasliquidas') || side.liquido
  const brutoNota = val(side, 'bruto_nota') || side.bruto

  const repasseTxt =
    repasse === 'parcial'
      ? `repasse parcial (${formatNumberBR(repassePct)}%)`
      : repasse === 'nenhum'
        ? 'sem repasse'
        : 'repasse integral'

  return (
    <div className="space-y-2.5">
      {/* ===== Situação 1: o que este card representa ===== */}
      <div className="space-y-1.5">
        <TituloNota>A situação deste card</TituloNota>
        <Par>
          {bloco === 1 ? (
            <>
              Este card mostra a <b className="text-slate-100">formação do preço do fornecedor</b>{' '}
              no exercício {exercicio} ({repasseTxt}). O fornecedor parte do que precisa receber
              líquido — o mesmo valor auferido na operação anterior —, desembute o ICMS dividindo a
              base limpa por (1 − 18%), e acrescenta CBS e IBS por fora, destacados na nota (LC
              214/2025, art. 12, caput e §2º, I). É deste card que sai o valor bruto da nota que o
              comprador paga.
            </>
          ) : (
            <>
              Este card mostra o{' '}
              <b className="text-slate-100">custo da aquisição para o comprador</b> no exercício{' '}
              {exercicio} ({repasseTxt}): o que ele paga na nota, o que recupera como crédito e o
              que sobra de custo efetivo. É aqui que a escolha do regime do fornecedor e o repasse
              negociado viram impacto no caixa.
            </>
          )}
        </Par>
      </div>

      {/* ===== Situação 2: relato dos números do próprio card ===== */}
      <div className="space-y-1.5">
        <TituloNota>O que aconteceu nos números</TituloNota>
        <div className="space-y-1">
          {bloco === 1 ? (
            <>
              <LinhaRelato label="Valor bruto da nota emitida" valor={formatBRL(brutoNota)} />
              <LinhaRelato label="CBS destacada por fora" valor={formatBRL(cbsV)} />
              <LinhaRelato label="IBS destacado por fora" valor={formatBRL(ibsV)} />
            </>
          ) : (
            <>
              <LinhaRelato label="Valor bruto da nota paga" valor={formatBRL(brutoNota)} />
              <LinhaRelato label="Crédito ICMS recuperado" valor={formatBRL(credIcms)} />
              <LinhaRelato label="Compras líquidas (custo total)" valor={formatBRL(comprasLiq)} />
              <LinhaRelato
                label="Custo unitário resultante"
                valor={`${formatBRL(side.unitario)}/un`}
              />
            </>
          )}
        </div>
        <Par>
          {bloco === 1 ? (
            <>
              {repasse === 'nenhum' ? (
                <>
                  Sem repasse, o fornecedor mantém o bruto de hoje e ainda destaca CBS/IBS por fora:
                  o ganho dele fica no preço, e quem paga a conta é o comprador no card ao lado. A
                  tendência ao aumento dos preços vem daqui: ele busca receber, líquido, no mínimo o
                  que auferia antes — se o líquido era o bruto menos a tributação, o novo regime
                  segue a mesma lógica.
                </>
              ) : repasse === 'parcial' ? (
                <>
                  Com repasse parcial de {formatNumberBR(repassePct)}%, o fornecedor divide o
                  impacto: absorve {formatNumberBR(100 - repassePct)}% na margem e transfere o resto
                  ao preço. O bruto da nota fica entre o cenário integral e o sem repasse.
                </>
              ) : (
                <>
                  Com repasse integral, o preço novo recomposto garante ao fornecedor o mesmo
                  líquido de antes: o bruto sobe porque CBS/IBS entram por fora, mas o líquido dele
                  fica estável — a operação preserva a margem.
                </>
              )}
            </>
          ) : (
            <>
              O desembolso na nota {d > 0.5 ? 'sobe' : d < -0.5 ? 'cai' : 'fica estável'} (
              {formatBRL(hojeU)} → {formatBRL(novoU)}/un, {d > 0 ? '+' : ''}
              {formatNumberBR(d)}%), mas o impacto no caixa é minimizado porque o valor pago a
              título de CBS e IBS torna-se crédito (art. 47, §2º):{' '}
              {credIcms > 0
                ? 'o custo da mercadoria diminui pelo crédito recuperado'
                : 'sem crédito de ICMS, o destaque destacado na nota vira custo'}
              .{' '}
              {repasse === 'nenhum'
                ? 'Sem repasse, não há compensação: o comprador absorve sozinho o impacto — é a escada de custo que sobe ano a ano.'
                : repasse === 'parcial'
                  ? `No parcial, o comprador paga via preço a parte que o fornecedor não absorveu.`
                  : 'No integral, o crédito lava o destaque e o custo acompanha o preço líquido do fornecedor.'}
            </>
          )}
        </Par>
      </div>

      {/* ===== Situação 3: leitura do resultado ===== */}
      <div className="space-y-1.5">
        <TituloNota>Leitura do resultado</TituloNota>
        <Par>
          {bloco === 1 ? (
            <>
              No sistema pré-reforma, os tributos estavam dentro do preço da nota e o fornecedor não
              precisava explicar regime: vendia-se o preço. No pós-reforma, a base de cálculo do IBS
              e da CBS deve vir livre da tributação anterior (art. 12), mas é a negociação do
              repasse — não a lei — que define se isso chega acontecendo. Este card registra o lado
              dele: preço emitido, destaque separado e líquido preservado
              {repasse === 'nenhum' ? ' — com o ganho ficando no preço' : ''}.
            </>
          ) : (
            <>
              No sistema pré-reforma, o comprador olhava o próprio regime (o que recupera) e
              procurava o melhor preço — o regime do fornecedor era indiferente. No pós-reforma, ele
              precisa analisar o regime do fornecedor para saber se haverá transmissão de carga
              tributária do regime anterior ou não. Resultado desta escolha:{' '}
              <b className="text-slate-100">
                {formatBRL(novoU)}/un ({d > 0 ? '+' : ''}
                {formatNumberBR(d)}% vs hoje)
              </b>
              .
            </>
          )}
        </Par>
      </div>
    </div>
  )
}

/** Modal que apresenta o relato do card (usado pelo botão dentro de cada quadro). */
export function NotaExplicativaCardDialog({
  side,
  bloco,
  cell,
  row,
  exercicio,
  repasse,
  repassePct,
  titulo,
  forn,
  open,
  onOpenChange,
}: {
  side: SideResultArt
  bloco: 1 | 2
  cell: CellResultArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  repasse: RepasseMode
  repassePct: number
  titulo: string
  forn: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-sky-500/30 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <span>Nota explicativa — {titulo}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Relatório da situação deste card · Exercício {exercicio} · CBS{' '}
            {formatNumberBR(row.cbsRate)}% · IBS {formatNumberBR(row.ibsRate)}% · ICMS{' '}
            {formatNumberBR(row.icmsPct)}% da alíquota
          </DialogDescription>
        </DialogHeader>
        <NotaExplicativaBloco
          side={side}
          bloco={bloco}
          cell={cell}
          row={row}
          exercicio={exercicio}
          repasse={repasse}
          repassePct={repassePct}
          titulo={titulo}
          forn={forn}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Botão NOTAS EXPLICATIVAS — abaixo do "Memória + base legal", dentro do card. */
export function BotaoNotaCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-[10px] font-mono font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
    >
      <FileText className="w-3 h-3" /> Notas explicativas
    </button>
  )
}

const REGIME_NOME_C: Record<string, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
  simples_hibrido: 'Simples Nacional híbrido',
}

export function NotaExplicativaCelula({
  cell,
  row,
  exercicio,
  comprador,
  fornecedor,
  repasse,
  repassePct,
}: {
  cell: CellResultArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  comprador: RegimeId
  fornecedor: RegimeId
  repasse: RepasseMode
  repassePct: number
}) {
  const hojeU = cell.hoje.unitario
  const novoU = cell.exercicio.unitario
  const d = cell.deltaPct
  const nomeC = REGIME_NOME_C[comprador]
  const nomeF = REGIME_NOME_C[fornecedor]
  const snC = comprador === 'simples'
  const snhC = comprador === 'simples_hibrido'
  const snF = fornecedor === 'simples'
  const snhF = fornecedor === 'simples_hibrido'
  const repasseTxt =
    repasse === 'parcial'
      ? `repasse parcial (${formatNumberBR(repassePct)}%)`
      : repasse === 'nenhum'
        ? 'sem repasse'
        : 'repasse integral'

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5">
        <TituloNota>A situação deste card</TituloNota>
        <Par>
          Comprador <b className="text-slate-100">{nomeC}</b> × Fornecedor{' '}
          <b className="text-slate-100">{nomeF}</b> · exercício {exercicio} · {repasseTxt}. No
          sistema pré-reforma, o custo de entrada do {nomeC} era{' '}
          <b className="text-slate-100">{formatBRL(hojeU)}/un</b> —{' '}
          {comprador === 'real'
            ? 'recupera ICMS, PIS e COFINS, o que faz dele o comprador mais barato'
            : snC
              ? 'não recupera crédito algum: o tributo embutido no preço vira custo integral'
              : snhC
                ? 'segue com ICMS/PIS/COFINS no DAS, mas credita CBS/IBS da nota (regime regular)'
                : 'recupera apenas ICMS — custo maior que o LR, menor que o SN'}
          . Como os tributos estavam dentro do preço da nota, o comprador não olhava o regime do
          fornecedor: procurava o melhor preço.
        </Par>
      </div>

      <div className="space-y-1.5">
        <TituloNota>O que aconteceu nos números</TituloNota>
        <div className="space-y-1">
          <LinhaRelato label="Valor bruto da nota paga" valor={formatBRL(cell.exercicio.bruto)} />
          <LinhaRelato label="Créditos recuperados" valor={formatBRL(cell.exercicio.creditos)} />
          <LinhaRelato
            label="Compras líquidas (custo total)"
            valor={formatBRL(cell.exercicio.liquido)}
          />
          <LinhaRelato label="Custo unitário resultante" valor={`${formatBRL(novoU)}/un`} />
        </div>
        <Par>
          No pós-reforma, a escolha do fornecedor passa a importar: a base de cálculo do IBS e da
          CBS deve vir livre da tributação anterior (LC 214/2025, art. 12), mas não necessariamente
          isso ocorrerá nas negociações —{' '}
          {snF
            ? 'e a nota congelada do Simples (LC 123/2006) não destaca CBS/IBS: não há como separar o novo tributo'
            : snhF
              ? 'e o SN híbrido destaca CBS/IBS por fora (art. 41) — o destaque gera crédito ao adquirente em regime regular'
              : 'e é o destaque na nota que permite ao comprador pleno recuperar o valor (art. 47, §2º)'}
          . O desembolso {d > 0.5 ? 'sobe' : d < -0.5 ? 'cai' : 'fica estável'} ({formatBRL(hojeU)}{' '}
          → {formatBRL(novoU)}/un, {d > 0 ? '+' : ''}
          {formatNumberBR(d)}%){' '}
          {snC
            ? 'e NÃO há minimização: o comprador SN não credita CBS/IBS (LC 123/2006 + art. 47) — o destaque vira custo integral, o pior cenário quando há repasse'
            : snhC
              ? 'e o impacto é parcialmente minimizado: CBS/IBS viram crédito, mas ICMS/PIS/COFINS seguem no DAS sem crédito'
              : 'e o impacto no caixa é minimizado: o valor pago a título de CBS e IBS torna-se crédito, o que faz o custo da mercadoria diminuir'}
          .
        </Par>
      </div>

      <div className="space-y-1.5">
        <TituloNota>Leitura do resultado</TituloNota>
        <Par>
          {repasse === 'integral'
            ? 'Com repasse integral, o fornecedor recomputa o preço para receber o mesmo líquido de antes — o bruto sobe com CBS/IBS por fora e o crédito lava o destaque: cadeia plena fecha neutra, e a diferença entre compradores está em quem credita o quê.'
            : repasse === 'parcial'
              ? `Com repasse parcial de ${formatNumberBR(repassePct)}%, o fornecedor absorve ${formatNumberBR(100 - repassePct)}% na margem e transfere o resto ao preço: o custo fica entre o integral e o sem repasse — e quem absorve cada fatia é negociável.`
              : 'Sem repasse, o ganho do fornecedor fica no preço e o comprador absorve o impacto sozinho: é a escada de custo que sobe ano a ano. A tendência ao aumento vem da lógica do líquido mínimo: ele busca receber, líquido, no mínimo o que auferia antes.'}{' '}
          Resultado desta escolha:{' '}
          <b className="text-slate-100">
            {formatBRL(novoU)}/un ({d > 0 ? '+' : ''}
            {formatNumberBR(d)}% vs hoje)
          </b>
          . Pendente de definição: base do ICMS na transição (tese do Fisco × PLP 16/25 — tese do
          Contribuinte).
        </Par>
      </div>
    </div>
  )
}

/** Gatilho + modal da nota de UMA célula do espelho. */
export function NotaCelulaTrigger({
  cell,
  row,
  exercicio,
  comprador,
  fornecedor,
  repasse,
  repassePct,
}: {
  cell: CellResultArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  comprador: RegimeId
  fornecedor: RegimeId
  repasse: RepasseMode
  repassePct: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[9px] font-mono font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
      >
        <FileText className="w-3 h-3" /> Notas explicativas
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-sky-500/30 text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <span>
                Nota explicativa — {REGIME_NOME_C[comprador]} × {REGIME_NOME_C[fornecedor]}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Relatório da situação deste card · Exercício {exercicio} · CBS{' '}
              {formatNumberBR(row.cbsRate)}% · IBS {formatNumberBR(row.ibsRate)}% · ICMS{' '}
              {formatNumberBR(row.icmsPct)}% da alíquota
            </DialogDescription>
          </DialogHeader>
          <NotaExplicativaCelula
            cell={cell}
            row={row}
            exercicio={exercicio}
            comprador={comprador}
            fornecedor={fornecedor}
            repasse={repasse}
            repassePct={repassePct}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Wrapper de estado: um par (botão + modal) por card. */
export function NotaCardTrigger({
  side,
  bloco,
  cell,
  row,
  exercicio,
  repasse,
  repassePct,
  titulo,
  forn,
}: {
  side: SideResultArt
  bloco: 1 | 2
  cell: CellResultArt
  row: ScheduleRowArt
  exercicio: ExercicioKey
  repasse: RepasseMode
  repassePct: number
  titulo: string
  forn: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <BotaoNotaCard onClick={() => setOpen(true)} />
      <NotaExplicativaCardDialog
        side={side}
        bloco={bloco}
        cell={cell}
        row={row}
        exercicio={exercicio}
        repasse={repasse}
        repassePct={repassePct}
        titulo={titulo}
        forn={forn}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
