import type { FrameMasterPlugin } from "frame-master/plugin";
import { type JSX } from "react";
import { renderToString } from "react-dom/server";
import { builder } from "frame-master/build";
import { join } from "path";
import { type MatchedRoute } from "bun";
import { join as clientJoin } from "frame-master/utils";
import packageJson from "./package.json";
import { Wrapper } from "./wrapper";

export type ReactToHtmlPluginOptions = {
  /** default: ".frame-master/build" */
  outDir?: string;
  /** default: "src/pages" */
  srcDir?: string;
  shellPath: string;
};

function filePathToMimeType(filePath: string) {
  const ext = filePath.split(".").pop();
  switch (ext) {
    case "html":
      return "text/html";
    case "js":
      return "application/javascript";
    case "css":
      return "text/css";
    case "json":
      return "application/json";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function toDevImportPath(path: string) {
  return process.env.NODE_ENV == "production"
    ? path
    : path + `?t=${Date.now()}`;
}

function toPrettyPath(path: string) {
  if (!path || path === "/") return "/";
  const parts = path.split("/");
  parts.pop(); // Remove the last segment (filename)
  const joined = parts.join("/");
  return joined || "/";
}

/**
 * React to Static HTML Plugin for Frame Master
 *
 * Transforms React components into static HTML pages for deployment to CDN or static hosting.
 *
 * @features
 * - Server-side rendering of React components to static HTML
 * - File-based routing using Next.js-style conventions
 * - Nested layout support with automatic composition
 * - Production-ready static site generation
 *
 * @param _props - Plugin configuration options
 * @param _props.srcDir - Source directory for pages (default: "src/pages")
 * @param _props.outDir - Output directory for built files (default: ".frame-master/build")
 * @param _props.shellPath - Path to the shell/layout wrapper component
 *
 * @returns Frame Master plugin instance
 *
 * @example
 * ```bash
 * # build for production
 * > NODE_ENV=production frame-master build
 * ```
 */
export default function reactToHtmlPlugin(
  _props: ReactToHtmlPluginOptions
): FrameMasterPlugin {
  const {
    srcDir = join("src/pages"),
    outDir = join(".frame-master/build"),
    shellPath,
  } = _props;

  const cwd = process.cwd();

  const srcFileRouter = new Bun.FileSystemRouter({
    dir: join(cwd, srcDir),
    style: "nextjs",
    fileExtensions: [".jsx", ".tsx"],
  });

  const getRelatedLayoutsMatchForPathname = (pathname: string) => {
    const paths = pathname ? pathname.split("/").filter(Boolean) : [];
    const relatedLayouts: MatchedRoute[] = [];

    const testBasePath = srcFileRouter.match("/layout");
    if (testBasePath) relatedLayouts.push(testBasePath);

    if (paths.length === 0) return relatedLayouts;
    let currentPathname = "";
    for (const path of paths) {
      const testPathname = clientJoin(currentPathname, path);
      const layoutPathToTest = "/" + clientJoin(testPathname, "layout");
      const matched = srcFileRouter.match(layoutPathToTest);

      currentPathname = testPathname;

      if (!matched) continue;
      relatedLayouts.push(matched);
    }

    return relatedLayouts;
  };

  let fileRouter: Bun.FileSystemRouter | null = null;

  const createFileRouter = () =>
    new Bun.FileSystemRouter({
      dir: join(cwd, outDir),
      style: "nextjs",
      fileExtensions: [".html"],
    });

  return {
    name: "react-to-static-html",
    version: packageJson.version,
    build: {
      buildConfig: () => ({
        entrypoints: [
          ...Object.values(srcFileRouter.routes)
            .filter(
              (filePath) =>
                !filePath.endsWith("layout.tsx") &&
                !filePath.endsWith("layout.jsx")
            )
            .map(
              (filePath) => filePath.split(srcDir).pop()! + "?entrypoint=true"
            ),
        ],
        throw: false,
        outdir: outDir,
        plugins: [
          {
            name: "react-to-html-transformer",
            setup(build) {
              build.onLoad({ filter: /\.css$/ }, async (args) => {
                return {
                  contents: await Bun.file(args.path).text(),
                  loader: "file",
                };
              });
              build.onResolve(
                {
                  filter: /.*\?entrypoint=true$/,
                },
                (args) => {
                  return {
                    path: args.path.split("?entrypoint=true").shift()!,
                    namespace: "src-page",
                  };
                }
              );
              build.onLoad(
                {
                  filter: /.*/,
                  namespace: "src-page",
                },
                async (args) => {
                  const realPath = join(cwd, srcDir, args.path);
                  const pageComponent = (
                    await import(toDevImportPath(realPath))
                  ).default as () => JSX.Element;

                  const pathname = Object.entries(srcFileRouter.routes)
                    .find(([pathname, filePath]) => filePath == realPath)
                    ?.at(0)!;

                  const layouts = getRelatedLayoutsMatchForPathname(pathname)
                    .map((match) => toDevImportPath(match.filePath))
                    .reverse();

                  const prettyPath = toPrettyPath(args.path);

                  let currentElement: JSX.Element = await Wrapper({
                    wrapperPath: realPath,
                    path: prettyPath,
                  });

                  for await (const layoutPath of layouts) {
                    currentElement = await Wrapper({
                      wrapperPath: layoutPath,
                      children: currentElement,
                      path: prettyPath,
                    });
                  }

                  const Shell = (
                    await import(toDevImportPath(join(cwd, shellPath)))
                  ).default as (props: {
                    children: JSX.Element;
                  }) => JSX.Element;

                  const strContent = renderToString(
                    Shell({ children: currentElement })
                  );
                  return {
                    contents: strContent,
                    loader: "html",
                  };
                }
              );
            },
          },
        ],
      }),
      async afterBuild(_, result) {
        fileRouter = createFileRouter();
      },
    },
    serverStart: {
      async main() {
        await builder?.build();
        fileRouter = createFileRouter();
      },
    },
    router: {
      async request(req) {
        if (req.isResponseSetted()) return;
        fileRouter?.reload();
        const pathname = req.URL.pathname;
        const filePath = join(cwd, outDir, pathname);
        if (builder?.isBuilding()) await builder.awaitBuildFinish();

        const match = fileRouter?.match(pathname);
        if (match) {
          req.setResponse(Bun.file(match.filePath).stream(), {
            headers: {
              "Content-Type": "text/html",
            },
          });
          return;
        }

        const file = builder?.outputs?.find((out) => out.path === filePath);
        if (!file) return;
        req.preventLog();
        const fileMimeType = filePathToMimeType(file.path);
        req.setResponse(
          fileMimeType == "text/html"
            ? file.stream()
            : await file.arrayBuffer(),
          {
            headers: {
              "Content-Type": fileMimeType,
            },
          }
        );
      },
    },
  };
}
