export default function ShouldNotBeCompiled() {
	return (
		<div>
			This file should not be compiled by the plugin, as it is a dynamic route
			page (it is located in a file named [id].tsx).
		</div>
	);
}
