import { isAsyncFunction } from "node:util/types";
import type { JSX } from "react";
import type { ReactToHtmlPluginOptions } from "./";
import { PathProvider } from "./client";

type WrapperProps = {
	wrapperPath: string;
	children?: JSX.Element;
	/** current pretty path */
	path: string;
	pluginProps: ReactToHtmlPluginOptions;
};

/**
 * Dynamically imports and renders a React component wrapper.
 *
 * This component ensures the React hook engine is properly initialized before rendering
 * components to string, providing a workaround for using hooks in server-side rendering
 * scenarios where the main component needs hook support.
 *
 * @param props - The wrapper component properties
 * @param props.wrapperPath - File path to the wrapper component to dynamically import
 * @param props.children - Optional child elements to pass to the wrapper component
 * @returns Promise resolving to the rendered wrapper component with children
 *
 * @example
 * ```tsx
 * <Wrapper wrapperPath="./MyWrapper" children={<div>Content</div>} />
 * ```
 */
export async function Wrapper({
	wrapperPath,
	children,
	path,
	pluginProps,
}: WrapperProps) {
	const { default: Component } = (await import(wrapperPath)) as {
		default: React.FC<{ children?: JSX.Element }>;
	};

	const ParsedComponent =
		(await pluginProps.parseComponent?.(Component)) ?? Component;

	const parsedIsAsync = isAsyncFunction(ParsedComponent);

	if (pluginProps.verbose) {
		console.log(`[React-to-html] > Parsing component:`, {
			path,
			Component,
			children,
			parsedIsAsync,
		});
	}

	return (
		<PathProvider path={path}>
			{parsedIsAsync ? (
				<pluginProps.asyncFallback path={path}>
					{children}
				</pluginProps.asyncFallback>
			) : (
				<ParsedComponent path={path}>{children}</ParsedComponent>
			)}
		</PathProvider>
	);
}
