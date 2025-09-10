import { useEffect, useRef } from 'react';

import { MS_PER_FRAME } from '@/constants';

export const useDeltaRef = () => {
	const deltaRef = useRef(MS_PER_FRAME);
	const lastTimeRef = useRef(0);

	useEffect(() => {
		const update = (now: number) => {
			const newDelta = now - (lastTimeRef.current || now);
			lastTimeRef.current = now;
			deltaRef.current = Math.max(newDelta, 1);
			requestAnimationFrame(update);
		};
		requestAnimationFrame(update);
	}, []);

	return deltaRef;
};
