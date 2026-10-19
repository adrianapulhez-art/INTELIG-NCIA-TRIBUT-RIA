import React, { useState, useEffect } from 'react'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  BookmarkCheck,
  Hash,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  classificarNcmEmTempoReal,
  formatarMascaraNcm,
  limparNcm,
  type ClassificacaoNcmResult,
} from '@/services/ncmClassificationService'
import { TABELA_OFICIAL_CCLASSTRIB } from '@/lib/tabelaOficialCClassTrib'
import { type ItemIntegracaoArt12 } from '@/lib/integracaoComprasArt12'

interface ItemClassificacaoDrawerProps {
  item: ItemIntegracaoArt12
  onAtualizarClassificacao: (
    id: string,
    dados: {
      ncm: string
      ncmPercentualReducao: number
      ncmAnexo?: string
      ncmArtigoOrigem?: string
      ncmDescricaoReducao?: string
      ncmFonte?: string
      ncmOpcaoId?: string
      cClassTribCodigo?: string
    },
  ) => void
}

export function ItemClassificacaoDrawer({
  item,
  onAtualizarClassificacao,
}: ItemClassificacaoDrawerProps) {
  const [ncmDigitado, setNcmDigitado] = useState<string>(
    item.ncm ? formatarMascaraNcm(item.ncm) : '',
  )
  const [opcaoSelecionadaId, setOpcaoSelecionadaId] = useState<string | undefined>(item.ncmOpcaoId)
  const [cClassManual, setCClassManual] = useState<string | undefined>(item.cClassTribCodigo)
  const [resultado, setResultado] = useState<ClassificacaoNcmResult | null>(null)
  const [carregando, setCarregando] = useState<boolean>(false)

  // Consulta em tempo real à coleção lc214_anexos_ncm
  useEffect(() => {
    let ativo = true
    setCarregando(true)

    classificarNcmEmTempoReal(ncmDigitado, opcaoSelecionadaId, cClassManual).then((res) => {
      if (!ativo) return
      setResultado(res)
      setCarregando(false)

      // Se enquadrou automaticamente ou se o usuário escolheu, atualiza o item
      if (res.status === 'enquadrado' && res.opcaoSelecionada) {
        onAtualizarClassificacao(item.id, {
          ncm: res.ncmLimpo,
          ncmPercentualReducao: res.percentualReducaoPct,
          ncmAnexo: res.anexo,
          ncmArtigoOrigem: res.artigoOrigem,
          ncmDescricaoReducao: res.opcaoSelecionada.descricao_reducao,
          ncmFonte: res.fonte,
          ncmOpcaoId: res.opcaoSelecionada.id,
          cClassTribCodigo: cClassManual || res.codigoCClassTribSugerido,
        })
      } else if (res.status === 'nao_encontrado') {
        onAtualizarClassificacao(item.id, {
          ncm: res.ncmLimpo,
          ncmPercentualReducao: 0,
          ncmAnexo: undefined,
          ncmArtigoOrigem: undefined,
          ncmDescricaoReducao: 'Sem redutor — alíquota cheia',
          ncmFonte: res.fonte,
          ncmOpcaoId: undefined,
          cClassTribCodigo: cClassManual || '000001',
        })
      }
    })

    return () => {
      ativo = false
    }
  }, [ncmDigitado, opcaoSelecionadaId, cClassManual, item.id])

  const handleMudarNcm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarMascaraNcm(e.target.value)
    setNcmDigitado(formatado)
    setOpcaoSelecionadaId(undefined) // Reset de opção prévia em nova digitação
  }

  const handleEscolherOpcaoManual = (opcaoId: string) => {
    setOpcaoSelecionadaId(opcaoId)
  }

  const handleMudarCClass = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCClassManual(e.target.value)
  }

  return (
    <div className="mx-2 my-2.5 p-4 rounded-xl bg-slate-100/90 border border-slate-300/80 shadow-inner space-y-4 font-mono text-xs">
      {/* Cabeçalho da Camada Interna Recuada */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300/60" />
          <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">
            ENQUADRAMENTO EM TEMPO REAL · LC 214/2025 · ITEM: {item.name || 'Sem nome'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded">
            NBS fora de escopo (bens e mercadorias)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Campo NCM/SH de 8 dígitos com máscara */}
        <div className="md:col-span-4 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <label className="text-[10px] uppercase font-bold text-slate-600 block flex items-center justify-between">
            <span>Código NCM/SH (8 dígitos)</span>
            <span className="text-slate-400 font-normal">{limparNcm(ncmDigitado).length}/8</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0000.00.00"
              value={ncmDigitado}
              onChange={handleMudarNcm}
              maxLength={10}
              className="h-8 text-xs font-mono font-bold bg-white text-slate-900 border-slate-300 focus-visible:ring-emerald-500 pr-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <p className="text-[9px] text-slate-500 leading-tight">
            Consulte a posição SH na LC 214/2025. Ex.: 1006.30.21 (Arroz), 9402.90.00 (Camas
            clínicas), 3401.11.90 (Sabões).
          </p>
        </div>

        {/* Sugestão de cClassTrib (Tabela Oficial 173 códigos) */}
        <div className="md:col-span-4 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <label className="text-[10px] uppercase font-bold text-slate-600 block flex items-center justify-between">
            <span>cClassTrib IBS/CBS (IT 2025.002)</span>
            <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[9px] px-1 py-0">
              v1.70
            </Badge>
          </label>
          <select
            value={cClassManual || resultado?.codigoCClassTribSugerido || '000001'}
            onChange={handleMudarCClass}
            className="w-full h-8 text-xs font-mono bg-white border border-slate-300 rounded-md px-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {TABELA_OFICIAL_CCLASSTRIB.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} · {c.descricao.slice(0, 48)}...
              </option>
            ))}
          </select>
          <p className="text-[9px] text-slate-500 leading-tight">
            Sugerido automaticamente a partir da tabela oficial conforme o benefício legal.
          </p>
        </div>

        {/* Status e Redução apurada */}
        <div className="md:col-span-4 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-600 block">
              Enquadramento Tributário
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              {carregando ? (
                <span className="text-[11px] text-slate-400">Consultando LC 214/2025...</span>
              ) : resultado?.status === 'enquadrado' ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  Redução de {resultado.percentualReducaoPct}% ({resultado.anexo})
                </Badge>
              ) : resultado?.status === 'ambiguo' ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                  Ambiguidade ({resultado.opcoesEncontradas.length} opções)
                </Badge>
              ) : resultado?.status === 'nao_encontrado' ? (
                <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-bold text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-slate-500" />
                  Sem redutor — alíquota cheia
                </Badge>
              ) : (
                <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                  <HelpCircle className="w-3 h-3 mr-1 text-slate-400" />
                  Informe NCM para enquadrar
                </Badge>
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            {resultado?.percentualReducaoPct && resultado.percentualReducaoPct > 0 ? (
              <span className="text-emerald-700 font-bold">
                Aplica redutor de {resultado.percentualReducaoPct}% sobre CBS/IBS 2027+
              </span>
            ) : (
              <span>Tributação plena de CBS/IBS (sem benefício de alíquota reduzida)</span>
            )}
          </div>
        </div>
      </div>

      {/* CASO DE AMBIGUIDADE — EXIGIR CHANCELA MANUAL DA USUÁRIA */}
      {resultado?.status === 'ambiguo' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              AMBIGUIDADE DETECTADA: O NCM casa com múltiplos itens nos Anexos da LC 214/2025.
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Regra permanente da Adri: nada de seleção automática. Escolha manualmente a qualificação
            legal do bem para determinar a redução legítima:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {resultado.opcoesEncontradas.map((op) => {
              const selecionada = opcaoSelecionadaId === op.id
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleEscolherOpcaoManual(op.id)}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selecionada
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-amber-200 text-slate-800 hover:bg-amber-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-800">
                      {op.anexo} · {op.artigo_origem}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                      Redução {op.percentual_reducao_pct}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-700 mt-1 line-clamp-2">{op.descricao}</p>
                  <div className="text-[9px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Termo SH: {op.ncm_sh_termo}</span>
                    {selecionada && (
                      <span className="text-emerald-700 font-bold">✓ Chancelado manualmente</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* RASTREABILIDADE LEGAL COMPLETA (DOSSIÊ ROTULADO) */}
      {resultado?.status === 'enquadrado' && resultado.opcaoSelecionada && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 space-y-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              {resultado.opcaoSelecionada.anexo} · {resultado.opcaoSelecionada.artigo_origem} · Item{' '}
              {resultado.opcaoSelecionada.item}
            </span>
            <span className="text-emerald-800 font-bold">
              Redução devida: {resultado.opcaoSelecionada.percentual_reducao_pct}% no IBS e na CBS
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            <strong>Descrição legal:</strong> {resultado.opcaoSelecionada.descricao}
          </p>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Termo legal correspondente:</strong> {resultado.opcaoSelecionada.ncm_sh_termo}{' '}
              (NCM pesquisado: {resultado.ncmFormatado})
            </span>
            <span className="text-slate-600 italic">
              <strong>Fonte oficial:</strong> {resultado.opcaoSelecionada.fonte}
            </span>
          </div>
        </div>
      )}

      {/* SEM REDUTOR — RÓTULO AUDITÁVEL */}
      {resultado?.status === 'nao_encontrado' && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 text-[11px]">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>NCM {resultado.ncmFormatado} FORA DOS ANEXOS DA LC 214/2025</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Nenhum benefício de alíquota reduzida localizado na Lei Complementar 214/2025. O bem
            será tributado pela alíquota cheia (ad valorem integral) com cClassTrib 000001 no regime
            regular.
          </p>
          <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
            Fonte: Presidência da República / Diário Oficial da União (LC 214/2025 · sem benefício
            presumido).
          </div>
        </div>
      )}
    </div>
  )
}
