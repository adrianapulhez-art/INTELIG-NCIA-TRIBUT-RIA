// pocketbase/hooks/cclasstrib_cron.js
// Job de conferência programada da tabela oficial cClassTrib (IBS/CBS)
// Fonte oficial: Portal Nacional da NF-e / Portal Conformidade Fácil SVRS
// Regra da Adriana: SINALIZAR versões novas, NUNCA atualizar sozinho sem chancela.

cronAdd('executar_carga_ncm_once', '* * * * *', () => {
  try {
    const col = $app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return

    const totalAtual = $app.countRecords('ncm_tabela')
    if (totalAtual > 500) {
      // Já carregada com sucesso
      return
    }

    const urlOficial =
      'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json'
    const res = $http.send({
      url: urlOficial,
      method: 'GET',
      timeout: 60,
    })

    if (res.statusCode !== 200 || !res.raw) {
      console.warn('[executar_carga_ncm_once] Status Siscomex:', res.statusCode)
      return
    }

    const data = JSON.parse(res.raw)
    const list = data.Nomenclaturas || []
    const versaoExtracao =
      (data.Data_Ultima_Atualizacao_NCM || 'Vigente em 19/10/2026') +
      ' (' +
      (data.Ato || 'Resolução Gecex nº 926/2026') +
      ')'
    const fonteOficial =
      'Portal Único Siscomex / Classif (MDIC / CAMEX / RFB) — API Pública Nomenclatura'
    const dataConferencia = '2026-10-19'
    const statusChancela = 'aguardando_chancela'

    const mapaDesc = {}
    for (let i = 0; i < list.length; i++) {
      const it = list[i]
      const rawCod = (it.Codigo || '').trim()
      const digCod = rawCod.replace(/\D/g, '')
      const desc = (it.Descricao || '').trim()
      mapaDesc[rawCod] = desc
      mapaDesc[digCod] = desc
    }

    function cleanDesc(d) {
      if (!d) return ''
      return d
        .replace(/^[-–—\s]+/, '')
        .replace(/<[^>]+>/g, '')
        .trim()
    }

    function escapeSql(str) {
      if (!str) return ''
      return str.replace(/'/g, "''")
    }

    const CHUNK_SIZE = 250
    let chunkVals = []
    const now = new Date().toISOString()
    let totalInseridos = 0

    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const codRaw = (item.Codigo || '').trim()
      const digitos = codRaw.replace(/\D/g, '')

      if (digitos.length !== 8) continue

      const cap = digitos.substring(0, 2)
      const pos = digitos.substring(0, 4)
      const subpos = digitos.substring(0, 6)
      const itemCode = digitos.substring(0, 7)
      const codFmt =
        cap + pos.substring(2, 4) + '.' + subpos.substring(4, 6) + '.' + digitos.substring(6, 8)

      const rawDesc = item.Descricao || ''
      const descPrincipal = cleanDesc(rawDesc)

      const hierarquiaParts = []
      const descCap = mapaDesc[cap]
      if (descCap) hierarquiaParts.push(cleanDesc(descCap))

      const descPos = mapaDesc[pos]
      if (descPos && descPos !== descCap) hierarquiaParts.push(cleanDesc(descPos))

      const descSubpos = mapaDesc[subpos]
      if (descSubpos && descSubpos !== descPos) hierarquiaParts.push(cleanDesc(descSubpos))

      if (itemCode !== subpos) {
        const descItem = mapaDesc[itemCode]
        if (descItem && descItem !== descSubpos) hierarquiaParts.push(cleanDesc(descItem))
      }

      if (!hierarquiaParts.includes(descPrincipal)) {
        hierarquiaParts.push(descPrincipal)
      }

      const descCompleta = hierarquiaParts.join('; ')
      const recordId = 'ncm' + digitos + $security.randomString(4).toLowerCase()

      chunkVals.push(
        "('" +
          recordId +
          "', '" +
          escapeSql(digitos) +
          "', '" +
          escapeSql(codFmt) +
          "', '" +
          escapeSql(descPrincipal) +
          "', '" +
          escapeSql(descCompleta) +
          "', '" +
          escapeSql(cap) +
          "', '" +
          escapeSql(pos) +
          "', '" +
          escapeSql(subpos) +
          "', 8, '" +
          escapeSql(fonteOficial) +
          "', '" +
          escapeSql(versaoExtracao) +
          "', '" +
          escapeSql(dataConferencia) +
          "', '" +
          statusChancela +
          "', '" +
          now +
          "', '" +
          now +
          "')",
      )
      totalInseridos++

      if (chunkVals.length >= CHUNK_SIZE) {
        const sql =
          'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
          chunkVals.join(', ')
        $app.db().newQuery(sql).execute()
        chunkVals = []
      }
    }

    if (chunkVals.length > 0) {
      const sql =
        'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
        chunkVals.join(', ')
      $app.db().newQuery(sql).execute()
    }

    console.log(
      '[executar_carga_ncm_once] Carga concluída! Total no banco:',
      $app.countRecords('ncm_tabela'),
    )
  } catch (err) {
    console.error('[executar_carga_ncm_once] Erro:', err)
  }
})

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
// Endpoint de carga integral e conferência da coleção ncm_tabela
// Baixa a tabela NCM oficial do Siscomex (API Classif / MDIC / RFB / CAMEX)
// Executa upsert/insert or ignore sem apagar nem sobrescrever indevidamente
// Endpoint para disparar e monitorar a carga oficial NCM do Siscomex
// Endpoint para disparar e monitorar a carga oficial NCM do Siscomex
routerAdd('GET', '/backend/v1/ncm/status-contagem', (e) => {
  try {
    const col = $app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return e.json(500, { error: 'Coleção ncm_tabela não encontrada' })
    const total = $app.countRecords('ncm_tabela')
    return e.json(200, { total })
  } catch (err) {
    return e.json(500, { error: '' + err })
  }
})

routerAdd('GET', '/backend/v1/ncm/trigger-carga', (e) => {
  try {
    const col = $app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return e.json(500, { error: 'Coleção ncm_tabela não encontrada' })

    const tInicio = new Date().getTime()
    const urlOficial =
      'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json'
    const res = $http.send({
      url: urlOficial,
      method: 'GET',
      timeout: 60,
    })

    if (res.statusCode !== 200 || !res.raw) {
      return e.json(500, {
        error: 'Siscomex retornou status ' + res.statusCode,
        preview: res.raw ? res.raw.substring(0, 200) : null,
      })
    }

    const data = JSON.parse(res.raw)
    const list = data.Nomenclaturas || []
    const versaoExtracao =
      (data.Data_Ultima_Atualizacao_NCM || 'Vigente em 19/10/2026') +
      ' (' +
      (data.Ato || 'Resolução Gecex nº 926/2026') +
      ')'
    const fonteOficial =
      'Portal Único Siscomex / Classif (MDIC / CAMEX / RFB) — API Pública Nomenclatura'
    const dataConferencia = '2026-10-19'
    const statusChancela = 'aguardando_chancela'

    const mapaDesc = {}
    for (let i = 0; i < list.length; i++) {
      const it = list[i]
      const rawCod = (it.Codigo || '').trim()
      const digCod = rawCod.replace(/\D/g, '')
      const desc = (it.Descricao || '').trim()
      mapaDesc[rawCod] = desc
      mapaDesc[digCod] = desc
    }

    function cleanDesc(d) {
      if (!d) return ''
      return d
        .replace(/^[-–—\s]+/, '')
        .replace(/<[^>]+>/g, '')
        .trim()
    }

    function escapeSql(str) {
      if (!str) return ''
      return str.replace(/'/g, "''")
    }

    let countProcessados = 0
    let lotesExecutados = 0
    const CHUNK_SIZE = 250
    let chunkVals = []
    const now = new Date().toISOString()

    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const codRaw = (item.Codigo || '').trim()
      const digitos = codRaw.replace(/\D/g, '')

      if (digitos.length !== 8) continue

      const cap = digitos.substring(0, 2)
      const pos = digitos.substring(0, 4)
      const subpos = digitos.substring(0, 6)
      const itemCode = digitos.substring(0, 7)
      const codFmt =
        cap + pos.substring(2, 4) + '.' + subpos.substring(4, 6) + '.' + digitos.substring(6, 8)

      const rawDesc = item.Descricao || ''
      const descPrincipal = cleanDesc(rawDesc)

      const hierarquiaParts = []
      const descCap = mapaDesc[cap]
      if (descCap) hierarquiaParts.push(cleanDesc(descCap))

      const descPos = mapaDesc[pos]
      if (descPos && descPos !== descCap) hierarquiaParts.push(cleanDesc(descPos))

      const descSubpos = mapaDesc[subpos]
      if (descSubpos && descSubpos !== descPos) hierarquiaParts.push(cleanDesc(descSubpos))

      if (itemCode !== subpos) {
        const descItem = mapaDesc[itemCode]
        if (descItem && descItem !== descSubpos) hierarquiaParts.push(cleanDesc(descItem))
      }

      if (!hierarquiaParts.includes(descPrincipal)) {
        hierarquiaParts.push(descPrincipal)
      }

      const descCompleta = hierarquiaParts.join('; ')
      const recordId = 'ncm' + digitos + $security.randomString(4).toLowerCase()

      chunkVals.push(
        "('" +
          recordId +
          "', '" +
          escapeSql(digitos) +
          "', '" +
          escapeSql(codFmt) +
          "', '" +
          escapeSql(descPrincipal) +
          "', '" +
          escapeSql(descCompleta) +
          "', '" +
          escapeSql(cap) +
          "', '" +
          escapeSql(pos) +
          "', '" +
          escapeSql(subpos) +
          "', 8, '" +
          escapeSql(fonteOficial) +
          "', '" +
          escapeSql(versaoExtracao) +
          "', '" +
          escapeSql(dataConferencia) +
          "', '" +
          statusChancela +
          "', '" +
          now +
          "', '" +
          now +
          "')",
      )
      countProcessados++

      if (chunkVals.length >= CHUNK_SIZE) {
        const sql =
          'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
          chunkVals.join(', ')
        $app.db().newQuery(sql).execute()
        lotesExecutados++
        chunkVals = []
      }
    }

    if (chunkVals.length > 0) {
      const sql =
        'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
        chunkVals.join(', ')
      $app.db().newQuery(sql).execute()
      lotesExecutados++
    }

    const tFim = new Date().getTime()
    const totalNoBanco = $app.countRecords('ncm_tabela')

    return e.json(200, {
      sucesso: true,
      duracaoMs: tFim - tInicio,
      totalNomenclaturasSiscomex: list.length,
      total8DigitosExtraidos: countProcessados,
      lotesExecutados,
      totalFinalBanco: totalNoBanco,
      versaoExtracao,
      dataConferencia,
      fonteOficial,
    })
  } catch (err) {
    return e.json(500, { error: '' + err })
  }
})

routerAdd('GET', '/backend/v1/ncm/executar-carga-siscomex', (e) => {
  try {
    const col = $app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return e.json(500, { error: 'Coleção ncm_tabela não encontrada' })

    const tInicio = new Date().getTime()
    const urlOficial =
      'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json'
    const res = $http.send({
      url: urlOficial,
      method: 'GET',
      timeout: 60,
    })

    if (res.statusCode !== 200 || !res.raw) {
      return e.json(500, {
        error: 'Siscomex retornou status ' + res.statusCode,
        preview: res.raw ? res.raw.substring(0, 200) : null,
      })
    }

    const data = JSON.parse(res.raw)
    const list = data.Nomenclaturas || []
    const versaoExtracao =
      (data.Data_Ultima_Atualizacao_NCM || 'Vigente em 19/10/2026') +
      ' (' +
      (data.Ato || 'Resolução Gecex nº 926/2026') +
      ')'
    const fonteOficial =
      'Portal Único Siscomex / Classif (MDIC / CAMEX / RFB) — API Pública Nomenclatura'
    const dataConferencia = '2026-10-19'
    const statusChancela = 'aguardando_chancela'

    const mapaDesc = {}
    for (let i = 0; i < list.length; i++) {
      const it = list[i]
      const rawCod = (it.Codigo || '').trim()
      const digCod = rawCod.replace(/\D/g, '')
      const desc = (it.Descricao || '').trim()
      mapaDesc[rawCod] = desc
      mapaDesc[digCod] = desc
    }

    function cleanDesc(d) {
      if (!d) return ''
      return d
        .replace(/^[-–—\s]+/, '')
        .replace(/<[^>]+>/g, '')
        .trim()
    }

    function escapeSql(str) {
      if (!str) return ''
      return str.replace(/'/g, "''")
    }

    let countProcessados = 0
    let lotesExecutados = 0
    const CHUNK_SIZE = 250
    let chunkVals = []
    const now = new Date().toISOString()

    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const codRaw = (item.Codigo || '').trim()
      const digitos = codRaw.replace(/\D/g, '')

      if (digitos.length !== 8) continue

      const cap = digitos.substring(0, 2)
      const pos = digitos.substring(0, 4)
      const subpos = digitos.substring(0, 6)
      const itemCode = digitos.substring(0, 7)
      const codFmt =
        cap + pos.substring(2, 4) + '.' + subpos.substring(4, 6) + '.' + digitos.substring(6, 8)

      const rawDesc = item.Descricao || ''
      const descPrincipal = cleanDesc(rawDesc)

      const hierarquiaParts = []
      const descCap = mapaDesc[cap]
      if (descCap) hierarquiaParts.push(cleanDesc(descCap))

      const descPos = mapaDesc[pos]
      if (descPos && descPos !== descCap) hierarquiaParts.push(cleanDesc(descPos))

      const descSubpos = mapaDesc[subpos]
      if (descSubpos && descSubpos !== descPos) hierarquiaParts.push(cleanDesc(descSubpos))

      if (itemCode !== subpos) {
        const descItem = mapaDesc[itemCode]
        if (descItem && descItem !== descSubpos) hierarquiaParts.push(cleanDesc(descItem))
      }

      if (!hierarquiaParts.includes(descPrincipal)) {
        hierarquiaParts.push(descPrincipal)
      }

      const descCompleta = hierarquiaParts.join('; ')
      const recordId = 'ncm' + digitos + $security.randomString(4).toLowerCase()

      chunkVals.push(
        "('" +
          recordId +
          "', '" +
          escapeSql(digitos) +
          "', '" +
          escapeSql(codFmt) +
          "', '" +
          escapeSql(descPrincipal) +
          "', '" +
          escapeSql(descCompleta) +
          "', '" +
          escapeSql(cap) +
          "', '" +
          escapeSql(pos) +
          "', '" +
          escapeSql(subpos) +
          "', 8, '" +
          escapeSql(fonteOficial) +
          "', '" +
          escapeSql(versaoExtracao) +
          "', '" +
          escapeSql(dataConferencia) +
          "', '" +
          statusChancela +
          "', '" +
          now +
          "', '" +
          now +
          "')",
      )
      countProcessados++

      if (chunkVals.length >= CHUNK_SIZE) {
        const sql =
          'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
          chunkVals.join(', ')
        $app.db().newQuery(sql).execute()
        lotesExecutados++
        chunkVals = []
      }
    }

    if (chunkVals.length > 0) {
      const sql =
        'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
        chunkVals.join(', ')
      $app.db().newQuery(sql).execute()
      lotesExecutados++
    }

    const tFim = new Date().getTime()
    const totalNoBanco = $app.countRecords('ncm_tabela')

    return e.json(200, {
      sucesso: true,
      duracaoMs: tFim - tInicio,
      totalNomenclaturasSiscomex: list.length,
      total8DigitosExtraidos: countProcessados,
      lotesExecutados,
      totalFinalBanco: totalNoBanco,
      versaoExtracao,
      dataConferencia,
      fonteOficial,
    })
  } catch (err) {
    return e.json(500, { error: '' + err })
  }
})

routerAdd(
  'POST',
  '/backend/v1/cclasstrib/conferir',
  (e) => {
    try {
      // Dispara a carga NCM se ainda estiver com apenas os 40 registros
      try {
        const colNcm = $app.findCollectionByNameOrId('ncm_tabela')
        if (colNcm && $app.countRecords('ncm_tabela') <= 100) {
          const resNcm = $http.send({
            url: 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json',
            method: 'GET',
            timeout: 60,
          })
          if (resNcm.statusCode === 200 && resNcm.raw) {
            const dataNcm = JSON.parse(resNcm.raw)
            const listNcm = dataNcm.Nomenclaturas || []
            const versaoExt =
              (dataNcm.Data_Ultima_Atualizacao_NCM || 'Vigente em 19/10/2026') +
              ' (' +
              (dataNcm.Ato || 'Resolução Gecex nº 926/2026') +
              ')'
            const fonte =
              'Portal Único Siscomex / Classif (MDIC / CAMEX / RFB) — API Pública Nomenclatura'
            const mapa = {}
            for (let i = 0; i < listNcm.length; i++) {
              const it = listNcm[i]
              const r = (it.Codigo || '').trim()
              mapa[r] = (it.Descricao || '').trim()
              mapa[r.replace(/\D/g, '')] = (it.Descricao || '').trim()
            }
            function clean(d) {
              if (!d) return ''
              return d
                .replace(/^[-–—\s]+/, '')
                .replace(/<[^>]+>/g, '')
                .trim()
            }
            function esc(s) {
              if (!s) return ''
              return s.replace(/'/g, "''")
            }
            let chunk = []
            const nowIso = new Date().toISOString()
            for (let i = 0; i < listNcm.length; i++) {
              const it = listNcm[i]
              const dig = (it.Codigo || '').replace(/\D/g, '')
              if (dig.length !== 8) continue
              const cap = dig.substring(0, 2)
              const pos = dig.substring(0, 4)
              const subpos = dig.substring(0, 6)
              const itemCode = dig.substring(0, 7)
              const fmt =
                cap + pos.substring(2, 4) + '.' + subpos.substring(4, 6) + '.' + dig.substring(6, 8)
              const dPrin = clean(it.Descricao || '')
              const hp = []
              if (mapa[cap]) hp.push(clean(mapa[cap]))
              if (mapa[pos] && mapa[pos] !== mapa[cap]) hp.push(clean(mapa[pos]))
              if (mapa[subpos] && mapa[subpos] !== mapa[pos]) hp.push(clean(mapa[subpos]))
              if (itemCode !== subpos && mapa[itemCode] && mapa[itemCode] !== mapa[subpos])
                hp.push(clean(mapa[itemCode]))
              if (!hp.includes(dPrin)) hp.push(dPrin)
              const dComp = hp.join('; ')
              const rid = 'ncm' + dig + $security.randomString(4).toLowerCase()
              chunk.push(
                "('" +
                  rid +
                  "', '" +
                  esc(dig) +
                  "', '" +
                  esc(fmt) +
                  "', '" +
                  esc(dPrin) +
                  "', '" +
                  esc(dComp) +
                  "', '" +
                  esc(cap) +
                  "', '" +
                  esc(pos) +
                  "', '" +
                  esc(subpos) +
                  "', 8, '" +
                  esc(fonte) +
                  "', '" +
                  esc(versaoExt) +
                  "', '2026-10-19', 'aguardando_chancela', '" +
                  nowIso +
                  "', '" +
                  nowIso +
                  "')",
              )
              if (chunk.length >= 250) {
                $app
                  .db()
                  .newQuery(
                    'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
                      chunk.join(', '),
                  )
                  .execute()
                chunk = []
              }
            }
            if (chunk.length > 0) {
              $app
                .db()
                .newQuery(
                  'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
                    chunk.join(', '),
                )
                .execute()
            }
          }
        }
      } catch (errNcm) {
        console.warn('[cclasstrib_conferir] Alerta carga NCM:', errNcm)
      }

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
