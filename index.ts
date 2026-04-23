import { join, relative } from "node:path";
import type { MatchedRoute } from "bun";
import type { FrameMasterPlugin } from "frame-master/plugin";
import { join as clientJoin } from "frame-master/utils";
import type React from "react";
import type { JSX } from "react";
import { renderToString } from "react-dom/server";
import packageJson from "./package.json";
import { Wrapper } from "./wrapper";

const _AsyncFunction = (async () => {}).constructor;
export type AsyncFunction = typeof _AsyncFunction;
export type ReactToHtmlPluginOptions = {
	/** default: "src/pages" */
	srcDir?: string;
	/**
	 * path to the shell/layout wrapper component. This component will be used to wrap all page components, allowing you to define a common layout for your pages. The shell component should accept a `children` prop, which will be the rendered page component. For example, if you have a `src/pages/shell.tsx` file that exports a React component as default, you can set `shellPath` to "src/pages/shell.tsx". Make sure to provide the correct path to your shell component relative to the project root.
	 */
	shellPath: string;
	/**
	 * Custom file extensions for entrypoints
	 *
	 * @default [".tsx", ".jsx"]
	 */
	entrypointExtensions?: string[];
	parseComponent?: (
		component: React.FC<{ children?: JSX.Element }>,
	) =>
		| React.FC<{ children?: JSX.Element; path: string }>
		| Promise<React.FC<{ children?: JSX.Element; path: string }>>;
	asyncFallback: React.FC<{ children?: JSX.Element; path: string }>;
	verbose?: boolean;
};

function toDevImportPath(path: string) {
	return process.env.NODE_ENV === "production"
		? path
		: `${path}?t=${Date.now()}`;
}

function toPrettyPath(path: string) {
	const pathNoExt = `/${path.replace(/\.(jsx|tsx)$/, "")}`;
	if (pathNoExt.endsWith("index")) {
		const pretty = pathNoExt.slice(0, -6);
		return pretty === "" ? "/" : pretty;
	} else {
		return pathNoExt;
	}
}

const cwd = process.cwd();
function routeToRelative(router: Bun.FileSystemRouter, basePath: string) {
	return Object.values(router.routes).map((fp) =>
		relative(join(cwd, basePath), fp),
	);
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
	_props: ReactToHtmlPluginOptions,
): FrameMasterPlugin {
	const {
		srcDir = join("src/pages"),
		shellPath,
		entrypointExtensions = [".tsx", ".jsx"],
	} = _props;

	const cwd = process.cwd();

	const srcFileRouter = new Bun.FileSystemRouter({
		dir: join(cwd, srcDir),
		style: "nextjs",
		fileExtensions: entrypointExtensions,
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
			const layoutPathToTest = `/${clientJoin(testPathname, "layout")}`;
			const matched = srcFileRouter.match(layoutPathToTest);

			currentPathname = testPathname;

			if (!matched) continue;
			relatedLayouts.push(matched);
		}

		return relatedLayouts;
	};

	return {
		name: "react-to-static-html",
		version: packageJson.version,
		requirement: {
			bunVersion: ">=1.3.11",
		},
		build: {
			buildConfig: async () => {
				const entries = routeToRelative(srcFileRouter, srcDir).filter(
					(fp) => !fp.match(/layout\.(jsx|tsx)$/),
				);

				return {
					entrypoints: entries.map((entry) => {
						const ext = entry.match(/\.(jsx|tsx)$/)?.[0] as string;
						return `${entry.replace(ext, ".html")}?react-to-html=${ext.slice(1)}`;
					}),
					files: Object.fromEntries(
						await Promise.all(
							entries.map(async (entry) => [
								entry,
								await Bun.file(join(cwd, srcDir, entry)).text(),
							]),
						),
					),
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
										filter: /.*\?react-to-html=.*$/,
									},
									(args) => {
										const url = new URL(args.path, "file://");
										const realExt = url.searchParams.get(
											"react-to-html",
										) as string;

										const realPath = join(
											cwd,
											srcDir,
											args.path
												.replace(/\?react-to-html=.*$/, "")
												.replace(/\.html$/, `.${realExt}`),
										);

										return {
											path: realPath,
											namespace: "src-page",
										};
									},
								);
								build.onLoad(
									{
										filter: /.*/,
										namespace: "src-page",
									},
									async (args) => {
										const realPath = args.path;

										const pathname = Object.entries(srcFileRouter.routes)
											.find(([_pathname, filePath]) => filePath === realPath)
											?.at(0) as string;

										const layouts = getRelatedLayoutsMatchForPathname(pathname)
											.map((match) => toDevImportPath(match.filePath))
											.reverse();

										const prettyPath = toPrettyPath(
											relative(join(cwd, srcDir), args.path),
										);

										let currentElement: JSX.Element = await Wrapper({
											wrapperPath: realPath,
											path: prettyPath,
											pluginProps: _props,
										});

										for await (const layoutPath of layouts) {
											currentElement = await Wrapper({
												wrapperPath: layoutPath,
												children: currentElement,
												path: prettyPath,
												pluginProps: _props,
											});
										}

										const Shell = (
											await import(toDevImportPath(join(cwd, shellPath)))
										).default as (props: {
											children: JSX.Element;
										}) => JSX.Element;

										const strContent = renderToString(
											Shell({ children: currentElement }),
										);
										return {
											contents: strContent,
											loader: "html",
										};
									},
								);
							},
						},
					],
				};
			},
		},
	};
}
