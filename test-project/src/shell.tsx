import type { JSX } from "react";

export default function Shell({ children }: { children: JSX.Element }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Test Project</title>
			</head>
			<body>{children}</body>
		</html>
	);
}
