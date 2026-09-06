import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HelpCircle } from 'lucide-react'

export function FaqSection() {
  const faqs = [
    {
      question: 'Como a IT se diferencia de ERPs e contadores?',
      answer:
        'ERPs tradicionais e escritórios contábeis operam no registro retroativo e na emissão de guias do sistema vigente. A IT atua na inteligência prospectiva: calcula dinamicamente o impacto da Reforma Tributária (EC 132/LC 214) na formação do seu preço de venda, comparando todos os 4 regimes simultaneamente com simulação de transição e tomada de decisão estratégica em tempo real.',
    },
    {
      question: 'Qual é o modelo de negócio?',
      answer:
        'A plataforma opera no modelo SaaS B2B com planos dimensionados conforme o porte da empresa, volume de simulações tributárias e integrações corporativas via API para grandes contribuintes e consultorias tributárias.',
    },
    {
      question: 'Como a plataforma se mantém atualizada?',
      answer:
        'A IT possui motor de regras alimentado continuamente com as publicações do Diário Oficial da União, resoluções do Comitê Gestor do IBS (CGIBS), do Comitê Gestor do Simples Nacional (CGSN) e instruções normativas da Receita Federal do Brasil.',
    },
    {
      question: 'Qual é o tamanho do mercado?',
      answer:
        'São mais de 21 milhões de empresas no Brasil afetadas diretamente pela transição tributária, com mais de 100 mil empresas obrigadas a migrar de regime já nos primeiros anos e R$ 800 bilhões em incentivos fiscais em reavaliação.',
    },
    {
      question: 'A IT é apenas para tributação?',
      answer:
        'A IT é a primeira aplicação vertical especializada construída sobre o Skip AI Builder. Ela resolve tributação e precificação, servindo como showcase de soluções de inteligência para outras áreas complexas como conformidade trabalhista, governança e regulação de capitais.',
    },
    {
      question: 'Qual é o cronograma de implantação?',
      answer:
        'A plataforma já está ativa para simulações das alíquotas teste de CBS (0,9%) e IBS (0,1%) de 2026, com módulos pré-configurados para a transição do PIS/Cofins em 2027 até a vigência plena do novo IVA dual em 2033.',
    },
  ]

  return (
    <section id="faq" className="py-20 md:py-28 relative bg-[#090d15] border-t border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-slate-800 bg-slate-900/60 rounded-xl px-6 data-[state=open]:border-emerald-500/30 transition-all"
            >
              <AccordionTrigger className="text-left text-base sm:text-lg font-bold text-white hover:text-emerald-400 hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-slate-300 leading-relaxed pb-5 pt-1">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
