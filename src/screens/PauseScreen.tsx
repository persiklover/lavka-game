import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';

import { GameBridge } from '@/api';
import { Screen } from '@/layout/Screen';
import { isPausedAtom } from '@/state/isPaused';
import { Button } from '@/ui/Button';
import { GameState, gameStateAtom } from '@/state/gameState';
import { livesAtom } from '@/state/lives';
import { scoreAtom } from '@/state/score';

export const PauseScreen = () => {
	const gameState = useAtomValue(gameStateAtom);
	const [isPaused, setIsPaused] = useAtom(isPausedAtom);
	const lives = useAtomValue(livesAtom);
	const score = useAtomValue(scoreAtom);

	const handlePause = useCallback(() => {
		// Ставим игру на паузу только во время игры
		if (gameState !== GameState.GAME) return;

		setIsPaused(true);
		GameBridge.send({
			event: 'state',
			data: {
				status: 'paused',
				score,
				attempts: lives, // остаток жизней
			},
		});
	}, [gameState, score, lives, setIsPaused]);

	const handleResume = useCallback(() => {
		setIsPaused(false);
		GameBridge.send({ event: 'state', data: { status: 'resumed' } });
	}, [setIsPaused]);

	useEffect(() => {
		return;

		const onVisibilityChange = () => {
			if (document.hidden) handlePause();
		};

		window.addEventListener('blur', handlePause);
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			window.removeEventListener('blur', handlePause);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, [handlePause]);

	useEffect(() => {
		const removeListener = GameBridge.onMessage((message) => {
			const { event } = message;
			if (event === 'pause') {
				handlePause();
			} else if (event === 'resume') {
				handleResume();
			}
		});

		return () => {
			removeListener();
		};
	}, [handlePause, handleResume]);

	return (
		<Screen active={isPaused && gameState === GameState.GAME}>
			<div className={'fixed bottom-11 w-full flex flex-col gap-2.5 pt-20 px-8'}>
				<div className="fixed inset-0 bg-[#B2F1FF] opacity-50"></div>
				<Button className="z-1" onClick={handleResume}>
					Продолжить
				</Button>
			</div>
		</Screen>
	);
};
