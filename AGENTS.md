# Local.LLM

A self-hosted AI platform built with Angular, Express, and Python — supporting local and cloud LLM providers, a coding agent, dataset management, model training, and more.

## Tech Stack

- **Frontend**: Angular 21 + TypeScript + TailwindCSS 3.4.11
- **Backend**: Node.js + Express 5
- **Python Service**: Python 3 with transformers + torch (auto-managed venv)
- **Styling**: TailwindCSS 3 with Typography Plugin + PostCSS + Autoprefixer
- **Testing**: Vitest (via `ng test`)
- **Build Tool**: Angular CLI with Vite
- **Package Manager**: npm

## Project Structure

```
src/                     # Angular application source
├── app/
│   ├── app.html         # Main app template
│   ├── app.ts           # App component
│   ├── app.config.ts    # App configuration
│   ├── app.routes.ts    # Route definitions
│   ├── app.spec.ts      # App component tests
│   ├── components/      # Shared UI components (navbar, footer, hero, etc.)
│   ├── pages/           # Page-level components (admin, dashboard, login, etc.)
│   ├── services/        # Angular services (auth, admin, LLM, datasets, etc.)
│   ├── guards/          # Route guards (auth, admin, risky-apps)
│   ├── interceptors/    # HTTP interceptors (auth token injection)
│   └── layout/          # Layout components (app layout, docs layout)
├── styles.css           # Global styles with TailwindCSS imports
├── index.html           # Main HTML entry point
└── main.ts              # Application bootstrap

server/                  # Backend
├── server.js            # Express API server
├── server.test.js       # Server tests
├── python_service.py    # Python inference/training service
├── search-tool.js       # Search tooling
└── reset-admin.js       # Admin password reset script

public/                  # Static assets
├── favicon.ico          # Site favicon
└── ...                  # Other static files
```

## Key Features

### Angular Standalone Components

The application uses Angular's modern standalone component architecture:

- Standalone components with self-contained dependencies
- Functional route guards and resolvers
- Minimal bundle size with tree-shaking

### Styling System

- **Primary**: TailwindCSS 3.4.11 utility classes
- **Typography**: `@tailwindcss/typography` plugin for rich text styling
- **PostCSS**: Autoprefixer for cross-browser compatibility
- **Configuration**: `tailwind.config.js` for custom theming

```typescript
// Example of TailwindCSS usage in Angular templates
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
  <div class="text-center">
    <h1 class="text-2xl font-semibold text-slate-800">Welcome to Fusion</h1>
  </div>
</div>
```

### Routing System

Angular Router with standalone route configuration:

```typescript
// app.routes.ts
import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", component: AppComponent },
  // Add more routes here
];
```

### Development Commands

```bash
npm start          # Start dev server (Express backend + Angular frontend)
npm run start:no-lan  # Start dev server on localhost only (no LAN access)
npm run server     # Start Express backend only
npm run build      # Production build
npm run watch      # Build with watch mode
npm test           # Run tests (Vitest via ng test)
npm run resetadmin # Reset admin password
```

## Adding Features

### New Components

1. Create component in `src/app/components/`:

```typescript
// my-component.ts
import { Component } from "@angular/core";

@Component({
  selector: "app-my-component",
  standalone: true,
  template: `
    <div class="p-4 bg-white rounded-lg shadow">
      <h2 class="text-xl font-bold text-gray-900">My Component</h2>
      <p class="text-gray-600">This is my new component.</p>
    </div>
  `,
})
export class MyComponent {}
```

2. Import in your app or other components:

```typescript
import { MyComponent } from "./components/my-component";
```

### New Routes

1. Create component in `src/app/pages/`:

```typescript
// pages/my-page.ts
import { Component } from "@angular/core";

@Component({
  selector: "app-my-page",
  standalone: true,
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900">My Page</h1>
    </div>
  `,
})
export class MyPageComponent {}
```

2. Add route in `src/app/app.routes.ts`:

```typescript
import { MyPageComponent } from "./pages/my-page";

export const routes: Routes = [
  { path: "", component: AppComponent },
  { path: "my-page", component: MyPageComponent },
  // Add more routes here
];
```

### Custom TailwindCSS Configuration

1. Update `tailwind.config.js` for custom theming:

```javascript
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
        secondary: "#64748b",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
```

2. Add custom styles in `src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded;
  }
}
```

## Production Deployment

- **Standard**: `npm run build` creates optimized production build
- **Development**: `npm start` for local development
- **Testing**: `npm test` runs tests with Vitest

## Architecture Notes

- Angular 21 with standalone components
- Express 5 backend with Python inference service
- TypeScript throughout the frontend
- TailwindCSS 3.4.11 for utility-first styling
- Typography plugin for rich text content
- PostCSS with Autoprefixer for cross-browser support
- Vitest for unit testing
- Angular CLI for development and build tooling
