# Mesh Gradient Studio — Editor Profissional de Gradientes

Aplicação web completa, funcional e visualmente refinada para criação e edição de mesh gradients em alta resolução, com identidade visual própria, renderização acelerada por GPU (WebGL) e ferramentas profissionais de manipulação de malha cromática.

🔗 **Acesse online:** [https://dev-gabs.github.io/design-tools/](https://dev-gabs.github.io/design-tools/)

---

## ✨ Destaques e Funcionalidades

- **Motor WebGL de Alta Performance:** Renderização contínua a 60 FPS utilizando *Modified Shepard's Method* (RBF - Radial Basis Functions).
- **Espaço Cromático OKLab & Linear sRGB:** Misturas cromáticas ricas sem áreas cinzentas mortas entre cores complementares.
- **Manipulação Interativa Total:** Arraste pontos com mouse ou toque (Pointer Events), selecione múltiplos pontos (`Shift+Clique`), bloqueie pontos, ajuste por setas do teclado ou painel numérico de precisão.
- **Viewport Flexível:** Zoom suave de 10% a 500%, Pan (`Espaço + Arraste` ou botão do meio), ajuste automático à tela (`Fit`) e visualização 100%.
- **Modo Apresentação (Tecla `H`):** Oculta instantaneamente todos os controles, seleções e linhas de malha para visualização limpa.
- **16 Presets de Estilo Curados:** Aurora, Sunset, Ocean, Lavender Dream, Cyberpunk, Neon, Pastel, Earthy, Monochrome, Warm Editorial, Cold Editorial, Minimal, Vibrant, Abstract Art, Deep Space e Golden Hour.
- **Gerador Procedural Determinístico:** Geração completa, randomização apenas de cores, randomização apenas de geometria ou variação sutil orgânica via semente numérica (`Seed`).
- **Dimensões e Proporções Livres:** Largura e altura de 64px a 8192px com trava de aspect ratio e presets rápidos (1:1, 4:5, 9:16, 16:9, 1080p, 2K, 4K, A4).
- **Acabamento e Textura:** Granulação estocástica fina (Film Grain Noise) para eliminar banding de 8 bits, vinheta suave, saturação, contraste, brilho e rotação de matiz (*Hue Shift*).
- **Exportação Profissional em Alta Resolução:**
  - **PNG:** Escala 1x, 2x (Retina), 3x e 4x (Ultra HD até 8K), com suporte a transparência total.
  - **JPEG:** Ajuste de qualidade e cor de fundo personalizada.
  - **SVG:** Dimensões vetoriais com renderização de alta fidelidade e metadados estruturais dos pontos.
  - **Clipboard:** Cópia direta para a área de transferência em 1 clique (para colar direto no Figma/Photoshop).
- **Persistência e Histórico:**
  - Histórico completo de Desfazer/Refazer (`Ctrl+Z` / `Ctrl+Shift+Z`).
  - Autosave contínuo no `localStorage`.
  - Gerenciador de projetos com salvamento nomeado, duplicação e exclusão.
  - Exportação e importação de projetos em arquivo `.json` com validação de esquema.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ (recomendado Node 20+)
- npm ou yarn

### Instalação
```bash
git clone https://github.com/dev-gabs/design-tools.git
cd design-tools
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Build de Produção
```bash
npm run build
```

### Preview Local do Build
```bash
npm run preview
```

---

## 🛠️ Tecnologias Utilizadas

- **React 19 & TypeScript:** Tipagem estrita e arquitetura desacoplada.
- **Vite:** Bundler ultrarrápido com Hot Module Replacement.
- **Tailwind CSS v4:** Design system moderno, escuro e responsivo.
- **WebGL / GLSL:** Fragment shaders personalizados para interpolação contínua e processamento de imagem em tempo real.
- **Lucide Icons:** Ícones modernos e consistentes.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para obter mais informações.
