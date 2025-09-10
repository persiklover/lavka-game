import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Confetti } from './Confetti';

import { Screen } from '@/layout/Screen';
import { GameState, gameStateAtom } from '@/state/gameState';
import { PrizeSlider } from '@/layout/PrizeSlider';
import { GameBridge } from '@/api';
import { rewardAtom } from '@/state/reward';
import { Button } from '@/ui/Button';
import { targetCameraYAtom } from '@/state/cameraY';
import { clsx } from '@/utils/clsx';
import { useSyncedRef } from '@/hooks/useSyncedRef';

export function num2word(value: number, words: string[]) {
	value = Math.abs(value) % 100;
	const num = value % 10;
	if (value > 10 && value < 20) return words[2];
	if (num > 1 && num < 5) return words[1];
	if (num == 1) return words[0];
	return words[2];
}

export const WinScreen = () => {
	const gameState = useAtomValue(gameStateAtom);
	const [reward, setReward] = useAtom(rewardAtom);

	const [ready, setReady] = useState(false);
	const hasRunOnceRef = useRef(false);

	const [targetCameraY, setTargetCameraY] = useAtom(targetCameraYAtom);
	const targetCameraYRef = useSyncedRef(targetCameraY);

	const [confettiAnimationFinished, setConfettiAnimationFinished] = useState(false);

	useEffect(() => {
		if (gameState !== GameState.WIN || hasRunOnceRef.current) return;

		hasRunOnceRef.current = true;

		if (reward) {
			setReady(true);
			setConfettiAnimationFinished(true);
			setPrizeAnimationFinished(true);
			return;
		} else {
			setTimeout(() => {
				setConfettiAnimationFinished(true);
				setTargetCameraY(targetCameraYRef.current - 400);
				setTimeout(() => {
					setReady(true);
				}, 850);
			}, 1_000);
		}
	}, [gameState, confettiAnimationFinished, reward, targetCameraYRef, setTargetCameraY]);

	useEffect(() => {
		if (gameState !== GameState.WIN || !ready || reward || !confettiAnimationFinished) return;

		const removeListener = GameBridge.onMessage((message) => {
			const { event } = message;
			if (event === 'set-reward') {
				const { data } = message;
				if ('error' in data) {
					console.error(data.error);
				} else {
					setReward(data);
					console.log('reward', data);
				}
			}
		});
		// Не отправляем запрос на награду сразу
		setTimeout(() => {
			GameBridge.send({ event: 'get-reward' });
		}, 1_500);

		return () => {
			removeListener();
		};
	}, [gameState, ready, reward, confettiAnimationFinished, setReward]);

	const [prizeAnimationFinished, setPrizeAnimationFinished] = useState(false);

	const onConfirmClick = () => {
		GameBridge.send({ event: 'confirm' });
	};

	const onConfettiAnimationFinished = useCallback(() => {
		setConfettiAnimationFinished(true);
	}, []);

	const onPrizeCardAnimationFinished = useCallback(() => {
		if (prizeAnimationFinished) return;
		console.log('onPrizeCardAnimationFinished');
		GameBridge.send({ event: 'view-reward' });
		setPrizeAnimationFinished(true);
	}, [prizeAnimationFinished]);

	if (gameState !== GameState.WIN) return null;

	return (
		<Screen active={gameState === GameState.WIN}>
			<Confetti onComplete={onConfettiAnimationFinished} />

			<>
				<div
					className={clsx(
						'flex flex-col pt-20 px-8 text-center opacity-0 transition-opacity duration-500',
						ready && 'opacity-100'
					)}
				>
					<h1 className="font-[1000] text-[43.828px] leading-[58.438px] tracking-[-1px]">
						Это победа!
					</h1>

					<p className="font-medium text-[20px] leading-[23px] tracking-[-0.2px]">
						А вот и ваш приз...
					</p>
				</div>

				<div
					className={clsx(
						'fixed w-full top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-500 delay-1500',
						(ready || reward != null) && 'opacity-100'
					)}
				>
					<PrizeSlider
						speed={20}
						reward={reward}
						onPrizeCardAnimationFinished={onPrizeCardAnimationFinished}
					/>
				</div>

				<div
					className={clsx(
						'fixed bottom-11 w-full flex flex-col gap-[5.5dvh] px-8 pointer-events-none opacity-0 transition-opacity duration-500 delay-1000',
						prizeAnimationFinished && 'opacity-100 pointer-events-auto'
					)}
				>
					{reward && (
						<p className="w-80 self-center text-center text-[16px] leading-tight font-medium pointer-events-none">
							Выдадим после доставки,
							<br />и будет действителен {reward.expired}{' '}
							{num2word(reward.expired, ['день', 'дня', 'дней'])}
						</p>
					)}
					<Button onClick={onConfirmClick}>Ура, спасибо!</Button>
				</div>
			</>
		</Screen>
	);
};
