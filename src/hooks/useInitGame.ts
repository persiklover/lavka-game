import { useSetAtom } from 'jotai';
import { useCallback } from 'react';

import { preloadImages } from '@/utils/preloadImages';
import { imagesAtom } from '@/state/images';
import { GameBridge, GameEvent } from '@/api';
import { settingsAtom } from '@/state/settings';
import { rewardsAtom } from '@/state/rewards';
import { rewardAtom } from '@/state/reward';
import { livesAtom } from '@/state/lives';
import { scoreAtom } from '@/state/score';
import { hasCarouselAtom } from '@/state/hasCarousel';
import { GameState, gameStateAtom } from '@/state/gameState';

export const useInitGame = () => {
	const setImages = useSetAtom(imagesAtom);
	const setGameState = useSetAtom(gameStateAtom);
	const setSettings = useSetAtom(settingsAtom);
	const setRewards = useSetAtom(rewardsAtom);
	const setReward = useSetAtom(rewardAtom);
	const setLives = useSetAtom(livesAtom);
	const setScore = useSetAtom(scoreAtom);
	const setHasCarousel = useSetAtom(hasCarouselAtom);

	const initGame = useCallback(async () => {
		const [handImages, boxImages, houseImages] = await Promise.all([
			preloadImages(['./img/hand-hold.png', './img/hand-release.png']),
			preloadImages(['./img/box1.png', './img/box2.png']),
			preloadImages(['./img/house-left.png', './img/house-right.png']),
		]);
		setImages({
			hand: { hold: handImages[0], release: handImages[1] },
			box: { front: boxImages[0], back: boxImages[1] },
			house: { left: houseImages[0], right: houseImages[1] },
		});

		GameBridge.send({ event: 'get-config' });
	}, [setImages]);

	const handleConfigMessage = useCallback(
		(message: GameEvent) => {
			const { event } = message;
			if (event === 'set-config') {
				const { data } = message;
				if ('error' in data) {
					console.error('Config error:', data.error);
					return;
				}

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
		},
		[setGameState, setHasCarousel, setLives, setReward, setRewards, setScore, setSettings]
	);

	return { initGame, handleConfigMessage };
};
