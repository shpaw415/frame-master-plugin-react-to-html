export default async function AsyncPage() {
	const data = await new Promise<string>((resolve) => {
		setTimeout(() => {
			resolve("Async data loaded!");
		}, 1000);
	});

	return (
		<div>
			<h1>Async Page</h1>
			<p>This page is rendered asynchronously using React hooks.</p>
			<p>{data}</p>
		</div>
	);
}
