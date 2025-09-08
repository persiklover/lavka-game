import { useAtomValue } from 'jotai';

import { GameBridge } from '@/api';
import { livesAtom } from '@/state/lives';
import { scoreAtom } from '@/state/score';

export const BackButton = () => {
	const lives = useAtomValue(livesAtom);
	const score = useAtomValue(scoreAtom);

	const onClick = () => {
		GameBridge.send({
			event: 'state',
			data: {
				status: 'paused',
				score,
				attempts: lives, // остаток жизней или времени (3 в ряд)
			},
		});
	};

	return (
		<button
			className="flex w-12 h-12 flex-col justify-center items-center shrink-0 rounded-full bg-white shadow-[0px_8px_20px_0px_rgba(0,0,0,0.12)]"
			onClick={onClick}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
			>
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M7.8 11L13.4 5.4L12 4L4 12L12 20L13.4 18.6L7.8 13H20V11H7.8Z"
					fill="#21201F"
				/>
			</svg>
		</button>
	);
};
