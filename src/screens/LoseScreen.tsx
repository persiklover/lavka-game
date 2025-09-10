import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import { Screen } from '@/layout/Screen';
import { GameState, gameStateAtom } from '@/state/gameState';
import { Button } from '@/ui/Button';
import { useSyncedRef } from '@/hooks/useSyncedRef';
import { targetCameraYAtom } from '@/state/cameraY';
import { clsx } from '@/utils/clsx';
import { GameBridge } from '@/api';

export const LoseScreen = () => {
	const gameState = useAtomValue(gameStateAtom);

	const [ready, setReady] = useState(false);
	const hasRunOnceRef = useRef(false);

	const [targetCameraY, setTargetCameraY] = useAtom(targetCameraYAtom);
	const targetCameraYRef = useSyncedRef(targetCameraY);

	useEffect(() => {
		if (gameState !== GameState.LOSE || hasRunOnceRef.current) return;

		hasRunOnceRef.current = true;

		setTargetCameraY(targetCameraYRef.current - 400);
		setTimeout(() => {
			setReady(true);
		}, 850);
	}, [gameState, targetCameraYRef, setTargetCameraY]);

	const onConfirmClick = () => {
		GameBridge.send({ event: 'confirm' });
	};

	return (
		<Screen active={gameState === GameState.LOSE}>
			<div
				className={clsx(
					'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-full w-full flex flex-col gap-4 px-8 text-center',
					'opacity-0 transition-opacity duration-500',
					ready && 'opacity-100'
				)}
			>
				<h1 className="font-[1000] text-[43.828px] leading-none tracking-[-1px]">
					Повезёт
					<br />в другой раз!
				</h1>

				<p className="font-medium text-[20px] leading-[23px] tracking-[-0.2px]">
					Заказывайте в Лавке
					<br />и играйте снова
				</p>
			</div>

			<div
				className={clsx(
					'fixed bottom-[5dvh] w-full flex flex-col gap-2.5 pt-20 px-8',
					'opacity-0 transition-opacity duration-500 delay-700',
					ready && 'opacity-100'
				)}
			>
				<Button onClick={onConfirmClick}>Эх, ну ладно</Button>
			</div>
		</Screen>
	);
};
