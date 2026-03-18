# Local.LLM

A unified platform for accessing and managing multiple AI applications. Deploy to the cloud or self-host on your own infrastructure — fast, secure, and completely under your control.

## Features

- **Cloud & Self-Hosted** — Run on managed infrastructure or deploy to your own servers
- **AI Applications Hub** — Chatbot, Code Assistant, Content Generator, Research Tool, Creative Writer, Translator, Image Analyzer, Data Processor, Voice AI, and more
- **Open Source** — Transparent, community-driven development
- **Enterprise Ready** — Built for production workloads with security and scalability in mind
- **Performance Monitoring** — Real-time metrics and insights into model performance and resource usage

## Tech Stack

- [Angular 20](https://angular.dev) with standalone components
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS 3](https://tailwindcss.com/) with Typography plugin
- [PostCSS](https://postcss.org/) + Autoprefixer
- [Vitest](https://vitest.dev/) for unit testing

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Default Admin Credentials

An admin account (`admin`) is created automatically on first startup. The password is randomly generated and printed to the server console output:

```
===========================================
  Admin account created.
  Username : admin
  Password : <random-generated-password>
  Change this password after first login!
===========================================
```

> **Important:** Change the admin password after your first login.

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm start
```

Open your browser and navigate to `http://localhost:4200/`. The application reloads automatically when source files change.

### Termux (Android)

To run on [Termux](https://termux.dev/), install Node.js and start the server with:

```bash
pkg install nodejs-lts
npm install
npm run termux
```

This binds the dev server to `0.0.0.0` so it is accessible from your Android browser at `http://localhost:4200/`.

## Available Scripts

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `npm start`       | Start the development server                         |
| `npm run termux`  | Start the development server with Termux support     |
| `npm run build`   | Production build (output to `dist/`)                 |
| `npm run watch`   | Build in watch mode (development config)             |
| `npm test`        | Run unit tests with Vitest                           |

## Project Structure

```
src/
├── app/
│   ├── components/       # Shared UI components (Navbar, Footer, Hero, AppCard)
│   ├── layout/           # App and Docs layout wrappers
│   ├── pages/            # Route-level page components
│   │   └── docs/         # Documentation pages
│   ├── app.ts            # Root component
│   ├── app.config.ts     # Application configuration
│   └── app.routes.ts     # Route definitions
├── styles.css            # Global styles (TailwindCSS imports)
├── index.html            # HTML entry point
└── main.ts               # Application bootstrap
```

## Deployment

Build the production bundle and serve the `dist/` directory with any static file host or web server:

```bash
npm run build
```

For self-hosted deployments, see the in-app documentation at `/docs/deployment`.

## License

See [LICENSE](LICENSE) for details.
