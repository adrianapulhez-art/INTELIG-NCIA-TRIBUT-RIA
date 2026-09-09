/**
 * Utilitário para manipulação, validação e compressão de imagens para o assistente tributário.
 * Limita imagens a tamanhos razoáveis (máx ~4MB antes da compressão, redimensionamento para
 * largura/altura máxima de 1600px e formato JPEG/WebP com qualidade 0.85 para envio rápido).
 */

export interface ProcessedImage {
  data_url: string
  name: string
  size: number
  type: string
  width?: number
  height?: number
}

const MAX_ORIGINAL_BYTES = 4 * 1024 * 1024 // 4 MB
const MAX_DIMENSION = 1600
const OUTPUT_QUALITY = 0.85

export async function processChatImageFile(file: File): Promise<ProcessedImage> {
  // Valida tipo MIME
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida (use PNG, JPG, JPEG ou WebP).')
  }

  // Valida tamanho original
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('A imagem excede o tamanho máximo permitido de 4 MB. Escolha uma imagem menor.')
  }

  // Carrega e comprime/redimensiona via Canvas se necessário
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Não foi possível decodificar a imagem.'))
      img.onload = () => {
        try {
          let { width, height } = img

          // Redimensiona proporcionalmente se exceder a dimensão máxima
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width)
              width = MAX_DIMENSION
            } else {
              width = Math.round((width * MAX_DIMENSION) / height)
              height = MAX_DIMENSION
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            // Fallback direto para o data URL original
            resolve({
              data_url: reader.result as string,
              name: file.name,
              size: file.size,
              type: file.type,
              width: img.width,
              height: img.height,
            })
            return
          }

          // Se for PNG transparente ou JPEG, preenche fundo branco ou desenha direto
          if (file.type === 'image/jpeg') {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, width, height)
          }
          ctx.drawImage(img, 0, 0, width, height)

          // Escolhe o formato de saída ideal: jpeg para fotos/documentos
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
          const dataUrl = canvas.toDataURL(outputType, OUTPUT_QUALITY)

          resolve({
            data_url: dataUrl,
            name: file.name,
            size: Math.round((dataUrl.length * 3) / 4), // tamanho aproximado em bytes
            type: outputType,
            width,
            height,
          })
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Erro ao processar imagem'))
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
