import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';

import { PrizeCard } from './PrizeCard';

import { rewardsAtom } from '@/state/rewards';
import type { Reward } from '@/api';

interface PrizeSliderProps {
	speed?: number; // px per frame (~requestAnimationFrame), визуальная скорость
	reward?: Reward | null;
	onStop?: () => void;
	onPrizeCardAnimationFinished?: () => void;
}

type Mode = 'RUN' | 'DECEL' | 'STOP';

const GAP = 8; // соответствует className="gap-2"
const DECEL_DURATION_MS = 3_500;
const MIN_AHEAD_PX = window.innerWidth;

// плавное замедление
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const PrizeSlider = ({
	speed = 0.35,
	reward,
	onStop,
	onPrizeCardAnimationFinished,
}: PrizeSliderProps) => {
	const rewardId = reward?.id;
	const prizes = useAtomValue(rewardsAtom);

	const sliderRef = useRef<HTMLDivElement>(null);
	const animationRef = useRef<number | null>(null);

	// положение и режим прокрутки
	const positionRef = useRef(0);
	const speedRef = useRef(speed);
	const modeRef = useRef<Mode>('RUN');

	// параметры фазы DECEL
	const decelRef = useRef<{
		start: number;
		from: number;
		to: number;
		duration: number;
	} | null>(null);

	// основной цикл анимации
	useEffect(() => {
		if (!prizes || !sliderRef.current) return;
		const slider = sliderRef.current;

		const step = (now: number) => {
			let pos = positionRef.current;

			if (modeRef.current === 'DECEL' && decelRef.current) {
				const { start, from, to, duration } = decelRef.current;
				const t = Math.min(1, (now - start) / duration);
				pos = from + (to - from) * easeOutCubic(t);

				// выставляем стиль до возможной фиксации
				slider.style.transform = `translateX(${pos}px)`;
				positionRef.current = pos;

				if (t >= 1) {
					// Стоп, запуск анимаций карточек
					modeRef.current = 'STOP';
					decelRef.current = null;

					const allCards = Array.from(slider.querySelectorAll<HTMLElement>('[data-id]'));
					const center = slider.parentElement!.offsetWidth / 2;

					allCards.forEach((card) => {
						const rect = card.getBoundingClientRect();
						const cardCenter = rect.left + rect.width / 2;

						if (Math.abs(cardCenter - center) < rect.width / 2) {
							card.classList.add('animate-tilt-zoom');
							const handleEnd = () => {
								card.removeEventListener('animationend', handleEnd);
								onPrizeCardAnimationFinished?.();
							};
							card.addEventListener('animationend', handleEnd);
						} else if (cardCenter < center) {
							card.classList.add('animate-slide-left');
						} else {
							card.classList.add('animate-slide-right');
						}
					});

					onStop?.();
					animationRef.current = null;
					return;
				}
			} else if (modeRef.current === 'RUN') {
				// равномерная прокрутка
				pos -= speedRef.current;

				// рециклинг первого элемента
				const first = slider.children[0] as HTMLElement | undefined;
				if (first && first.clientWidth > 0 && pos <= -first.clientWidth) {
					slider.removeChild(first);
					slider.appendChild(first);
					pos += first.clientWidth + GAP;
				}

				slider.style.transform = `translateX(${pos}px)`;
				positionRef.current = pos;
			} else {
				// STOP — ничего не делаем
			}

			animationRef.current = requestAnimationFrame(step);
		};

		animationRef.current = requestAnimationFrame(step);
		return () => {
			if (animationRef.current) cancelAnimationFrame(animationRef.current);
			animationRef.current = null;
		};
	}, [prizes, onStop, onPrizeCardAnimationFinished]);

	// при изменении базовой скорости во время RUN
	useEffect(() => {
		speedRef.current = speed;
	}, [speed]);

	// запуск DECEL, когда пришёл rewardId
	useEffect(() => {
		if (!rewardId || !sliderRef.current || !prizes?.length) return;

		const slider = sliderRef.current;
		const container = slider.parentElement!;
		const containerCenter = container.offsetWidth / 2;
		const currentX = positionRef.current;

		// Вычисляем ширину элементов
		const firstCard = slider.children[0] as HTMLElement;
		if (!firstCard) return;

		const cardWidth = firstCard.offsetWidth;
		const cycleWidth = (cardWidth + GAP) * prizes.length - GAP;

		// Находим все целевые карточки
		const targetCards = Array.from(slider.querySelectorAll<HTMLElement>('[data-id]')).filter(
			(card) => card.dataset.id === rewardId
		);

		if (targetCards.length === 0) return;

		let bestTarget: number | null = null;
		let bestDistance = Infinity;

		// Ищем ближайшую цель впереди по направлению движения
		for (const card of targetCards) {
			const cardCenter = card.offsetLeft + card.offsetWidth / 2;
			let target = containerCenter - cardCenter;

			// Корректируем цель чтобы она была впереди
			while (target > currentX) {
				target -= cycleWidth;
			}

			// Добавляем дополнительный цикл если нужно обеспечить минимальную дистанцию
			if (currentX - target < MIN_AHEAD_PX) {
				target -= cycleWidth;
			}

			const distance = currentX - target;

			// Выбираем самую близкую цель впереди
			if (distance >= 0 && distance < bestDistance) {
				bestDistance = distance;
				bestTarget = target;
			}
		}

		// Фолбэк: если не нашли цель впереди, берем первую доступную
		if (bestTarget === null) {
			const cardCenter = targetCards[0].offsetLeft + targetCards[0].offsetWidth / 2;
			bestTarget = containerCenter - cardCenter - cycleWidth;
		}

		// Запускаем замедление
		modeRef.current = 'DECEL';
		decelRef.current = {
			start: performance.now(),
			from: currentX,
			to: bestTarget,
			duration: DECEL_DURATION_MS,
		};

		// гарантируем, что цикл анимации активен
		if (!animationRef.current) {
			animationRef.current = requestAnimationFrame(() => {
				if (slider) {
					// выставим текущее значение (без скачка)
					slider.style.transform = `translateX(${positionRef.current}px)`;
				}
				animationRef.current = requestAnimationFrame(function step() {
					return (animationRef.current = requestAnimationFrame(step));
				});
			});
		}
	}, [rewardId, prizes]);

	if (!prizes && reward != null) {
		return (
			<div className="w-full">
				<div className="flex justify-center gap-2 w-full will-change-transform">
					<PrizeCard
						ref={(node) => {
							if (!node) return;
							const handleAnimationEnd = () => {
								node.removeEventListener('animationend', handleAnimationEnd);
								onPrizeCardAnimationFinished?.();
							};
							node.addEventListener('animationend', handleAnimationEnd);
						}}
						title={reward.title}
						imageUrl={reward.imageUrl}
					/>
				</div>
			</div>
		);
	}

	if (!prizes) return <span>Загрузка призов...</span>;

	return (
		<div className="w-full">
			<div ref={sliderRef} className="flex gap-2 w-max will-change-transform">
				{[...prizes, ...prizes, ...prizes].map(({ id, title, imageUrl }, i) => (
					<div key={`${id}-${i}`} data-id={id}>
						<PrizeCard className="h-full" title={title} imageUrl={imageUrl} />
					</div>
				))}
			</div>
		</div>
	);
};
