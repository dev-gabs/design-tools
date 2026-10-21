# Chromalab — Suíte de Ferramentas Visuais de Design

> **"Design, sem complicação."**  
> Ferramentas visuais completas para criar cores, formas, texturas e interfaces no navegador. 100% Client-side.

🔗 **Acesse online:** [https://dev-gabs.github.io/design-tools/](https://dev-gabs.github.io/design-tools/)

---

## 🎨 Os 6 Módulos do Chromalab

### 1. Mesh Gradient Studio (Preservado e Integrado)
- **Motor WebGL Shader:** Interpolação ponderada contínua (*Modified Shepard's Method*) a 60 FPS com precisão matemática.
- **Espaço Perceptual OKLab & Linear sRGB:** Cores vivas sem zonas cinzentas mortas em transições complementares.
- **Manipulação Completa:** Pontos arrastáveis (Mouse e Touch), controle numérico de coordenadas, raio de influência, opacidade e bloqueio.
- **Textura e Acabamento:** Granulação estocástica fina (Film grain), vinheta suave, saturação e matiz em tempo real.
- **Exportação Hi-Fi:** PNG (1x a 4x até 8K), JPEG com fundo configurável, SVG e cópia para área de transferência.

### 2. Color Palette Studio
- **Geração Harmônica:** Modos Equilibrado, Análogo, Complementar, Complementar Dividido, Tríade, Tétrade, Monocromático e Neutro.
- **Personalidades Cromáticas:** Vibrante, Pastel, Suave, Sóbria, Terrosa e Alto Contraste.
- **Controle Preciso:** Fixação de cor-base (HEX), trava de cores individuais (`Lock`), edição por amostra e salvamento de paletas.
- **Integração Direta:** Envie a paleta ativa para o **Mesh Gradient Studio** e para o **Pattern & Shape Studio** com um clique.

### 3. Pattern & Shape Studio
- **8 Tipos de Padrão:** Blobs Orgânicos, Pontos (Dots), Grade Ortogonal, Linhas Horizontais, Listras Diagonais, Xadrez, Círculos e Geometria.
- **Composições Abstratas:** Blobs orgânicos calculados por curvas cúbicas de Bézier com densidade configurável.
- **Controles Dinâmicos:** Espaçamento, escala, rotação, espessura do traço, opacidade e semente de variação.
- **Exportação Real:** Download de arquivos SVG vetoriais autênticos, cópia de markup SVG e exportação PNG.

### 4. Texture Lab
- **6 Texturas Gráficas:** Film Grain, Ruído Digital (Noise), Papel Sutil com fibras, Halftone (retícula de impressão), Pontilhado (Stippling) e Micro-Grid.
- **Controles de Precisão:** Intensidade, escala, contraste, opacidade, cor do ruído e fundo transparente.
- **Exportação:** PNG em alta resolução (512px a 2048px) com canal alfa para sobreposição em composições externas.

### 5. Type System
- **Escalas Modulares Harmônicas:** Minor Second, Major Second, Minor Third, Major Third, Perfect Fourth, Golden Ratio, etc.
- **Playground Editorial:** Edição imediata de Display, H1, H2, Subtítulos e Parágrafos com ajuste de entrelinha, tracking e peso.
- **Responsividade com `clamp()`:** Geração de regras CSS fluidas com limites mínimos, preferenciais e máximos.
- **Exportação de Código:** Cópia de Design Tokens (variáveis CSS) e snippets de código.

### 6. Glass Studio
- **Glassmorphism UI:** Efeito de vidro translúcido contemporâneo em tempo real.
- **Controles:** Intensidade de desfoque (`backdrop-filter`), opacidade de preenchimento, reflexo especular em gradiente, borda, sombra e raio de curvatura.
- **Componentes de Teste:** Pré-visualização em Cartão (Card), Botão, Painel modal e Badge.
- **Exportação:** CSS pronto para produção com compatibilidade cross-browser e aviso de contraste de acessibilidade.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ (recomendado Node 20+)
- npm ou yarn

### Instalação e Execução
```bash
git clone https://github.com/dev-gabs/design-tools.git
cd design-tools
npm install
npm run dev
```

### Build de Produção
```bash
npm run build
```

---

## 🛠️ Tecnologias Utilizadas

- **React 19 & TypeScript:** Tipagem estrita com `verbatimModuleSyntax`.
- **Vite:** Bundler ultrarrápido com Hot Module Replacement e base path relativo (`base: './'`).
- **Tailwind CSS v4:** Interface contemporânea, limpa e responsiva.
- **WebGL / GLSL:** Fragment Shaders para renderização acelerada por GPU.
- **Lucide Icons:** Ícones modernos e consistentes.

---

## 📄 Licença

Distribuído sob a licença MIT.
