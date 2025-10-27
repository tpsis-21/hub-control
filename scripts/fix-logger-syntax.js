/**
 * Script para corrigir erros de sintaxe causados pela substituição automática de logs
 */

const fs = require('fs')
const glob = require('glob')

// Função para processar um arquivo
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let hasChanges = false
    const originalContent = content

    // Correção 1: Template literals mal fechados
    const templateLiteralFixes = [
      // Corrigir casos como: `texto${var}texto`), undefined, "LEVEL");
      {
        pattern: /`([^`]*\$\{[^}]+\}[^`]*)`\),\s*undefined,\s*"(\w+)"\);/g,
        replacement: '`$1`, undefined, "$2");'
      },
      // Corrigir casos como: logger.level(`texto`), undefined, "LEVEL");
      {
        pattern: /logger\.(\w+)\(`([^`]*)`\),\s*undefined,\s*"(\w+)"\);/g,
        replacement: 'logger.$1(`$2`, undefined, "$3");'
      },
      // Corrigir parênteses mal posicionados em template literals
      {
        pattern: /`([^`]*\$\{[^}]+\.[^}]*)}([^`]*)`\),/g,
        replacement: '`$1}$2`,'
      },
      // Corrigir template literals com parênteses extras
      {
        pattern: /`([^`]*\$\{[^}]+\}[^`]*)`\)([^,]*),/g,
        replacement: '`$1$2`,'
      }
    ]

    templateLiteralFixes.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        hasChanges = true
      }
    })

    // Correção 2: Problemas específicos com métodos
    const methodFixes = [
      // toFixed(1}% -> toFixed(1)}%
      {
        pattern: /toFixed\((\d+)}%/g,
        replacement: 'toFixed($1)}%'
      },
      // Parênteses não fechados em template literals
      {
        pattern: /\$\{([^}]+)\s+dias`\)/g,
        replacement: '${$1} dias)`'
      },
      // Corrigir casos onde o template literal foi quebrado no meio
      {
        pattern: /`([^`]*\$\{[^}]+)\s+([^}]*\}[^`]*)`/g,
        replacement: '`$1 $2`'
      }
    ]

    methodFixes.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        hasChanges = true
      }
    })

    // Correção 3: Problemas com logger calls
    const loggerFixes = [
      // Corrigir logger calls com sintaxe incorreta
      {
        pattern: /logger\.(\w+)\(([^,]+),\s*undefined,\s*"(\w+)"\)([^;]*);/g,
        replacement: (match, level, message, context, extra) => {
          // Se há conteúdo extra após o ), incluir no message
          if (extra.trim()) {
            return `logger.${level}(${message}${extra}, undefined, "${context}");`
          }
          return `logger.${level}(${message}, undefined, "${context}");`
        }
      }
    ]

    loggerFixes.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        hasChanges = true
      }
    })

    // Correção 4: Limpeza final
    const cleanupFixes = [
      // Remover espaços extras
      {
        pattern: /,\s+undefined,\s+"(\w+)"\);/g,
        replacement: ', undefined, "$1");'
      },
      // Corrigir vírgulas duplas
      {
        pattern: /,,\s*undefined/g,
        replacement: ', undefined'
      }
    ]

    cleanupFixes.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        hasChanges = true
      }
    })

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Corrigido: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${filePath}:`, error.message)
    return false
  }
}

// Função principal
function main() {
  console.log('🔧 Iniciando correção avançada de erros de sintaxe...')
  
  const files = glob.sync('src/**/*.{ts,tsx}', { cwd: process.cwd() })
  let fixedFiles = 0

  files.forEach(file => {
    if (fixFile(file)) {
      fixedFiles++
    }
  })

  console.log(`\n📊 Resumo:`)
  console.log(`   Arquivos corrigidos: ${fixedFiles}`)
  console.log(`\n✨ Correção concluída!`)
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

module.exports = { fixFile, main }