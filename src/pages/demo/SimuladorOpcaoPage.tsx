import React from 'react'
import { DemoLayout } from '@/components/demo/DemoLayout'
import { SimuladorOpcaoModule } from '@/components/demo/SimuladorOpcaoModule'

export default function SimuladorOpcaoPage() {
  return (
    <DemoLayout currentTab="simulador-opcao">
      <SimuladorOpcaoModule />
    </DemoLayout>
  )
}
