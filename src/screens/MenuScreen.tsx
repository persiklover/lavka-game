import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { Button } from '@/ui/Button';
import { Screen } from '@/layout/Screen';
import { GameState, gameStateAtom } from '@/state/gameState';
import { PrizeSlider } from '@/layout/PrizeSlider';
import { GameBridge } from '@/api';

export const MenuScreen = () => {
	const [gameState, setGameState] = useAtom(gameStateAtom);

	const onPlayClick = () => {
		GameBridge.send({ event: 'state', data: { status: 'started' } });
		setGameState(GameState.GAME);
	};

	const onClickRules = () => {
		GameBridge.send({ event: 'rules' });
	};

	useEffect(() => {
		if (gameState === GameState.MENU) {
			GameBridge.send({ event: 'init-game' });
		}
	}, [gameState]);

	return (
		<Screen active={gameState === GameState.MENU}>
			<div className="flex flex-col pt-20 px-8 text-center">
				<h1 className="font-[1000] text-[43.828px] leading-[58.438px] tracking-[-1px]">
					У нас игра!
				</h1>

				<p className="font-medium text-[20px] leading-[23px] tracking-[-0.2px]">
					За победу подарим один из&nbsp;призов
				</p>
			</div>

			<div className="fixed top-1/2 -translate-y-1/2">
				<PrizeSlider />
			</div>

			<div className="fixed bottom-11 w-full flex flex-col gap-2.5 pt-20 px-8">
				<Button onClick={onPlayClick}>Играть</Button>
				<button className="m-2 font-medium underline" onClick={onClickRules}>
					Правила игры
				</button>
			</div>
		</Screen>
	);
};
