/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ncm_tabela')
    if (!col) return

    // Carga integral da tabela NCM oficial baixada do Siscomex
    // Regra da Adri: Idempotente (INSERT OR IGNORE via SQL), preserva os 40 canônicos já existentes
    console.log('[1738000009_carga_integral_ncm] Verificando estado da tabela ncm_tabela...')

    const totalAtual = app.countRecords('ncm_tabela')
    console.log('[1738000009_carga_integral_ncm] Total de registros em ncm_tabela:', totalAtual)

    // Se o banco ainda estiver vazio ou incompleto (< 500 registros), tenta ingerir da API oficial
    if (totalAtual <= 500) {
      const urls = [
        'https://val.portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json',
        'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json',
      ]
      let res = null
      for (let u = 0; u < urls.length; u++) {
        try {
          const tent = $http.send({
            url: urls[u],
            method: 'GET',
            timeout: 60,
            headers: {
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          })
          if (tent.statusCode === 200 && tent.raw) {
            res = tent
            break
          }
        } catch (_) {}
      }

      if (res && res.statusCode === 200 && res.raw) {
        const data = JSON.parse(res.raw)
        const list = data.Nomenclaturas || []
        const versaoExtracao =
          (data.Data_Ultima_Atualizacao_NCM || 'Vigente em 19/10/2026') +
          ' (' +
          (data.Ato || 'Resolução Gecex nº 812/2025') +
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

          if (chunkVals.length >= CHUNK_SIZE) {
            const sql =
              'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
              chunkVals.join(', ')
            app.db().newQuery(sql).execute()
            chunkVals = []
          }
        }

        if (chunkVals.length > 0) {
          const sql =
            'INSERT OR IGNORE INTO ncm_tabela (id, codigo_ncm, codigo_formatado, descricao, descricao_completa, capitulo, posicao, subposicao, nivel, fonte_oficial, versao_extracao, data_conferencia, status_chancela, created, updated) VALUES ' +
            chunkVals.join(', ')
          app.db().newQuery(sql).execute()
        }

        console.log(
          '[1738000009_carga_integral_ncm] Ingestão concluída com sucesso! Total agora:',
          app.countRecords('ncm_tabela'),
        )
      }
    }
  },
  (app) => {
    // Reversão segura: deleteRule é null para integridade fiscal, não apaga dados
  },
)
