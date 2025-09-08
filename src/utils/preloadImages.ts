export async function preloadImages(paths: string[]): Promise<HTMLImageElement[]> {
	const result: HTMLImageElement[] = [];
	await Promise.all(
		paths.map((path, index) => {
			return new Promise<void>((resolve) => {
				const img = new Image();
				img.src = path;
				img.onload = () => {
					result[index] = img;
					resolve();
				};
			});
		})
	);
	return result;
}
