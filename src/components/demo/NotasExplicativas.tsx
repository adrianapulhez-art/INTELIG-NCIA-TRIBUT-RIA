import React, { useState } from 'react'
import { FileText } from 'lucide-react'
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
  type SideResultArt,
} from '@/lib/art12Calculations'
import { formatBRL, formatNumberBR } from '@/lib/taxCalculations'

/**
 * NOTAS EXPLICATIVAS — relatório da situação, atrelado ao CARD (pedido da CEO, 25/09).
 * Modelo: relatório LP×LP elaborado pela própria CEO (ótica do fornecedor → ótica do
 * adquirente → confronto pré × pós-reforma → estratégia → pendência). Replicado para
 * cada combinação de regimes e cada cenário de repasse, com os números REAIS da célula.
 * REGRA INEGOCIÁVEL: nunca inventar informação — todo número vem da memória do card;
 * toda leitura vem de dispositivo legal (LC 214/2025, LC 123/2006, EC 132/2023) ou da
 * aritmética do motor chancelado. Pendências são marcadas como pendências.
 */

const REGIME_NOME: Record<RegimeId, string> = {
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
  simples: 'Simples Nacional',
  simples_hibrido: 'Simples Nacional híbrido',
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

const val = (side: SideResultArt, key: string) => {
  const l = side.lines.find((x) => x.key === key)
  return l ? l.value : 0
}

/** Tabela de memória de cálculo no formato do relatório da CEO. */
function TabelaMemoria({ linhas }: { linhas: { label: string; valor: string; destaque?: boolean }[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 space-y-0.5">
      {linhas.map((l, i) => (
        <div
          key={i}
          className={`flex items-center justify-between gap-2 px-1.5 py-0.5 rounded ${l.destaque ? 'bg-orange-500/10 border border-orange-500/40' : ''}`}
        >
          <span className={`text-[10px] font-mono ${l.destaque ? 'font-bold text-orange-300' : 'text-slate-400'}`}>
            {l.label}
          </span>
          <span className={`text-[10px] font-mono ${l.destaque ? 'font-black text-orange-300' : 'font-bold text-slate-100'}`}>
            {l.valor}
          </span>
        </div>
      ))}
    </div>
  )
}

/** ============================================================
 * NOTA DA CÉLULA DO ESPELHO — relato pormenorizado da combinação
 * COMPRADOR × FORNECEDOR × REPASSE, no modelo do relatório da CEO.
 * ============================================================ */
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
  const nomeC = REGIME_NOME[comprador]
  const nomeF = REGIME_NOME[fornecedor]
  const hojeU = cell.hoje.unitario
  const novoU = cell.exercicio.unitario
  const d = cell.deltaPct
  const snC = comprador === 'simples'
  const snhC = comprador === 'simples_hibrido'
  const snF = fornecedor === 'simples'
  const snhF = fornecedor === 'simples_hibrido'
  const plenoF = !snF && !snhF
  const repasseTxt =
    repasse === 'parcial'
      ? `repasse parcial (${formatNumberBR(repassePct)}%)`
      : repasse === 'nenhum'
        ? 'sem repasse'
        : 'repasse integral'

  // números reais da célula
  const brutoEx = cell.exercicio.bruto
  const credEx = cell.exercicio.creditos
  const liqEx = cell.exercicio.liquido
  const cbsV = Math.abs(val(cell.exercicio, 'cbs'))
  const ibsV = Math.abs(val(cell.exercicio, 'ibs'))
  const icmsNota = Math.abs(val(cell.exercicio, 'creditoicms'))
  const credHoje = cell.hoje.creditos
  const liqHoje = cell.hoje.liquido
  const brutoHoje = cell.hoje.bruto

  const repasseTxt2 =
    repasse === 'parcial'
      ? `repasse parcial (${formatNumberBR(repassePct)}%)`
      : repasse === 'nenhum'
        ? 'sem repasse'
        : 'repasse integral'

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono font-black uppercase text-orange-300">
        ADQUIRENTE {nomeC.toUpperCase()} × FORNECEDOR {nomeF.toUpperCase()} · Exercício {exercicio} ·{' '}
        {repasseTxt2}
      </div>

      {/* ============ ÓTICA DO FORNECEDOR ============ */}
      <div className="space-y-1.5">
        <TituloNota>1. Análise sob a ótica do fornecedor</TituloNota>
        <Par>
          {snF ? (
            <>
              A nota do fornecedor do Simples Nacional é <b className="text-slate-100">congelada</b>{' '}
              (LC 123/2006): o Simples recolhe por dentro do DAS, sem destaque de tributo na nota.
              Não há reprecificação a analisar — o preço dele não se altera com a Reforma, e não há
              CBS/IBS destacados para o adquirente recuperar. Quem define o resultado desta
              combinação é o regime do adquirente.
            </>
          ) : snhF ? (
            <>
              O fornecedor do SN híbrido optou pelo regime regular de IBS/CBS (LC 214/2025, art. 41):
              mantém a nota no valor de hoje (congelada) e destaca CBS e IBS por fora —{' '}
              <b className="text-slate-100">{formatBRL(cbsV)}</b> e{' '}
              <b className="text-slate-100">{formatBRL(ibsV)}</b> sobre a base sem ICMS (premissa IT,
              pendente de regulamentação). O líquido dele fica preservado e o destaque gera crédito
              ao adquirente em regime regular (art. 47).
            </>
          ) : (
            <>
              Para recompor a base líquida com a mesma condição do sistema pré-reforma, o fornecedor{' '}
              {nomeF} parte da receita líquida de vendas (RLV): a receita bruta menos ICMS
              {' '}e PIS/COFINS (embutidos sobre base sem ICMS — tese do século, STJ RE 1.188.403).{' '}
              A base para a CBS e o IBS é o valor da operação (LC 214/2025, art. 12), e ambos incidem
              por fora — por isso a reprecificação divide a base líquida pelo fator (1 − 18%): o ICMS
              continua por dentro do preço até 2032, e a divisão garante que, descontado o ICMS da
              nota nova, sobre exatamente o líquido de antes. É a lógica do líquido mínimo: ele
              busca receber, líquido, no mínimo o que auferia antes.
            </>
          )}
        </Par>
        {plenoF && (
          <TabelaMemoria
            linhas={[
              { label: 'RBV (preço pré-reforma)', valor: formatBRL(cell.hoje.bruto) },
              { label: '(−) ICMS', valor: formatBRL(cell.hoje.bruto * 0.18) },
              { label: '(−) PIS/COFINS', valor: formatBRL(Math.max(0, cell.hoje.bruto - cell.hoje.bruto * 0.18 - (cell.hoje.baseLimpa || 0))) },
              { label: '(=) RLV — base limpa', valor: formatBRL(cell.hoje.baseLimpa || 0), destaque: true },
              { label: 'CBS por fora (8,80%)', valor: formatBRL(cbsV) },
              { label: 'IBS por fora (0,10%)', valor: formatBRL(ibsV) },
              { label: 'PREÇO DE VENDA (pós-reforma)', valor: formatBRL(brutoEx), destaque: true },
            ]}
          />
        )}
        {plenoF && (
          <Par>
            Com {repasseTxt}, o preço de venda passa a{' '}
            <b className="text-slate-100">{formatBRL(brutoEx)}</b> —{' '}
            {repasse === 'integral'
              ? 'o líquido do fornecedor fica idêntico ao de antes: o bruto sobe porque CBS/IBS entram por fora, e a margem dele fica preservada. É a tendência estrutural ao aumento dos preços: quem vende recompõe o líquido mínimo que auferia.'
              : repasse === 'parcial'
                ? `o fornecedor absorve ${formatNumberBR(100 - repassePct)}% do impacto na margem e transfere o restante ao preço — negociação entre os agentes, não imposição legal.`
                : 'o fornecedor mantém o bruto de hoje e ainda destaca CBS/IBS por fora: o ganho dele fica no preço e o custo da não reprecificação é transferido ao adquirente.'}
          </Par>
        )}
      </div>

      {/* ============ ÓTICA DO ADQUIRENTE ============ */}
      <div className="space-y-1.5">
        <TituloNota>2. Análise sob a ótica do adquirente</TituloNota>
        <Par>
          {snC
            ? 'No sistema pré-reforma, o adquirente do Simples Nacional não recupera crédito algum: o tributo embutido no preço vira custo integral. No pós-reforma, a situação não muda — LC 123/2006 + art. 47: o destaque de CBS/IBS na nota não gera crédito ao optante.'
            : snhC
              ? 'No sistema pré-reforma, o adquirente (então SN padrão) não creditava nada. Optando pelo regime regular de IBS/CBS (art. 41), passa a creditar o destaque de CBS/IBS da nota — mas ICMS, PIS e COFINS seguem no DAS, sem crédito.'
              : comprador === 'real'
                ? 'No sistema pré-reforma, o adquirente do Lucro Real deduz do custo os créditos de ICMS, PIS e COFINS — é o comprador que mais recupera, e por isso compra mais barato que o LP. No pós-reforma, credita também CBS e IBS (art. 47, §2º).'
                : 'No sistema pré-reforma, a composição do custo do adquirente Lucro Presumido é deduzida apenas pelo crédito de ICMS — não há crédito de PIS/COFINS neste regime, que portanto compõem o custo das mercadorias adquiridas.'}
        </Par>
        <TabelaMemoria
          linhas={[
            { label: 'PRÉ-REFORMA: bruto da nota', valor: formatBRL(cell.hoje.bruto) },
            { label: '(−) Créditos do regime', valor: formatBRL(credHoje) },
            { label: '(=) Compras líquidas', valor: formatBRL(liqHoje), destaque: true },
            { label: 'Custo líquido unitário', valor: `${formatBRL(hojeU)}/un`, destaque: true },
            { label: 'PÓS-REFORMA: bruto da nota', valor: formatBRL(brutoEx) },
            { label: '(−) Créditos do regime', valor: formatBRL(credEx) },
            { label: '(=) Compras líquidas', valor: formatBRL(liqEx), destaque: true },
            { label: 'Custo líquido unitário', valor: `${formatBRL(novoU)}/un`, destaque: true },
          ]}
        />
      </div>

      {/* ============ CONFRONTO ============ */}
      <div className="space-y-1.5">
        <TituloNota>3. Confronto pré × pós-reforma</TituloNota>
        <Par>
          Embora o desembolso no ato da compra{' '}
          {brutoEx > cell.hoje.bruto
            ? `passe a ser maior (${formatBRL(cell.hoje.bruto)} → ${formatBRL(brutoEx)}), impactando diretamente o caixa da empresa`
            : brutoEx < cell.hoje.bruto
              ? `seja menor (${formatBRL(cell.hoje.bruto)} → ${formatBRL(brutoEx)})`
              : `permaneça o mesmo (${formatBRL(brutoEx)})`}
          ,{' '}
          {d < -0.5
            ? `o custo líquido da mercadoria é MENOR na transação (${formatBRL(hojeU)} → ${formatBRL(novoU)}/un, ${formatNumberBR(d)}%)`
            : d > 0.5
              ? `o custo líquido da mercadoria sobe (${formatBRL(hojeU)} → ${formatBRL(novoU)}/un, +${formatNumberBR(d)}%)`
              : `o custo líquido da mercadoria permanece estável (${formatBRL(hojeU)} → ${formatBRL(novoU)}/un)`}
          .{' '}
          {snC
            ? 'Para o comprador SN não há minimização: o destaque destacado na nota vira custo integral — o pior cenário da matriz quando há repasse. A decisão aqui é estratégica: migrar para o regime regular (SN híbrido) ou renegociar o fornecedor.'
            : snhC
              ? 'O impacto é parcialmente minimizado: CBS/IBS viram crédito (regime regular), mas ICMS/PIS/COFINS seguem no DAS, sem crédito.'
              : 'O que gera uma estratégia da empresa em também reprecificar pensando em tornar-se mais competitiva no mercado, ou mais lucrativa.'}
        </Par>
      </div>

      {/* ============ PENDÊNCIA ============ */}
      <div className="space-y-1.5">
        <TituloNota>4. Pendência registrada</TituloNota>
        <Par>
          Ainda está pendente de definição a base de ICMS na transição (tese do Fisco × PLP 16/25 —
          tese do contribuinte). Afeta a nota e o destaque do ICMS; o custo do comprador pleno fecha
          igual nas duas teses — a diferença aparece no comprador SN.
        </Par>
      </div>
    </div>
  )
}

/** Modal da nota da célula do espelho. */
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
                Nota explicativa — {REGIME_NOME[comprador]} × {REGIME_NOME[fornecedor]}
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

/** ============================================================
 * NOTA DO CARD DE BLOCO (página) — relato do bloco no mesmo modelo.
 * ============================================================ */
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
  bloco 1 | 2
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
  const cbsV = Math.abs(val(side, 'cbs') || val(cell.exercicio, 'cbs'))
  const ibsV = Math.abs(val(side, 'ibs'))
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
    <div className="space-y-3">
      <div className="text-[11px] font-mono font-black uppercase text-orange-300">{titulo}</div>

      {bloco === 1 ? (
        <>
          <div className="space-y-1.5">
            <TituloNota>1. Análise sob a ótica do fornecedor</TituloNota>
            <Par>
              Precisamos olhar a operação com os olhos do fornecedor para pensar na formação do
              preço que satisfaça a mesma condição do sistema pré-reforma. Para recompor a base
              líquida, o fornecedor considera que nela há o ICMS, o PIS e o COFINS — a receita
              líquida (receita − tributos) é a base limpa. Para receber esse valor líquido no
              pós-reforma, ele reprecifica de modo que a CBS e o IBS — que incidem por fora — não
              interfiram no líquido a receber. A base para a CBS e o IBS é o valor da operação (LC
              214/2025, art. 12): CBS {formatBRL(cbsV)} e IBS {formatBRL(ibsV)} sobre a base limpa.
              Como o ICMS incide por dentro do preço, invertemos o cálculo através da divisão pelo
              fator: BC ICMS = base líquida + CBS + IBS ÷ (1 − 18%). Com {repasseTxt}, o preço de
              venda resultante é <b className="text-slate-100">{formatBRL(brutoNota)}</b>.
            </Par>
            <TabelaMemoria
              linhas={[
                { label: 'RBV (preço pré-reforma)', valor: formatBRL(cell.hoje.bruto) },
                { label: '(−) ICMS', valor: formatBRL(cell.hoje.bruto * 0.18) },
                { label: '(=) RLV — base limpa', valor: formatBRL(cell.hoje.baseLimpa || 0), destaque: true },
                { label: 'CBS por fora', valor: formatBRL(cbsV) },
                { label: 'IBS por fora', valor: formatBRL(ibsV) },
                { label: 'PREÇO DE VENDA (pós-reforma)', valor: formatBRL(brutoNota), destaque: true },
              ]}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <TituloNota>2. Análise sob a ótica do adquirente</TituloNota>
            <Par>
              O custo do adquirente sofre mudança do sistema anterior para o atual, e a análise
              precisa olhar a perspectiva do regime tributário dele. Abaixo, a composição do custo
              no sistema pré-reforma e no pós-reforma, com os números deste card. Com{' '}
              {repasseTxt}, o custo líquido unitário vai de{' '}
              <b className="text-slate-100">{formatBRL(hojeU)}</b> para{' '}
              <b className="text-slate-100">{formatBRL(novoU)}/un</b> ({d > 0 ? '+' : ''}
              {formatNumberBR(d)}%).
            </Par>
            <TabelaMemoria
              linhas={[
                { label: 'PRÉ: bruto da nota', valor: formatBRL(cell.hoje.bruto) },
                { label: 'PRÉ: (−) créditos', valor: formatBRL(cell.hoje.creditos) },
                { label: 'PRÉ: (=) compras líquidas', valor: formatBRL(cell.hoje.liquido), destaque: true },
                { label: 'PRÉ: custo unitário', valor: `${formatBRL(hojeU)}/un`, destaque: true },
                { label: 'PÓS: bruto da nota', valor: formatBRL(brutoNota) },
                { label: 'PÓS: (−) ICMS', valor: formatBRL(credIcms) },
                { label: 'PÓS: (−) CBS', valor: formatBRL(cbsV) },
                { label: 'PÓS: (−) IBS', valor: formatBRL(ibsV) },
                { label: 'PÓS: (=) compras líquidas', valor: formatBRL(comprasLiq), destaque: true },
                { label: 'PÓS: custo unitário', valor: `${formatBRL(side.unitario)}/un`, destaque: true },
              ]}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <TituloNota>Confronto e leitura</TituloNota>
        <Par>
          {bloco === 1
            ? `Este card registra o lado do fornecedor: preço emitido no pós-reforma, destaque de CBS/IBS separado e líquido preservado. ${repasse === 'nenhum' ? 'Sem repasse, o ganho dele fica no preço — quem paga é o comprador no card ao lado. A tendência ao aumento vem da lógica do líquido mínimo.' : repasse === 'parcial' ? `No parcial, ele absorve ${formatNumberBR(100 - repassePct)}% na margem — negociação entre agentes, não imposição legal.` : 'No integral, a margem dele fica preservada e o impacto é transmitido ao preço.'}`
            : `Confrontando os valores da aquisição pré × pós-reforma: o desembolso no ato da compra ${brutoNota > cell.hoje.bruto ? `passe a ser maior (${formatBRL(cell.hoje.bruto)} → ${formatBRL(brutoNota)}), impactando diretamente o caixa` : 'permanece estável'}, e o custo líquido ${d < -0.5 ? 'cai' : d > 0.5 ? 'sobe' : 'fica estável'} (${formatBRL(hojeU)} → ${formatBRL(novoU)}/un). O que gera uma estratégia da empresa em também reprecificar pensando em tornar-se mais competitiva no mercado, ou mais lucrativa.`}
        </Par>
      </div>

      <div className="space-y-1.5">
        <TituloNota>Pendência registrada</TituloNota>
        <Par>
          Ainda está pendente de definição a base de ICMS na transição (tese do Fisco × PLP 16/25 —
          tese do contribuinte).
        </Par>
      </div>
    </div>
  )
}

/** Modal do card da página. */
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

/** Botão dentro do card. */
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