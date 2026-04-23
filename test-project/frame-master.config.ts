import type { FrameMasterPlugin } from "frame-master/plugin/types";
import type { FrameMasterConfig } from "frame-master/server/types";
import ReactToHTML from "frame-master-plugin-react-to-html";
import AsyncFallback from "./src/asyncFallback";

export default {
	HTTPServer: {
		port: 3000,
	},
	plugins: [
		ReactToHTML({
			verbose: false,
			asyncFallback: AsyncFallback,
			srcDir: "src/pages",
			shellPath: "src/shell.tsx",
		}) as FrameMasterPlugin,
	],
} satisfies FrameMasterConfig;
