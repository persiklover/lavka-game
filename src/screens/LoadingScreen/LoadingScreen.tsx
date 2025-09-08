import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { LoaderIcon } from './icons/LoaderIcon';

import { GameState, gameStateAtom } from '@/state/gameState';
import { Screen } from '@/layout/Screen';
import { GameBridge } from '@/api';
import { useInitGame } from '@/hooks/useInitGame';

export const LoadingScreen = () => {
	const gameState = useAtomValue(gameStateAtom);
	const { initGame, handleConfigMessage } = useInitGame();

	useEffect(() => {
		let cleanupFn: (() => void) | undefined;

		const init = async () => {
			await initGame();
			cleanupFn = GameBridge.onMessage(handleConfigMessage);
		};
		init();

		return () => {
			cleanupFn?.();
		};
	}, [initGame, handleConfigMessage]);

	return (
		<Screen className="flex justify-center items-center" active={gameState === GameState.LOADING}>
			<LoaderIcon />
		</Screen>
	);
};
