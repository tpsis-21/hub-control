/**
 * Script para substituir logs de debug por sistema de logging de produção
 * 
 * Este script automatiza a substituição de console.log, console.debug, etc.
 * pelo sistema de logging estruturado.
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Padrões de substituição
const replacements = [
  // console.log simples
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: 'logger.debug($1, undefined, "DEBUG")'
  },
  // console.debug
  {
    pattern: /console\.debug\(([^)]+)\)/g,
    replacement: 'logger.debug($1, undefined, "DEBUG")'
  },
  // console.info
  {
    pattern: /console\.info\(([^)]+)\)/g,
    replacement: 'logger.info($1, undefined, "INFO")'
  },
  // console.warn (exceto quando seguido de error)
  {
    pattern: /console\.warn\(([^)]+)\)(?!.*error)/g,
    replacement: 'logger.warn($1, undefined, "WARN")'
  }
]

// Arquivos a serem processados
const filePatterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  '!src/**/*.d.ts',
  '!src/utils/production-logger.ts' // Excluir o próprio logger
]

// Função para verificar se o arquivo já importa o logger
function hasLoggerImport(content) {
  return content.includes('from \'@/utils/production-logger\'') ||
         content.includes('from "@/utils/production-logger"')
}

// Função para adicionar import do logger
function addLoggerImport(content) {
  if (hasLoggerImport(content)) {
    return content
  }

  // Encontrar a última linha de import
  const lines = content.split('\n')
  let lastImportIndex = -1
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].includes('type ')) {
      lastImportIndex = i
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/utils/production-logger'")
    return lines.join('\n')
  }

  // Se não encontrou imports, adicionar no início
  return "import { logger } from '@/utils/production-logger'\n" + content
}

// Função para processar um arquivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let hasChanges = false

    // Verificar se há logs para substituir
    const hasLogs = replacements.some(r => r.pattern.test(content))
    
    if (!hasLogs) {
      return false // Nenhuma mudança necessária
    }

    // Aplicar substituições
    replacements.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        hasChanges = true
      }
    })

    if (hasChanges) {
      // Adicionar import do logger se necessário
      content = addLoggerImport(content)
      
      // Salvar arquivo
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Processado: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message)
    return false
  }
}

// Função principal
function main() {
  console.log('🔄 Iniciando substituição de logs de debug...')
  
  let processedFiles = 0
  let totalFiles = 0

  filePatterns.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: process.cwd() })
    
    files.forEach(file => {
      totalFiles++
      if (processFile(file)) {
        processedFiles++
      }
    })
  })

  console.log(`\n📊 Resumo:`)
  console.log(`   Total de arquivos verificados: ${totalFiles}`)
  console.log(`   Arquivos modificados: ${processedFiles}`)
  console.log(`\n✨ Substituição concluída!`)
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

module.exports = { processFile, main }