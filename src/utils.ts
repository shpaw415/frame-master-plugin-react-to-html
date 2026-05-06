import { join } from "node:path";
import type { MatchedRoute } from "bun";

const cwd = process.cwd();
export function createFileRouter(
	baseDir: string,
	entrypointExtensions: string[] = [".tsx", ".jsx"],
) {
	return new Bun.FileSystemRouter({
		dir: join(cwd, baseDir),
		style: "nextjs",
		fileExtensions: entrypointExtensions,
	});
}

export function getRelatedLayoutsMatchForPathname(
	fileRouter: Bun.FileSystemRouter,
	pathname: string,
) {
	const paths = pathname ? pathname.split("/").filter(Boolean) : [];
	const relatedLayouts: MatchedRoute[] = [];

	const testBasePath = fileRouter.match("/layout");
	if (testBasePath?.name.endsWith("layout")) relatedLayouts.push(testBasePath);

	if (paths.length === 0) return relatedLayouts;
	let currentPathname = "";
	for (const path of paths) {
		const testPathname = join(currentPathname, path);
		const layoutPathToTest = `/${join(testPathname, "layout")}`;
		const matched = fileRouter.match(layoutPathToTest);

		currentPathname = testPathname;

		if (!matched) continue;
		relatedLayouts.push(matched);
	}
	return relatedLayouts;
}
