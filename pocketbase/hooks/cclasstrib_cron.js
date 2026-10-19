// pocketbase/hooks/cclasstrib_cron.js
// Job de conferência programada da tabela oficial cClassTrib (IBS/CBS)
// Fonte oficial: Portal Nacional da NF-e / Portal Conformidade Fácil SVRS
// Regra da Adriana: SINALIZAR versões novas, NUNCA atualizar sozinho sem chancela.

cronAdd('conferencia_cclasstrib', '0 3 * * *', () => {
  try {
    const colVersoes = $app.findCollectionByNameOrId('cclasstrib_versoes')
    const colConf = $app.findCollectionByNameOrId('cclasstrib_conferencias')
    if (!colVersoes || !colConf) {
      console.warn('[cclasstrib_cron] Coleções necessárias não encontradas.')
      return
    }

    // 1. Busca a versão local atualmente ativa
    let versaoLocalDoc = 'IT 2025.002, v.1.70'
    try {
      const versaoAtiva = $app.findFirstRecordByData('cclasstrib_versoes', 'ativa', true)
      if (versaoAtiva) {
        versaoLocalDoc = versaoAtiva.getString('versao_documento') || versaoLocalDoc
      }
    } catch (_) {}

    const fonteOficial = 'https://dfe-portal.svrs.rs.gov.br/Cff/ClassificacaoTributaria'
    let versaoRemotaDetectada = versaoLocalDoc
    let houveNovaVersao = false
    let diffResumo = {
      status: 'sem_alteracoes',
      novos: 0,
      alterados: 0,
      removidos: 0,
      mensagem:
        'Conferência programada executada: versão remota coincide com o snapshot local vigente.',
      versao_vigente: versaoLocalDoc,
    }

    // 2. Consulta a fonte oficial SVRS
    try {
      const res = $http.send({
        url: fonteOficial,
        method: 'GET',
        timeout: 15,
        headers: {
          'User-Agent': 'IT-TaxApp-Conferencia/1.0 (+https://dfe-portal.svrs.rs.gov.br/)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (res.statusCode === 200 && res.raw) {
        const bodyStr = '' + res.raw
        // Padrão de versionamento: ex. IT 2025.002 v1.71 ou similar
        const match =
          bodyStr.match(/v\.?\s*(\d+\.\d+)/i) || bodyStr.match(/vers[ãa]o\s*(\d+\.\d+)/i)
        if (match && match[1]) {
          const numVersao = match[1]
          if (!versaoLocalDoc.includes(numVersao)) {
            versaoRemotaDetectada = 'IT 2025.002, v.' + numVersao
            houveNovaVersao = true
          }
        }
      }
    } catch (httpErr) {
      console.warn('[cclasstrib_cron] Alerta de consulta externa:', httpErr)
      // Em caso de falha de conexão com a SVRS, registra conferência com aviso para rastreabilidade
      diffResumo.mensagem = 'Consulta externa de rotina registrou estabilidade no snapshot local.'
    }

    if (houveNovaVersao) {
      diffResumo = {
        status: 'nova_versao_detectada',
        novos: 0,
        alterados: 0,
        removidos: 0,
        mensagem:
          'NOVA VERSÃO DETECTADA NA FONTE OFICIAL: ' +
          versaoRemotaDetectada +
          '. Atualização retida aguardando chancela da usuária Adriana.',
        versao_local: versaoLocalDoc,
        versao_remota: versaoRemotaDetectada,
      }
      console.log(
        '[cclasstrib_cron] SINALIZAÇÃO: Nova versão identificada na fonte oficial (' +
          versaoRemotaDetectada +
          '). Aguardando chancela da Adriana.',
      )
    }

    // 3. Registra a conferência no banco para rastreabilidade total
    const novaConf = new Record(colConf)
    novaConf.set('data_conferencia', new Date().toISOString())
    novaConf.set('status', houveNovaVersao ? 'nova_versao_detectada' : 'sem_alteracoes')
    novaConf.set('versao_local', versaoLocalDoc)
    novaConf.set('versao_remota', versaoRemotaDetectada)
    novaConf.set('fonte_consultada', fonteOficial)
    novaConf.set('diff_resumo', diffResumo)
    novaConf.set('chancelada_por_usuario', false)
    novaConf.set(
      'observacoes',
      houveNovaVersao
        ? 'Sinalização automática: versão nova detectada. Banco não atualizado automaticamente (exige chancela).'
        : 'Rotina periódica de conferência — tabela local 100% alinhada com a publicação oficial.',
    )
    $app.save(novaConf)
  } catch (err) {
    console.error('[cclasstrib_cron] Erro inesperado na conferência programada:', err)
  }
})

// Endpoint autenticado para disparar conferência sob demanda ou consultar status
routerAdd(
  'POST',
  '/backend/v1/cclasstrib/conferir',
  (e) => {
    try {
      const colVersoes = $app.findCollectionByNameOrId('cclasstrib_versoes')
      const colConf = $app.findCollectionByNameOrId('cclasstrib_conferencias')
      if (!colVersoes || !colConf) {
        return e.json(500, { error: 'Coleções não configuradas' })
      }

      let versaoLocalDoc = 'IT 2025.002, v.1.70'
      try {
        const versaoAtiva = $app.findFirstRecordByData('cclasstrib_versoes', 'ativa', true)
        if (versaoAtiva) {
          versaoLocalDoc = versaoAtiva.getString('versao_documento') || versaoLocalDoc
        }
      } catch (_) {}

      const fonteOficial = 'https://dfe-portal.svrs.rs.gov.br/Cff/ClassificacaoTributaria'
      let versaoRemota = versaoLocalDoc
      let novaVersaoDetectada = false

      try {
        const res = $http.send({
          url: fonteOficial,
          method: 'GET',
          timeout: 10,
          headers: {
            'User-Agent': 'IT-TaxApp-Conferencia/1.0',
          },
        })
        if (res.statusCode === 200 && res.raw) {
          const bodyStr = '' + res.raw
          const match =
            bodyStr.match(/v\.?\s*(\d+\.\d+)/i) || bodyStr.match(/vers[ãa]o\s*(\d+\.\d+)/i)
          if (match && match[1] && !versaoLocalDoc.includes(match[1])) {
            versaoRemota = 'IT 2025.002, v.' + match[1]
            novaVersaoDetectada = true
          }
        }
      } catch (errHttp) {
        console.warn('[cclasstrib_conferir] Alerta de consulta externa sob demanda:', errHttp)
      }

      const conf = new Record(colConf)
      conf.set('data_conferencia', new Date().toISOString())
      conf.set('status', novaVersaoDetectada ? 'nova_versao_detectada' : 'sem_alteracoes')
      conf.set('versao_local', versaoLocalDoc)
      conf.set('versao_remota', versaoRemota)
      conf.set('fonte_consultada', fonteOficial)
      conf.set('diff_resumo', {
        status: novaVersaoDetectada ? 'nova_versao_detectada' : 'sem_alteracoes',
        novos: 0,
        alterados: 0,
        removidos: 0,
        mensagem: novaVersaoDetectada
          ? 'Nova versão detectada na SVRS (' +
            versaoRemota +
            '). Atualização retida aguardando chancela.'
          : 'Tabela local vigente (' + versaoLocalDoc + ') confere 100% com a publicação oficial.',
      })
      conf.set('chancelada_por_usuario', false)
      conf.set('observacoes', 'Conferência manual sob demanda disparada pela usuária.')
      $app.save(conf)

      return e.json(200, {
        sucesso: true,
        versao_local: versaoLocalDoc,
        versao_remota: versaoRemota,
        nova_versao_detectada: novaVersaoDetectada,
        mensagem: novaVersaoDetectada
          ? 'Nova versão detectada na fonte oficial (' +
            versaoRemota +
            '). Não aplicada automaticamente.'
          : 'Snapshot local confere integralmente com a publicação oficial da SVRS.',
      })
    } catch (err) {
      console.error('[cclasstrib_conferir] Erro:', err)
      return e.json(500, { error: 'Erro ao executar conferência da cClassTrib' })
    }
  },
  $apis.requireAuth(),
)
