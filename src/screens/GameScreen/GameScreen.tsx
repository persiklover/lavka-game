/* eslint-disable @typescript-eslint/no-shadow */
import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import Matter, { Body, Constraint, IChamferableBodyDefinition } from 'matter-js';

import { BagIcon } from './icons/BagIcon';
import { HeartIcon } from './icons/HeartIcon';

import { GameState, gameStateAtom } from '@/state/gameState';
import { Screen } from '@/layout/Screen';
import { cameraYAtom, targetCameraYAtom } from '@/state/cameraY';
import { GameBridge } from '@/api';
import { Settings } from '@/state/settings';
import { isPausedAtom } from '@/state/isPaused';
import { livesAtom } from '@/state/lives';
import { scoreAtom } from '@/state/score';
import { clsx } from '@/utils/clsx';
import {
	ANIMATE_HAND_DOWN_SPEED,
	ANIMATE_HAND_UP_SPEED,
	BOX_HEIGHT,
	BOX_PLACEMENT_TOLERANCE_PX,
	BOX_WIDTH,
	CAMERA_STEP_PX,
	GROUND_HEIGHT,
	HAND_OSCILLATION_AMPLITUDE_PX,
	HAND_OSCILLATION_ANGLE_MAX_RAD,
	HAND_OSCILLATION_SPEED,
	IMG_SCALE,
	MIN_BOXES_TO_SWING,
	TILT_BY_DIFFICULTY,
} from '@/constants';
import { hasCarouselAtom } from '@/state/hasCarousel';
import { imagesAtom } from '@/state/images';

function useSyncedRef<T>(value: T) {
	const ref = useRef(value);
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}

const MS_PER_FRAME = 16;

const useDeltaRef = () => {
	const deltaRef = useRef(MS_PER_FRAME);
	const lastTimeRef = useRef(0);

	useEffect(() => {
		const update = (now: number) => {
			const newDelta = now - (lastTimeRef.current || now);
			lastTimeRef.current = now;
			deltaRef.current = Math.max(newDelta, 1);
			requestAnimationFrame(update);
		};
		requestAnimationFrame(update);
	}, []);

	return deltaRef;
};

type Difficulty = keyof typeof TILT_BY_DIFFICULTY;

export const GameScreen = ({ settings }: { settings: Settings }) => {
	const [gameState, setGameState] = useAtom(gameStateAtom);

	const images = useAtomValue(imagesAtom);

	const [ready, setReady] = useState(false);

	const difficulty: Difficulty = (settings.difficulty as Difficulty) ?? 5;
	const tiltMultiplier = TILT_BY_DIFFICULTY[difficulty];

	const deltaRef = useDeltaRef();

	const hasCarousel = useAtomValue(hasCarouselAtom);
	const hasCarouselRef = useSyncedRef(hasCarousel);

	const [isPaused, setIsPaused] = useAtom(isPausedAtom);
	const isPausedRef = useSyncedRef(isPaused);

	const [cameraY, setCameraY] = useAtom(cameraYAtom);
	const cameraYRef = useSyncedRef(cameraY);

	const [targetCameraY, setTargetCameraY] = useAtom(targetCameraYAtom);
	const targetCameraYRef = useSyncedRef(targetCameraY);

	/** Кол-во сброшенных боксов (не факт, что приземлились) */
	const [droppedBoxes, setDroppedBoxes] = useState(0);

	/** Кол-во приземлившихся боксов */
	const [score, setScore] = useAtom(scoreAtom);
	const scoreRef = useSyncedRef(score);

	const [lives, setLives] = useAtom(livesAtom);
	const livesRef = useSyncedRef(lives);

	const [canPlaceBoxes, setCanPlaceBoxes] = useState(false);
	const canPlaceBoxesRef = useSyncedRef(canPlaceBoxes);

	const [showFirstMissMessage, setShowFirstMissMessage] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const cameraAnimationFrameRef = useRef<number>(undefined);
	const handAnimationRef = useRef<number>(undefined);

	// Cleanup animation frames
	useEffect(() => {
		const cameraAnimationId = cameraAnimationFrameRef.current;
		const handAnimationId = handAnimationRef.current;
		return () => {
			if (cameraAnimationId) {
				cancelAnimationFrame(cameraAnimationId);
			}
			if (handAnimationId) {
				cancelAnimationFrame(handAnimationId);
			}
		};
	}, []);

	useEffect(() => {
		if (gameState !== GameState.GAME) return;

		const cleanupFns: (() => unknown)[] = [];

		async function setupGame() {
			if (gameState !== GameState.GAME) {
				return;
			}

			let isFirstBox = true;
			let firstBox: Body | null = null;
			let firstBoxPosition: Matter.Vector | null = null;

			let lastCollisionGroup = 1;

			let currentBox: Body;
			let currentJoint: Constraint | null;
			let boxHasLanded = false;

			let handMoving = false;

			setTargetCameraY(0);

			const pixelRatio = window.devicePixelRatio || 1;
			const width = window.innerWidth;
			const height = window.innerHeight;

			const canvas = canvasRef.current!;
			const ctx = canvas.getContext('2d') || undefined;
			if (ctx) {
				ctx.imageSmoothingEnabled = false;
				ctx.imageSmoothingQuality = 'high';
			}

			const handInitialXPos = width / 2;
			const handInitialYPos = -160;

			// Setup Matter.js
			const engine = Matter.Engine.create({
				positionIterations: 3,
				velocityIterations: 2,
				constraintIterations: 4,
				timing: {
					lastDelta: deltaRef.current,
				},
				gravity: { y: 4 },
			});
			const render = Matter.Render.create({
				canvas,
				context: ctx,
				engine,
				options: {
					// showDebug: import.meta.env.DEV,
					width: width,
					height: height,
					pixelRatio,
					background: 'transparent',
					wireframes: false,
					hasBounds: true,
				},
			});

			// Add images to cache
			render.textures = {
				[images!.house.left.src]: images!.house.left,
				[images!.house.right.src]: images!.house.right,
				[images!.hand.hold.src]: images!.hand.hold,
				[images!.hand.release.src]: images!.hand.release,
				[images!.box['front'].src]: images!.box['front'],
				[images!.box['back'].src]: images!.box['back'],
			};

			const world = engine.world;

			// Create hand
			const hand: Body = Matter.Bodies.rectangle(handInitialXPos, -999, 100, 120, {
				isStatic: true,
				collisionFilter: { group: -1, mask: 0 },
				render: {
					sprite: {
						texture: images!.hand.hold.src,
						xScale: 1 / IMG_SCALE,
						yScale: 1 / IMG_SCALE,
					},
				},
			});
			Matter.World.add(world, [hand]);

			// Create ground
			const ground = Matter.Bodies.rectangle(
				width / 2,
				height - GROUND_HEIGHT / 2,
				width,
				GROUND_HEIGHT,
				{
					label: 'ground',
					isStatic: true,
					render: { fillStyle: '#00B931' },
				}
			);

			const houseLeft = Matter.Bodies.rectangle(
				100 / 2,
				height - 320 / 2 - GROUND_HEIGHT,
				100,
				320,
				{
					isStatic: true,
					collisionFilter: { group: -1, mask: 0 },
					render: {
						sprite: {
							texture: images!.house.left.src,
							xScale: 1 / IMG_SCALE,
							yScale: 1 / IMG_SCALE,
						},
					},
				}
			);

			const houseRight = Matter.Bodies.rectangle(
				width - 100 / 2,
				height - 320 / 2 - GROUND_HEIGHT,
				100,
				320,
				{
					isStatic: true,
					collisionFilter: { group: -1, mask: 0 },
					render: {
						sprite: {
							texture: images!.house.right.src,
							xScale: 1 / IMG_SCALE,
							yScale: 1 / IMG_SCALE,
						},
					},
				}
			);

			Matter.World.add(world, [ground, houseLeft, houseRight]);

			// Start renderer
			Matter.Render.run(render);

			// Run the engine
			const runner = Matter.Runner.create();
			Matter.Runner.run(runner, engine);

			function updateCamera() {
				const delta = deltaRef.current;
				const currentY = cameraYRef.current;
				const targetY = targetCameraYRef.current;
				const distance = Math.abs(targetY - currentY);

				// Параметры плавности
				const MAX_SPEED = 5;
				const EASING_DISTANCE = 200; // Дистанция, на которой начинается замедление
				const MIN_SPEED = 0.5; // Минимальная скорость перед остановкой

				// Рассчитываем скорость с учетом плавного замедления
				let cameraSpeed = MAX_SPEED;
				if (distance < EASING_DISTANCE) {
					cameraSpeed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * (distance / EASING_DISTANCE);
				}

				let cameraYCurrent = cameraYRef.current;
				let hasChanged = false;

				if (currentY < targetY) {
					hasChanged = true;
					setCameraY((currentCameraY) => {
						let nextCameraY = currentCameraY + cameraSpeed * (delta / MS_PER_FRAME);
						if (nextCameraY > targetY) nextCameraY = targetY;
						if (nextCameraY === 0) {
							setReady(true);
							Matter.Body.setPosition(hand, {
								x: hand.position.x,
								y: handInitialYPos,
							});
							grabNewBox({ startOscillation: false });
						}
						cameraYCurrent = nextCameraY;
						return nextCameraY;
					});
				} else if (currentY > targetY) {
					hasChanged = true;
					setCameraY((currentCameraY) => {
						let nextCameraY = currentCameraY - cameraSpeed * (delta / MS_PER_FRAME);
						// Гарантируем, что не опустимся ниже target
						if (nextCameraY < targetY) nextCameraY = targetY;
						if (nextCameraY === targetY) {
							grabNewBox({ delay: 0 });
						}
						cameraYCurrent = nextCameraY;
						return nextCameraY;
					});
				}

				if (hasChanged) {
					render.bounds.min.y = cameraYCurrent;
					render.bounds.max.y = cameraYCurrent + height;

					const scale = render.options.pixelRatio || 1;
					render.context.setTransform(
						scale,
						0,
						0,
						scale,
						-render.bounds.min.x * scale,
						-render.bounds.min.y * scale
					);
				}

				cameraAnimationFrameRef.current = requestAnimationFrame(updateCamera);
			}
			updateCamera();

			const handleCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
				for (const pair of event.pairs) {
					const { bodyA, bodyB } = pair;
					const labels = [bodyA.label, bodyB.label];

					if (
						(bodyA.id === currentBox.id || bodyB.id === currentBox.id) &&
						bodyA.label === 'box' &&
						bodyB.label === 'box' &&
						!boxHasLanded
					) {
						boxHasLanded = true;
						onBoxLandedOnBox();
					} else if (labels.includes('box') && labels.includes('ground')) {
						if (isFirstBox) {
							isFirstBox = false;
							firstBox = currentBox;
							firstBoxPosition = currentBox.position;
							setScore((count) => count + 1);

							// Получаем глубину проникновения
							const { collision } = pair;
							const penetration = collision.depth;

							// Корректируем позицию
							Matter.Body.setPosition(currentBox, {
								x: currentBox.position.x,
								y: currentBox.position.y - penetration,
							});

							// Зафиксировать кубик к земле
							const groundConstraint = Matter.Constraint.create({
								bodyA: ground,
								bodyB: firstBox,
								pointA: {
									x: firstBox.position.x - ground.position.x,
									y: firstBox.position.y - ground.position.y,
								},
								pointB: { x: 0, y: 0 },
								stiffness: 1,
								length: 0,
								render: { visible: false },
							});
							Matter.World.add(world, groundConstraint);

							// Также заморозить движение
							Matter.Body.setInertia(currentBox, Infinity);
							Matter.Sleeping.set(firstBox, true);

							grabNewBox({ delay: 1_000 });
						} else if (bodyA.id !== firstBox?.id && bodyB.id !== firstBox?.id) {
							// Обработка промаха
							handleBoxMiss(currentBox);
						}
					}
				}
			};

			const handlePlugins = () => {
				for (const body of world.bodies) {
					if (body.plugin?.freezeRotation) {
						Matter.Body.setAngle(body, 0);
						Matter.Body.setAngularVelocity(body, 0);
					}

					if (body.plugin?.freezeAngle) {
						Matter.Body.setAngle(body, body.plugin.freezeAngle);
						// Matter.Body.setAngularVelocity(body, body.angularVelocity);
					}

					if (body.label === 'box' && body.plugin?.missed) {
						const box = body;
						if (box.position.y > render.bounds.max.y + 200) {
							Matter.World.remove(world, box, true);
						}
					}
				}
			};

			// Раскачивание первого блока
			const swingConfig = {
				baseSpeed: 0.0175,
				speedMultiplier: 0.00625,
				baseAngle: 0.0025,
				angleMultiplier: 0.0115,
				maxSwingAngle: 0.0275,
				minBoxesToSwing: MIN_BOXES_TO_SWING,
			};

			let swingAngle = 0;
			let prevAngle = 0;

			const handleFirstBoxRotation = () => {
				if (!firstBox || !firstBoxPosition || scoreRef.current < swingConfig.minBoxesToSwing) {
					return;
				}

				const delta = deltaRef.current;
				const shouldSwing = !isPausedRef.current;

				let currentAngle = prevAngle;

				if (shouldSwing) {
					const dynamicSpeed =
						swingConfig.baseSpeed + Math.log(scoreRef.current + 1) * swingConfig.speedMultiplier;

					const dynamicMaxAngle = Math.min(
						swingConfig.baseAngle + Math.log(scoreRef.current + 1) * swingConfig.angleMultiplier,
						swingConfig.maxSwingAngle
					);

					swingAngle += dynamicSpeed * (delta / MS_PER_FRAME);
					currentAngle = Math.sin(swingAngle) * dynamicMaxAngle * tiltMultiplier;
				}

				// Вычисляем смещение для вращения вокруг нижней точки
				const pivotOffset = BOX_HEIGHT / 2;
				const rotatedOffsetX = pivotOffset * Math.sin(currentAngle);
				const rotatedOffsetY = pivotOffset * (1 - Math.cos(currentAngle));

				// Устанавливаем угол и позицию с учетом смещения
				Matter.Body.setAngle(firstBox, currentAngle);
				Matter.Body.setPosition(firstBox, {
					x: firstBoxPosition.x + rotatedOffsetX,
					y: firstBoxPosition.y + rotatedOffsetY,
				});

				prevAngle = currentAngle;
			};

			const handleBeforeUpdate = () => {
				handlePlugins();
				handleFirstBoxRotation();

				for (const body of world.bodies) {
					if (body.plugin?.syncRotationWith) {
						Matter.Body.setAngle(body, body.plugin.syncRotationWith.angle);
						Matter.Body.setAngularVelocity(body, 0);
					}
				}
			};

			function onFinishGame(score: number, lives: number) {
				GameBridge.send({
					event: 'state',
					data: {
						status: 'finished',
						score: score, // placedBoxesRef.current,
						attempts: lives, // livesRef.current, // остаток жизней
					},
				});
			}

			function onWin(score: number, lives: number) {
				Matter.World.remove(world, hand, true);
				setCanPlaceBoxes(false);
				if (hasCarouselRef.current) {
					setGameState(GameState.WIN);
				} else setTimeout(freezeWorld, 150);
				onFinishGame(score, lives);
			}

			function onLose(score: number, lives: number) {
				Matter.World.remove(world, hand, true);
				setCanPlaceBoxes(false);
				if (hasCarouselRef.current) {
					setGameState(GameState.LOSE);
				} else setTimeout(freezeWorld, 150);
				onFinishGame(score, lives);
			}

			function onBoxLandedOnBox() {
				// Поиск предыдущего бокса (предпоследнего в мире с label === 'box')
				const allBoxes = world.bodies.filter((b) => b.label === 'box' && b.id !== currentBox.id);
				const lastBox = allBoxes[allBoxes.length - 1];

				if (lastBox) {
					const dx = currentBox.position.x - lastBox.position.x;
					if (Math.abs(dx) > BOX_PLACEMENT_TOLERANCE_PX) {
						// Обработка промаха
						handleBoxMiss(currentBox, dx);
					} else {
						lastCollisionGroup++;
						currentBox.collisionFilter = { group: lastCollisionGroup };

						currentBox.plugin.freezeRotation = false;
						Matter.Body.setInertia(currentBox, Infinity);
						Matter.Sleeping.set(currentBox, true);

						// Жестко устанавливаем позицию блока точно над предыдущим
						const offsetY = BOX_HEIGHT - 1; // -1 для плотной посадки без коллизии
						const exactX = currentBox.position.x;
						const exactY = lastBox.position.y - offsetY;
						Matter.Body.setPosition(currentBox, { x: exactX, y: exactY });
						Matter.Body.setVelocity(currentBox, { x: 0, y: 0 });

						Matter.Body.setAngle(currentBox, lastBox.angle);
						Matter.Body.setAngularVelocity(currentBox, 0);
						// Добавляем синхронизацию поворота через плагин
						currentBox.plugin.syncRotationWith = lastBox;

						// Успешная установка - создаем соединение
						const constraint = Matter.Constraint.create({
							bodyA: lastBox,
							bodyB: currentBox,
							pointA: {
								x: currentBox.position.x - lastBox.position.x,
								y: currentBox.position.y - lastBox.position.y - 1,
							},
							pointB: { x: 0, y: 0 },
							stiffness: 1,
							length: 0,
							render: { visible: import.meta.env.DEV },
						});
						Matter.World.add(world, constraint);

						setScore((score) => {
							const nextScore = score + 1;
							if (nextScore === settings.points) {
								onWin(nextScore, livesRef.current);
							} else {
								setTargetCameraY((y) => y - CAMERA_STEP_PX + scoreRef.current * 0.2);
							}
							return nextScore;
						});
					}
				}
			}

			function grabNewBox(options?: { delay?: number; startOscillation?: boolean }) {
				const { delay = 500, startOscillation = true } = options || {};
				setTimeout(() => {
					if (livesRef.current <= 0) return;
					if (scoreRef.current === settings.points) return;

					if (hand.render.sprite) {
						// Возвращаем руку в исходное состояние
						hand.render.sprite.texture = images!.hand.hold.src;
					}

					// сбрасываем x координату руки
					Matter.Body.setPosition(hand, {
						x: handInitialXPos,
						y: hand.position.y,
					});
					Matter.Body.setAngle(hand, 0);

					spawnNewBox();
					animateHandDown(() => {
						setCanPlaceBoxes(true);
						if (startOscillation) {
							startHandOscillation();
						}
						currentBox.plugin.freezeRotation = false; // снятие заморозки
					});
				}, delay);
			}

			function handleBoxMiss(currentBox: Matter.Body, dx = 0) {
				setLives((prev) => {
					const nextLives = prev - 1;
					if (nextLives === settings.lives - 1) {
						setShowFirstMissMessage(true);
					}

					if (nextLives <= 0) {
						onLose(scoreRef.current, nextLives);
					} else {
						grabNewBox({ delay: 1_500 });
					}
					return nextLives;
				});

				currentBox.plugin.missed = true;

				// отключаем фиксацию
				currentBox.plugin.freezeRotation = false;
				Matter.Sleeping.set(currentBox, false);

				currentBox.collisionFilter = { group: -1 };

				// Даем легкий поворот для эффекта соскальзывания
				Matter.Body.setAngularVelocity(currentBox, 0.0215 * (dx > 0 ? 1 : -1));
			}

			function createBox(x = width / 2, y = cameraYRef.current - 110) {
				const index = Math.random() > 0.5 ? 1 : 0;
				const img = [images!.box['front'], images!.box['back']][index];

				const isSecondBox = index === 1;
				const manualOffsetPx = isSecondBox ? 10 : 1;

				const yOffset =
					((BOX_HEIGHT - img.height / IMG_SCALE + manualOffsetPx) / (2 * BOX_HEIGHT)) * -1;

				const boxOptions: IChamferableBodyDefinition = {
					label: 'box',
					mass: 1, // Четко заданная масса
					friction: 0.3, // Умеренное трение
					frictionStatic: 0.5, // Статическое трение
					// inertia: Infinity,
					collisionFilter: {
						group: lastCollisionGroup,
					},
					render: {
						fillStyle: '#2196f3',
						sprite: {
							texture: img.src,
							xScale: 1 / IMG_SCALE,
							yScale: 1 / IMG_SCALE,
							// @ts-expect-error Unknown property
							yOffset,
						},
					},
				};

				const box = Matter.Bodies.rectangle(x, y, BOX_WIDTH, BOX_HEIGHT, boxOptions);

				box.plugin = { freezeRotation: true };

				return box;
			}

			function spawnNewBox() {
				boxHasLanded = false;

				const box = createBox();

				const joint = Matter.Constraint.create({
					bodyA: hand,
					bodyB: box,
					pointA: { x: -2, y: 32 },
					pointB: { x: 0, y: -65 },
					stiffness: 1,
					length: 0,
					render: {
						visible: false,
					},
				});

				currentBox = box;
				currentJoint = joint;

				Matter.World.remove(world, [hand]);

				// Добавляем руку в конец, чтобы имитировать высокий z-index
				Matter.World.add(world, [box, joint, hand]);
			}

			const animateHand = (targetY: number, speed: number, callback?: () => void) => {
				const update = () => {
					const delta = deltaRef.current;

					const y = hand.position.y;
					const direction = targetY > y ? 1 : -1;
					const distance = Math.abs(targetY - y);
					const stepSize = Math.min(speed * (delta / 16), distance);

					const handPositionX = hand.position.x;
					if (distance > 0.1) {
						Matter.Body.setPosition(hand, {
							x: handPositionX,
							y: y + stepSize * direction,
						});
						handAnimationRef.current = requestAnimationFrame(update);
					} else {
						Matter.Body.setPosition(hand, { x: handPositionX, y: targetY });
						callback?.();
					}
				};
				handAnimationRef.current = requestAnimationFrame(update);
			};

			function animateHandUp(callback?: () => void) {
				handMoving = false;
				const targetY = cameraYRef.current - 170;
				animateHand(targetY, ANIMATE_HAND_UP_SPEED, callback);
			}

			function animateHandDown(callback?: () => void) {
				const initialTargetY = cameraYRef.current - 170;
				Matter.Body.setPosition(hand, {
					x: hand.position.x,
					y: initialTargetY,
				});
				const targetY = cameraYRef.current + 50;
				animateHand(targetY, ANIMATE_HAND_DOWN_SPEED, () => {
					handMoving = true;
					callback?.();
				});
			}

			function startHandOscillation() {
				if (!handMoving || isPausedRef.current) return;

				const baseX = hand.position.x;
				const swingOriginY = hand.position.y - 60;
				let phase = 0; // Фаза для синусоидального колебания

				// Рассчет скорости фазы для сохранения исходной частоты колебаний
				const PHASE_SPEED =
					(HAND_OSCILLATION_SPEED * Math.PI) / (2 * HAND_OSCILLATION_ANGLE_MAX_RAD);

				let angle = 0;

				function update() {
					if (!handMoving) return;

					const delta = deltaRef.current;

					if (!isPausedRef.current) {
						phase += PHASE_SPEED * (delta / MS_PER_FRAME);

						// Колебание с плавным замедлением на краях
						angle = HAND_OSCILLATION_ANGLE_MAX_RAD * Math.sin(phase);
					}

					// Небольшое смещение по X — противоположно углу
					const xOffset = -Math.sin(angle) * HAND_OSCILLATION_AMPLITUDE_PX;
					const centerX = baseX + xOffset;

					const offset = Matter.Vector.rotate({ x: 0, y: 60 }, angle);
					const newPosition = Matter.Vector.add({ x: centerX, y: swingOriginY }, offset);
					Matter.Body.setPosition(hand, newPosition);
					Matter.Body.setAngle(hand, angle);

					if (currentJoint && currentBox) {
						const boxOffset = Matter.Vector.rotate({ x: 0, y: 156 }, angle);
						const boxPosition = Matter.Vector.add({ x: centerX, y: swingOriginY }, boxOffset);
						Matter.Body.setPosition(currentBox, boxPosition);
						Matter.Body.setAngle(currentBox, angle);
					}

					requestAnimationFrame(update);
				}
				update();
			}

			const freezeWorld = () => {
				// Сохраняем текущие скорости всех тел
				if (firstBox) {
					firstBox.plugin.savedVelocity = Matter.Body.getVelocity(firstBox);
					firstBox.plugin.savedAngularVelocity = Matter.Body.getAngularVelocity(firstBox);
				}

				// Останавливаем runner
				Matter.Runner.stop(runner);

				// Останавливаем анимацию руки
				handMoving = false;
			};

			const unfreezeWorld = () => {
				// Восстанавливаем скорости всех тел
				if (firstBox) {
					if (firstBox.plugin.savedVelocity) {
						Matter.Body.setVelocity(firstBox, firstBox.plugin.savedVelocity);
						delete firstBox.plugin.savedVelocity;
					}
					if (firstBox.plugin.savedAngularVelocity) {
						Matter.Body.setAngularVelocity(firstBox, firstBox.plugin.savedAngularVelocity);
						delete firstBox.plugin.savedAngularVelocity;
					}
				}

				// Запускаем runner
				Matter.Runner.run(runner, engine);

				// Возобновляем анимацию руки
				handMoving = true;
				const shouldOscillate = scoreRef.current >= 1;
				if (shouldOscillate) startHandOscillation();
			};

			const handlePause = () => {
				setIsPaused(true);
				freezeWorld();
			};

			const handleResume = () => {
				setIsPaused(false);
				unfreezeWorld();
			};

			const handleTap = () => {
				if (isPausedRef.current || !canPlaceBoxesRef.current || !currentJoint) return;
				setCanPlaceBoxes(false);

				// Скрываем стартовую подсказку
				setShowFirstMissMessage(false);

				Matter.World.remove(world, currentJoint, true);
				currentJoint = null;

				// Полный сброс всех движений
				Matter.Body.setAngle(currentBox, 0);
				Matter.Body.setVelocity(currentBox, { x: 0, y: 0 });

				// Замораживаем поворот (будет разморожен позже)
				currentBox.plugin.freezeRotation = true;

				setDroppedBoxes((count) => count + 1);

				if (hand.render.sprite) {
					hand.render.sprite.texture = images!.hand.release.src;
				}
				handMoving = false;

				animateHandUp();
			};

			// Event listeners
			canvas.addEventListener('pointerdown', handleTap);
			Matter.Events.on(engine, 'collisionStart', handleCollisionStart);
			Matter.Events.on(engine, 'beforeUpdate', handleBeforeUpdate);

			const removeOnMessageListener = GameBridge.onMessage((message) => {
				if (message.event === 'pause') handlePause();
				else if (
					message.event === 'resume' ||
					(message.event === 'state' && message.data.status === 'resumed')
				) {
					handleResume();
				}
			});

			cleanupFns.push(() => {
				canvas.removeEventListener('pointerdown', handleTap);
				// Matter.Events.off(engine, 'collisionStart', handleCollisionStart);
				// Matter.Events.off(engine, 'beforeUpdate', handleBeforeUpdate);
				handMoving = false;
				removeOnMessageListener();
				// Matter.Engine.clear(engine);
				// Matter.Render.stop(render);
				// Matter.Runner.stop(runner);
				// if (cameraAnimationFrameRef.current) cancelAnimationFrame(cameraAnimationFrameRef.current);
				// if (handAnimationRef.current) cancelAnimationFrame(handAnimationRef.current);
			});

			if (!hasCarousel) {
				// Игра готова и загрузилась
				GameBridge.send({ event: 'init-game' });
			}
		}

		setupGame();

		return () => {
			cleanupFns.forEach((fn) => fn());
		};
	}, [gameState]);

	return (
		<Screen active={[GameState.GAME, GameState.WIN, GameState.LOSE].includes(gameState)}>
			<div
				className={clsx(
					'fixed flex gap-2 right-0 top-0 z-1 p-4 opacity-0 transition-opacity duration-250',
					gameState === GameState.GAME && 'opacity-100'
				)}
			>
				<div className="h-12 flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-[0px_8px_20px_0px_rgba(0,0,0,0.12)]">
					<BagIcon />
					<span className="text-[#234B89] text-md font-medium">{settings.points - score}</span>
				</div>
				<div className="h-12 flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-[0px_8px_20px_0px_rgba(0,0,0,0.12)]">
					<HeartIcon />
					<span className="text-[#234B89] text-md font-medium">{lives}</span>
				</div>
			</div>
			<canvas ref={canvasRef}></canvas>
			{gameState === GameState.GAME && ready && !isPaused && (
				<>
					<p
						className={clsx(
							'absolute left-1/2 top-1/2 -translate-1/2 text-xl w-80 text-center leading-tight font-[400] opacity-0 transition-opacity duration-500 pointer-events-none',
							droppedBoxes === 0 && canPlaceBoxes && 'opacity-100'
						)}
					>
						Чтобы отпустить сумку,
						<br />
						нажимайте на экран
					</p>
					<p
						className={clsx(
							'absolute left-1/2 top-1/2 -translate-1/2 text-xl w-80 text-center leading-tight font-[400] opacity-0 transition-opacity duration-500 pointer-events-none',
							droppedBoxes === 1 && score === 1 && 'opacity-100'
						)}
					>
						Так держать!
						<br />
						Старайтесь ставить другие
						<br />
						сумки точно сверху
					</p>
					<p
						className={clsx(
							'absolute left-1/2 top-1/2 -translate-1/2 text-xl w-80 text-center leading-tight font-[400] opacity-0 transition-opacity duration-500 pointer-events-none',
							showFirstMissMessage && 'opacity-100'
						)}
					>
						Ой-ой! За каждый промах
						<br />
						вы теряете одну жизнь
					</p>
				</>
			)}
		</Screen>
	);
};
