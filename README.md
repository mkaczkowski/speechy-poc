# PDF Text Highlighting + TTS Sync PoC

![CleanShot 2026-03-14 at 00.21.55.png](assets/CleanShot%202026-03-14%20at%2000.21.55.png)![Speechy app hero screenshot](assets/CleanShot%202026-03-13%20at%2013.49.07.png)

Proof-of-concept for synchronized text-to-speech playback in PDFs using [PDF.js](https://mozilla.github.io/pdf.js/) and a custom highlight overlay. Built with React 19, TypeScript, and Vite 7.

## What This PoC Demonstrates

- **PDF rendering with layered composition** (`canvas` + hidden text layer + custom highlight overlay)
- **Character-accurate text mapping** from text-layer DOM to sentence/word ranges
- **Live TTS synchronization** between speech boundary events and on-screen highlights
- **Sentence + word highlighting** with auto-scroll during playback

## Tech Stack

- **PDF.js** (`pdfjs-dist`) for rendering + text content
- **React 19** + **TypeScript** for UI and type-safe logic
- **Vite 7** for build and local development
- **Tailwind CSS 4** + **Shadcn/UI** for styling and UI primitives
- **Zustand** for playback and highlight synchronization state

## Getting Started

```bash
# Prerequisite: Node.js >= 22.0.0
nvm use

npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command                  | Description                            |
| ------------------------ | -------------------------------------- |
| `npm run dev`            | Start Vite dev server                  |
| `npm run build`          | Type-check and build for production    |
| `npm run preview`        | Preview production build locally       |
| `npm run typecheck`      | Run TypeScript type checking only      |
| `npm run test`           | Run unit tests once                    |
| `npm run test:watch`     | Run unit tests in watch mode           |
| `npm run test:coverage`  | Run unit tests with coverage report    |
| `npm run e2e`            | Run Playwright end-to-end tests        |
| `npm run e2e:ui`         | Run Playwright in UI mode              |
| `npm run lint`           | Lint with ESLint                       |
| `npm run lint:fix`       | Lint and auto-fix issues               |
| `npm run format`         | Format files with Prettier             |
| `npm run format:check`   | Check formatting without writing       |
| `npm run deploy:preview` | Build and deploy preview to Netlify    |
| `npm run deploy:prod`    | Build and deploy production to Netlify |

## Architecture Snapshot

```text
PDF.js Canvas Layer    -> visible page pixels
PDF.js Text Layer      -> hidden DOM text used for mapping/selection
Custom Highlight Layer -> sentence/word overlay rectangles
```

Highlight rectangles are computed from text-layer character ranges using DOM `Range` APIs, then rendered in viewer-relative coordinates so overlays stay aligned with PDF content.

## Documentation

- Full docs index: [`docs/README.md`](docs/README.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- API reference: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
- Feature docs: [`docs/features/README.md`](docs/features/README.md)

## License

MIT
