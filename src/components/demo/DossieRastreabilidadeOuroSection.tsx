import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  Scale,
  FileCode,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export interface ItemRastreabilidadeOuro {
  id: string
  titulo: string
  valorFormatado: string
  artigoLei: string
  formulaComNumeros: string
  arquivoTesteProtecao: string
  pendenciasConhecidas: string
  status: 'CHANCELADO_ADRI' | 'PENDENTE_CONFIRMACAO'
}

export const ITENS_RASTREABILIDADE_OURO: ItemRastreabilidadeOuro[] = [
  {
    id: 'das_1696',
    titulo: 'DAS Devido 1.696,00 (Caso Canônico Anexo I 1ª Faixa)',
    valorFormatado: 'R$ 1.696,000000',
    artigoLei: 'LC 123/2006 Art. 18 §1º e Resolução CGSN 140/2018',
    formulaComNumeros: 'Receita Bruta R$ 42.400,00 × Alíquota Nominal 4,00% = R$ 1.696,000000',
    arquivoTesteProtecao: 'src/lib/art12Sn.test.ts',
    pendenciasConhecidas:
      'Regra definitiva para a base do DAS em discussão (base cheia na nota canônica chancelada pela Adri).',
    status: 'CHANCELADO_ADRI',
  },
  {
    id: 'blocos_das_4',
    titulo: 'Decomposição do DAS em 4 Blocos (576,64 / 259,9968 / 2,8832 / 856,48)',
    valorFormatado: 'Soma exata = R$ 1.696,000000',
    artigoLei: 'LC 123/2006 Anexo I + LC 214/2025 Art. 139 e Art. 348 (Transição CBS/IBS)',
    formulaComNumeros:
      'ICMS: 42.400 × 1,36% = 576,640000 | CBS: 42.400 × 0,6132% = 259,996800 | IBS: 42.400 × 0,0068% = 2,883200 | IRPJ/CSLL/CPP: 42.400 × 2,02% = 856,480000 (Soma: 1.696,00)',
    arquivoTesteProtecao: 'src/lib/art12Sn.test.ts (linhas 73-95)',
    pendenciasConhecidas:
      'Frações dos Anexos II–V em 2027–2028 marcadas como PENDENTE DE CONFIRMAÇÃO aguardando resolução CGSN.',
    status: 'CHANCELADO_ADRI',
  },
  {
    id: 'credito_839_52',
    titulo: 'Crédito Proporcional do Adquirente (839,52)',
    valorFormatado: 'R$ 839,520000',
    artigoLei: 'LC 123/2006 Art. 23 §1º/§2º + LC 214/2025 Art. 47 §9º II',
    formulaComNumeros: 'ICMS (576,64) + CBS (259,9968) + IBS (2,8832) = 839,520000 (1,98% da nota)',
    arquivoTesteProtecao: 'src/lib/art12Sn.test.ts (linhas 99-106)',
    pendenciasConhecidas:
      'Adquirente do Simples Nacional não apropria crédito (art. 47). Crédito só aproveitável por LP/LR.',
    status: 'CHANCELADO_ADRI',
  },
  {
    id: 'unitario_1385_35',
    titulo: 'Custo Unitário Líquido (1.385,35)',
    valorFormatado: 'R$ 1.385,349333... → R$ 1.385,35',
    artigoLei: 'LC 214/2025 Art. 12 §2º e Art. 25 §1º II',
    formulaComNumeros:
      '(Receita Bruta R$ 42.400,00 − Crédito Efetivo R$ 839,52) ÷ 30 unidades = 1.385,349333... (half-up 1.385,35)',
    arquivoTesteProtecao:
      'src/lib/art12Sn.test.ts (linhas 108-114) e comparadorFornecedoresSN.test.ts',
    pendenciasConhecidas:
      'Precisão de 6 decimais estrita em cálculos intermediários e arredondamento comercial na exibição.',
    status: 'CHANCELADO_ADRI',
  },
  {
    id: 'baseline_2026',
    titulo: 'Baseline 2026 (Crédito só ICMS 576,64 / Custo 41.823,36)',
    valorFormatado: 'R$ 41.823,360000',
    artigoLei: 'LC 214/2025 Art. 348, III, "c"',
    formulaComNumeros:
      'Crédito 2026: 42.400 × 1,36% (fração ICMS) = 576,64. CBS e IBS = 0,00 em 2026.',
    arquivoTesteProtecao: 'src/lib/art12Sn.test.ts (linhas 116-121)',
    pendenciasConhecidas:
      'Fase de teste sem CBS/IBS para optantes do Simples Nacional no exercício de 2026.',
    status: 'CHANCELADO_ADRI',
  },
]

export const DossieRastreabilidadeOuroSection: React.FC = () => {
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  return (
    <div className="space-y-5 rounded-2xl border border-emerald-500/30 bg-[#06120e] p-5 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </span>
            <h3 className="text-base font-bold text-white font-mono">
              Dossiê de Rastreabilidade do Ouro (Governança & Fundamentação Legal)
            </h3>
            <Badge className="bg-emerald-500 text-slate-950 font-mono font-bold text-[10px]">
              CHANCELADO PELA CEO (ADRI)
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Premissa permanente: Nenhum valor de ouro é inventado. Cada número canônico do motor
            tributário é protegido por testes de blindagem, referenciado ao artigo de lei
            correspondente e transparente quanto a pendências de regulamentação.
          </p>
        </div>
      </div>

      {/* Grid de Cards dos Valores de Ouro LADO A LADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ITENS_RASTREABILIDADE_OURO.map((item) => {
          const isExpandido = expandidoId === item.id
          return (
            <Card
              key={item.id}
              className="border border-emerald-500/25 bg-[#040c09] rounded-xl flex flex-col justify-between hover:border-emerald-500/40 transition-colors"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-[10px] font-mono text-emerald-300"
                  >
                    {item.status === 'CHANCELADO_ADRI'
                      ? 'Chancelado pela Adri'
                      : 'Pendente de Confirmação'}
                  </Badge>
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <FileCode className="h-3 w-3 text-emerald-400" />
                    {item.arquivoTesteProtecao.split('/')[2]}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-white font-mono mt-1">
                  {item.titulo}
                </CardTitle>
                <div className="text-base font-mono font-extrabold text-emerald-400 mt-0.5">
                  {item.valorFormatado}
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#06140f] border border-emerald-500/15 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                    <Scale className="h-3 w-3 text-emerald-400" />
                    <span>Dispositivo Legal:</span>
                  </div>
                  <p className="text-[11px] text-emerald-200">{item.artigoLei}</p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandidoId(isExpandido ? null : item.id)}
                  className="w-full text-[11px] font-mono text-slate-300 hover:text-white border border-emerald-500/15 h-7 justify-between"
                >
                  <span>
                    {isExpandido ? 'Ocultar Memória Detalhada' : 'Ver Fórmula com Números Reais'}
                  </span>
                  {isExpandido ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>

                {isExpandido && (
                  <div className="space-y-2 pt-1 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 font-bold block">Fórmula Aplicada:</span>
                      <p className="text-slate-200 bg-slate-900/80 p-2 rounded border border-slate-800">
                        {item.formulaComNumeros}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Pendências e Observações:
                      </span>
                      <p className="text-slate-400">{item.pendenciasConhecidas}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
