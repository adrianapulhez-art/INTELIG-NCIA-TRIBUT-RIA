import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, ArrowUpRight, ShieldCheck, Scale, Cpu } from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  onRequestAccess: () => void
  onLoginClick?: () => void
}

export function Header({ onRequestAccess, onLoginClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'O Problema', href: '#problema' },
    { label: 'A Solução', href: '#solucao' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Showcase Técnico', href: '#showcase' },
    { label: 'Mercado', href: '#mercado' },
    { label: 'Tese', href: '#tese' },
    { label: 'Skip Motor', href: '#skip' },
    { label: 'Cronograma', href: '#cronograma' },
    { label: 'FAQ', href: '#faq' },
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0a0f18]/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20 py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-slate-950 text-base tracking-wider font-mono">
                IT
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                IT — Inteligência Tributária
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-medium uppercase">
                Decodificando a Reforma
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-xs font-medium text-slate-300 hover:text-white transition-colors tracking-wide py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LC 214/2025 Ativa
            </div>

            {/* Botão ENTRAR / Área logada imediatamente à esquerda de Solicitar Acesso */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="px-3.5 py-2 text-xs font-medium tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                title={`Conectado como ${user?.name || user?.email}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ACESSAR APP
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="px-3.5 py-2 text-xs font-semibold tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer uppercase font-sans"
              >
                ENTRAR
              </button>
            )}

            <Button
              onClick={onRequestAccess}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm px-4 sm:px-5 h-9 sm:h-10 rounded-md shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Solicitar Acesso
            </Button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="text-xs font-semibold tracking-wider text-emerald-400 px-2 py-1 uppercase"
              >
                App
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="text-xs font-semibold tracking-wider text-slate-300 hover:text-white px-2 py-1 uppercase"
              >
                ENTRAR
              </button>
            )}

            <Button
              onClick={onRequestAccess}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 px-3"
            >
              Acesso
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0a0f18]/95 backdrop-blur-xl border-b border-slate-800 px-4 pt-3 pb-6 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-medium text-slate-300 hover:text-emerald-400 py-1.5 border-b border-slate-800/50"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false)
                  if (isAuthenticated) {
                    navigate('/app')
                  } else if (onLoginClick) {
                    onLoginClick()
                  }
                }}
                className="w-full border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 font-semibold text-sm h-10 uppercase tracking-wider"
              >
                {isAuthenticated ? 'Acessar Plataforma' : 'ENTRAR'}
              </Button>
              <Button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onRequestAccess()
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm h-10"
              >
                Solicitar Acesso
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export function Footer({ onRequestAccess }: HeaderProps) {
  return (
    <footer className="bg-[#070b12] border-t border-slate-800/80 text-slate-400 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/70">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md">
                <span className="font-extrabold text-slate-950 text-sm font-mono">IT</span>
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                IT — Inteligência Tributária
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Plataforma de inteligência tributária enterprise. Decodificamos a Reforma Tributária
              (EC 132 e LC 214/2025) para calibrar preços de venda e comparar regimes com precisão
              matemática.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> LGPD Compliant
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                <Scale className="w-3 h-3 text-amber-400" /> LC 214/2025
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
                <Cpu className="w-3 h-3" /> Powered by Skip
              </span>
            </div>
          </div>

          {/* Regimes & Cálculos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Regimes Analisados
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">
                  Simples Nacional (Anexos I-V)
                </span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">Simples Híbrido 2026</span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">Lucro Presumido</span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">Lucro Real</span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">
                  Pessoa Física Autônomo
                </span>
              </li>
            </ul>
          </div>

          {/* Tributos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Tributos & Normas
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">CBS (0,9% teste)</span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">IBS (0,1% teste)</span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">
                  ICMS & ISS em transição
                </span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">PIS/Cofins até 2027</span>
              </li>
              <li>
                <span className="hover:text-emerald-400 cursor-pointer">IRPJ, CSLL e IRPF</span>
              </li>
            </ul>
          </div>

          {/* Contato & Acesso */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Acesso à Plataforma
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solicite acesso antecipado para empresas, consultorias e departamentos fiscais.
            </p>
            <Button
              onClick={onRequestAccess}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9"
            >
              Solicitar Acesso
            </Button>
            <p className="text-[11px] text-slate-500 font-mono">
              Ambiente atualizado conforme Resoluções CGSN 190/191 de 2026.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} IT — Inteligência Tributária. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>EC 132/2023</span>
            <span>•</span>
            <span>LC 214/2025</span>
            <span>•</span>
            <span>Skip AI Builder</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
