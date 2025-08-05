# Hub Control - Guia de Implementação do Logo

## Estrutura de Arquivos Necessária

Para implementar o logo do Hub Control, você precisa adicionar os seguintes arquivos PNG nesta pasta:

### Logos Principais (src/assets/images/logo/)
```
hub-control-logo.png          # Logo completa - tema claro (160x40px)
hub-control-logo-dark.png     # Logo completa - tema escuro (160x40px)
hub-control-icon.png          # Ícone apenas - tema claro (32x32px)
hub-control-icon-dark.png     # Ícone apenas - tema escuro (32x32px)
```

### Favicons (public/assets/images/logo/)
```
favicon-16x16.png            # Favicon pequeno (16x16px)
favicon-32x32.png            # Favicon médio (32x32px)
favicon-96x96.png            # Favicon grande (96x96px)
apple-touch-icon.png         # Ícone Apple (180x180px)
android-chrome-192x192.png   # Ícone Android pequeno (192x192px)
android-chrome-512x512.png   # Ícone Android grande (512x512px)
```

## Especificações Técnicas para PNG

### Qualidade e Formato
- **Formato**: PNG-24 com transparência
- **Qualidade**: Máxima (sem compressão com perda)
- **Fundo**: Transparente
- **DPI**: 72 para web, 144+ para alta resolução

### Cores do Logo
- **Azul Principal**: #2196F3
- **Verde IPTV**: #4CAF50
- **Texto Claro**: #3A4A5C
- **Texto Escuro**: #FFFFFF

### Tamanhos Específicos

#### Logo Completa
- **Pequena**: 120x30px
- **Média**: 160x40px (padrão)
- **Grande**: 200x50px

#### Ícone
- **Pequeno**: 24x24px
- **Médio**: 32x32px (padrão)
- **Grande**: 40x40px

## Instruções de Exportação

### No Photoshop
1. Arquivo > Exportar > Exportar Como
2. Formato: PNG
3. Qualidade: Máxima
4. Metadados: Nenhum
5. Converter para sRGB: ✓

### No Figma
1. Selecionar o elemento
2. Export > PNG
3. Resolução: 2x para alta qualidade
4. Incluir "id" no nome: ✗

### No Illustrator
1. Arquivo > Exportar > Exportar para Telas
2. Formato: PNG
3. Resolução: 72 PPI
4. Fundo Transparente: ✓

## Implementação

Após adicionar os arquivos PNG:

1. **Teste o componente Logo**:
   ```tsx
   import { Logo } from '@/components/ui/logo'
   
   // Logo completa
   <Logo variant="full" size="md" />
   
   // Apenas ícone
   <Logo variant="icon" size="sm" />
   ```

2. **Para usar PNG em vez de SVG**:
   ```tsx
   <Logo fallbackToSvg={false} />
   ```

3. **Teste em ambos os temas**:
   - Modo claro: Deve usar arquivos sem "-dark"
   - Modo escuro: Deve usar arquivos com "-dark"

## Verificação de Qualidade

### Checklist Visual
- [ ] Logo nítida em todas as resoluções
- [ ] Transparência funcionando corretamente
- [ ] Cores consistentes com a paleta
- [ ] Texto legível em ambos os temas
- [ ] Ícone reconhecível em tamanhos pequenos

### Checklist Técnico
- [ ] Arquivos PNG otimizados (< 50KB cada)
- [ ] Nomes de arquivo corretos
- [ ] Dimensões exatas conforme especificação
- [ ] Fallback SVG funcionando

## Suporte

Se você encontrar problemas:
1. Verifique se os nomes dos arquivos estão corretos
2. Confirme se as dimensões estão exatas
3. Teste o fallback SVG (sempre funciona)
4. Verifique o console do navegador para erros

## Exemplo de Uso Completo

```tsx
// Header principal
<Logo variant="full" size="md" className="h-8" />

// Sidebar compacta
<Logo variant="icon" size="sm" className="w-6 h-6" />

// Loading ou erro - usa SVG
<Logo fallbackToSvg={true} />
```

O componente Logo foi atualizado para suportar tanto PNG quanto SVG, com fallback automático para garantir que sempre funcione, mesmo sem os arquivos PNG.