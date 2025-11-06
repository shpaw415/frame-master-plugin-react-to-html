# React to HTML Plugin

A Frame-Master plugin that transforms React components into static HTML files with filesystem-based routing and layout stacking support.

## Features

- 🚀 **Static Site Generation** - Convert React components to optimized HTML files
- 📁 **File-based Routing** - Automatic route generation from your file structure
- 🎨 **Layout Stacking** - Nested layouts with automatic composition
- 🌐 **CDN Ready** - Generates static HTML, CSS, and JS files for easy deployment

## Limitations

- **Static Output Only** - React hooks and client-side state management are not supported as this plugin generates static HTML, CSS, and JS files
- **No Server-Side Interactivity** - Components are rendered to static markup without runtime React functionality

## Adding Interactivity

For dynamic functionality, consider these options:

- **Custom Implementation** - Add your own React hydration logic for client-side interactivity
- **Apply React Plugin** - Use `frame-master-plugin-apply-react` to transform your static site into a dynamic single-page application with client-side navigation

## Installation

```bash
bun add frame-master-plugin-react-to-html
```

## Quick Start

### 1. Configure the Plugin

```typescript
// frame-master.config.ts
import type { FrameMasterConfig } from "frame-master/server/types";
import ReactToHtml from "frame-master-plugin-react-to-html";

const config: FrameMasterConfig = {
  HTTPServer: { port: 3000 },
  plugins: [
    ReactToHtml({
      outDir: ".frame-master/build",
      srcDir: "src/pages",
      shellPath: "src/shell.tsx",
    }),
  ],
};

export default config;
```

### 2. Create Your Shell Component

```tsx
// src/shell.tsx
export default function Shell({ children }: { children: JSX.Element }) {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Application</title>
      </head>
      <body id="root">{children}</body>
    </html>
  );
}
```

### 3. Build Your Pages

```tsx
// src/pages/index.tsx
export default function HomePage() {
  return (
    <section>
      <h1>Welcome to My Site</h1>
      <a href="/about">Learn More</a>
    </section>
  );
}
```

```tsx
// src/pages/layout.tsx
export default function MainLayout({ children }: { children: JSX.Element }) {
  return (
    <>
      <header>
        <nav>Navigation</nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; 2024 My Company</p>
      </footer>
    </>
  );
}
```

## Configuration Options

| Option      | Type     | Description                            |
| ----------- | -------- | -------------------------------------- |
| `outDir`    | `string` | Output directory for generated files   |
| `srcDir`    | `string` | Source directory containing your pages |
| `shellPath` | `string` | Path to your HTML shell component      |

## License

MIT
