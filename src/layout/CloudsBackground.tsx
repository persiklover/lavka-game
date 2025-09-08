import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { useAtomValue } from 'jotai';

import { cameraYAtom } from '@/state/cameraY';
import { useSyncedRef } from '@/hooks/useSyncedRef';

export const CloudsBackground = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const cameraY = useAtomValue(cameraYAtom);
	const cameraYRef = useSyncedRef(cameraY);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const width = window.innerWidth;
		const height = window.innerHeight;
		canvas.width = width;
		canvas.height = height;

		const engine = Matter.Engine.create({ positionIterations: 3 });
		const render = Matter.Render.create({
			canvas,
			engine,
			options: {
				// showDebug: true,
				width,
				height,
				background: '#B2F1FF',
				wireframes: false,
				hasBounds: true,
			},
		});

		const world = engine.world;

		const clouds = [
			{ src: './img/cloud1.png', x: width * 0.3, y: height * 0.1, scale: 1 / 6 },
			{ src: './img/cloud2.png', x: width * 0.1, y: height * 0.35, scale: 1.1 / 6 },
			{ src: './img/cloud3.png', x: width * 0.6, y: height * 0.6, scale: 0.95 / 6 },
			{ src: './img/cloud1.png', x: width * 0.7, y: height * 0.25, scale: 1.05 / 6 },
			{ src: './img/cloud2.png', x: width * 0.2, y: height * 0.7, scale: 0.9 / 6 },
			{ src: './img/cloud3.png', x: width * 0.8, y: height * 0.8, scale: 1.15 / 6 },
		];

		const cloudBodies = clouds.map((cloud) => {
			const body = Matter.Bodies.rectangle(cloud.x, cloud.y, 200, 100, {
				isStatic: true,
				label: 'cloud',
				collisionFilter: { group: -1, mask: 0 },
				render: {
					fillStyle: '#fefe00',
					sprite: {
						texture: cloud.src,
						xScale: cloud.scale,
						yScale: cloud.scale,
					},
				},
			});
			body.plugin = { initialY: cloud.y };
			return body;
		});

		Matter.World.add(world, cloudBodies);

		// Запуск
		Matter.Render.run(render);

		const runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);

		// Бесконечное движение и вертикальный параллакс
		Matter.Events.on(engine, 'beforeUpdate', () => {
			const parallaxY = cameraYRef.current * -0.8;

			for (const cloud of cloudBodies) {
				Matter.Body.setPosition(cloud, {
					x: cloud.position.x - 0.25,
					y: cloud.position.y,
				});
				if (cloud.position.x < -100) {
					Matter.Body.setPosition(cloud, {
						x: width + 100,
						y: cloud.position.y,
					});
				}

				const baseY = cloud.plugin.initialY;
				Matter.Body.setPosition(cloud, {
					x: cloud.position.x,
					y: baseY - parallaxY,
				});
			}

			// Обновляем трансформацию камеры
			render.bounds.min.y = cameraYRef.current;
			render.bounds.max.y = cameraYRef.current + height;
			// const scale = render.options.pixelRatio || 1;
			// render.context.setTransform(
			// 	scale,
			// 	0,
			// 	0,
			// 	scale,
			// 	-render.bounds.min.x * scale,
			// 	-render.bounds.min.y * scale
			// );
		});

		return () => {
			Matter.Render.stop(render);
			Matter.Runner.stop(runner);
			Matter.World.clear(world, false);
			Matter.Engine.clear(engine);
		};
	}, []);

	return <canvas ref={canvasRef} className="fixed -z-1 inset-0" />;
};
