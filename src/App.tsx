import { useEffect } from 'react';
import { useAtomValue } from 'jotai';

import { CloudsBackground } from './layout/CloudsBackground';
import { BackButton } from './layout/BackButton';
import { LoadingScreen } from './screens/LoadingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { WinScreen } from './screens/WinScreen';
import { LoseScreen } from './screens/LoseScreen';
import { GameBridge } from './api';
import { PauseScreen } from './screens/PauseScreen';
import { settingsAtom } from './state/settings';

import './App.scss';

function App() {
	const settings = useAtomValue(settingsAtom);

	useEffect(() => {
		GameBridge.init();
	}, []);

	return (
		<div id="app">
			{import.meta.env.DEV && (
				<div className="z-[999] fixed left-0 top-o">
					<button
						className="bg-gray-400 text-2xl"
						onClick={() => GameBridge.send({ event: 'pause' })}
					>
						Pause
					</button>
				</div>
			)}
			<CloudsBackground />
			<div className="hidden fixed z-10 left-0 top-0 p-4">
				<BackButton />
			</div>
			<LoadingScreen />
			<MenuScreen />
			{settings && <GameScreen settings={settings} />}
			<WinScreen />
			<LoseScreen />
			<PauseScreen />
		</div>
	);
}

export default App;
