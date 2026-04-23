# React to HTML Plugin

A Frame-Master plugin that transforms React components into static HTML files with filesystem-based routing and layout stacking support.

## Features

- 🚀 **Static Site Generation** - Convert React components to optimized HTML files
- 📁 **File-based Routing** - Automatic route generation from your file structure
- 🎨 **Layout Stacking** - Nested layouts with automatic composition
- 🌐 **CDN Ready** - Generates static HTML, CSS, and JS files for easy deployment
- ⚡ **Async Component Support** - Handle async components with a configurable fallback

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
import AsyncFallback from "./src/asyncFallback";

const config: FrameMasterConfig = {
  HTTPServer: { port: 3000 },
  plugins: [
    ReactToHtml({
      outDir: ".frame-master/build",
      srcDir: "src/pages",
      shellPath: "src/shell.tsx",
      asyncFallback: AsyncFallback,
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

## Async Components

Async page and layout components are supported. When the plugin detects an async component, it renders the `asyncFallback` component in its place during the static build.

### 1. Create a Fallback Component

```tsx
// src/asyncFallback.tsx
export default function AsyncFallback() {
  return <section>Loading...</section>;
}
```

### 2. Write an Async Page

```tsx
// src/pages/data.tsx
export default async function DataPage() {
  const data = await fetchSomeData();

  return (
    <div>
      <h1>Data Page</h1>
      <p>{data}</p>
    </div>
  );
}
```

The static build will render `<AsyncFallback />` in place of the async component. You can pair this with a client-side hydration plugin (e.g. `frame-master-plugin-apply-react`) to resolve the async data at runtime.

### Custom Component Transformation

Use `parseComponent` to transform components before they are rendered. This is useful for wrapping async components with a Suspense boundary or injecting props:

```tsx
ReactToHtml({
  srcDir: "src/pages",
  shellPath: "src/shell.tsx",
  asyncFallback: AsyncFallback,
  parseComponent: async (Component) => {
    // Return a transformed version of the component
    return (props) => <Component {...props} />;
  },
})
```

## Configuration Options

| Option                | Type                    | Required | Description                                                            |
| --------------------- | ----------------------- | -------- | ---------------------------------------------------------------------- |
| `shellPath`           | `string`                | ✅        | Path to your HTML shell component                                      |
| `asyncFallback`       | `React.FC`              | ✅        | Component rendered in place of async components during static build    |
| `srcDir`              | `string`                | —        | Source directory containing your pages (default: `src/pages`)          |
| `entrypointExtensions`| `string[]`              | —        | File extensions for page entrypoints (default: `[".tsx", ".jsx"]`)     |
| `parseComponent`      | `(fc) => fc \| Promise<fc>` | —   | Transform a component before it is rendered                            |
| `verbose`             | `boolean`               | —        | Log component parsing details to the console                           |

## License

MIT
