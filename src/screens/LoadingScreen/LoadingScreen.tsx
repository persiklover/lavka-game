import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { LoaderIcon } from './icons/LoaderIcon';

import { GameState, gameStateAtom } from '@/state/gameState';
import { Screen } from '@/layout/Screen';
import { GameBridge } from '@/api';
import { settingsAtom } from '@/state/settings';
import { rewardsAtom } from '@/state/rewards';
import { rewardAtom } from '@/state/reward';
import { livesAtom } from '@/state/lives';
import { scoreAtom } from '@/state/score';
import { hasCarouselAtom } from '@/state/hasCarousel';

export const LoadingScreen = () => {
	const [gameState, setGameState] = useAtom(gameStateAtom);
	const [, setSettings] = useAtom(settingsAtom);
	const [, setRewards] = useAtom(rewardsAtom);
	const [, setReward] = useAtom(rewardAtom);
	const [, setLives] = useAtom(livesAtom);
	const [, setScore] = useAtom(scoreAtom);
	const [, setHasCarousel] = useAtom(hasCarouselAtom);

	useEffect(() => {
		GameBridge.send({ event: 'get-config' });
		const removeListener = GameBridge.onMessage((message) => {
			const { event } = message;
			if (event === 'set-config') {
				const { data } = message;
				if ('error' in data) {
					console.error(data.error);
				} else {
					switch (data.status) {
						case 'not_played': {
							setRewards(data.items);
							setSettings(data.settings);
							setLives(data.settings.lives);
							setScore(0);
							setHasCarousel(data.hasCarousel);
							if (!data.hasCarousel) {
								setGameState(GameState.GAME);
							} else {
								setGameState(GameState.MENU);
							}
							break;
						}
						case 'win': {
							setReward(data.reward);
							setGameState(GameState.WIN);
							break;
						}
						case 'lose': {
							setGameState(GameState.LOSE);
							break;
						}
					}
				}
			}
		});

		return () => {
			removeListener();
		};
	}, [setGameState, setSettings, setRewards, setReward, setLives, setScore, setHasCarousel]);

	return (
		<Screen className="flex justify-center items-center" active={gameState === GameState.LOADING}>
			<LoaderIcon />
		</Screen>
	);
};
