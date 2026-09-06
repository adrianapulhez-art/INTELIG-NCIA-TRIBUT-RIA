import React from 'react'
import { ShieldCheck, Lock, FileCheck, RefreshCw, Eye } from 'lucide-react'

export function SecuritySection() {
  const securityBullets = [
    { title: 'Criptografia ponta a ponta', icon: Lock },
    { title: 'Dados tributários protegidos', icon: ShieldCheck },
    { title: 'Conformidade com LGPD', icon: FileCheck },
    { title: 'Atualização automática de normas', icon: RefreshCw },
    { title: 'Auditoria de cálculos', icon: Eye },
  ]

  return (
    <section className="py-20 md:py-28 relative bg-[#0b0f17] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Segurança
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Segurança de nível enterprise
          </h2>
        </div>

        {/* 5 horizontal or grid security cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {securityBullets.map((b, idx) => {
            const Icon = b.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                  {b.title}
                </h3>
              </div>
            )
          })}
        </div>

        {/* Bottom explanation */}
        <div className="mt-10 p-6 sm:p-8 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-300 text-sm sm:text-base leading-relaxed">
          A IT monitora continuamente as normas da Receita Federal, CGIBS e CGSN para manter
          cálculos sempre atualizados. Precisão regulatória não é opcional. É arquitetural.
        </div>
      </div>
    </section>
  )
}
