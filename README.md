# StudioOS

Desktop application para gerenciamento de portfolio, comissões e deploy de sites.

## Stack

- React 19
- Vite 6
- Tailwind CSS 4
- TypeScript 5.8
- Zustand (state management)
- Tauri v2 (desktop)
- Rust

## Funcionalities

- **Galeria**: CRUD de imagens com categorias (Hero, Social, Artes, Vídeos, NSFW)
- **Sync com Site**: Sincronização automática com o site via GitHub API
- **Fila**: Gerenciamento de comissões com drag & drop
- **Finanças**: Conversor de câmbio, simulador de preços
- **Deploy**: Publicação no GitHub Pages via GitHub Actions
- **Backup**: Sistema de backup local com versionamento

## Pré-requisitos

- Node.js 24+
- Rust 1.82+
- Tauri CLI

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run tauri build
```

## Estrutura

```
src/
├── components/     # UI components
├── lib/           # Utilities, GitHub API, persistence
├── store/         # Zustand stores
├── views/         # Page components
└── types/         # TypeScript types

src-tauri/
├── src/           # Rust backend
└── tauri.conf.json
```

## Licença

MIT
