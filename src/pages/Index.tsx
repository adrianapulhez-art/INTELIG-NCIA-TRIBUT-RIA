import React, { useState } from 'react'
import { Header, Footer } from '@/components/Navigation'
import { RequestAccessModal } from '@/components/RequestAccessModal'
import { HeroSection } from '@/components/sections/HeroSection'
import { ProblemSection } from '@/components/sections/ProblemSection'
import { SolutionSection } from '@/components/sections/SolutionSection'
import { HowItWorksSection } from '@/components/sections/HowItWorksSection'
import { ShowcaseSection } from '@/components/sections/ShowcaseSection'
import { MarketSection } from '@/components/sections/MarketSection'
import { InvestmentThesisSection } from '@/components/sections/InvestmentThesisSection'
import { BuiltOnSkipSection } from '@/components/sections/BuiltOnSkipSection'
import { SecuritySection } from '@/components/sections/SecuritySection'
import { TimelineSection } from '@/components/sections/TimelineSection'
import { FinalCtaSection } from '@/components/sections/FinalCtaSection'
import { FaqSection } from '@/components/sections/FaqSection'

export default function Index() {
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpenModal = () => {
    setModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Navigation Header */}
      <Header onRequestAccess={handleOpenModal} />

      {/* Main Landing Page Content */}
      <main>
        {/* Hero Section */}
        <HeroSection onRequestAccess={handleOpenModal} />

        {/* O problema */}
        <ProblemSection />

        {/* A solução */}
        <SolutionSection onRequestAccess={handleOpenModal} />

        {/* Como funciona */}
        <HowItWorksSection />

        {/* Showcase técnico */}
        <ShowcaseSection />

        {/* Mercado */}
        <MarketSection onRequestAccess={handleOpenModal} />

        {/* Tese de investimento */}
        <InvestmentThesisSection />

        {/* Construído no Skip */}
        <BuiltOnSkipSection />

        {/* Segurança */}
        <SecuritySection />

        {/* Cronograma */}
        <TimelineSection />

        {/* Final CTA */}
        <FinalCtaSection onRequestAccess={handleOpenModal} />

        {/* FAQ */}
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer onRequestAccess={handleOpenModal} />

      {/* Request Access Modal */}
      <RequestAccessModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
