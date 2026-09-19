import React from 'react'
import { Layers } from 'lucide-react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { PageHero } from '@/components/demo/PageHero'

export function ReformaPage() {
  return (
    <DemoLayout currentTab="reforma">
      <div className="space-y-6">
        {/* PageHero no padrão visual IT / Adapta */}
        <PageHero
          title={
            <span>
              REFORMA TRIBUTÁRIA — <span className="text-emerald-400">IBS/CBS</span>
            </span>
          }
          subtitle="Emenda Constitucional 132/2023 & Lei Complementar 214/2025: Cronograma de Transição 2026–2033, alíquotas editáveis, precificação por fora e plano de voo comparativo."
          badge="ETAPA 5 · TRANSIÇÃO TRIBUTÁRIA COMPLETA"
          icon={Layers}
        />
      </div>
    </DemoLayout>
  )
}

export default ReformaPage
