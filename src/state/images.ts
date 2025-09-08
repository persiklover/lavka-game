import { atom } from 'jotai';

export const imagesAtom = atom<{
	hand: {
		hold: HTMLImageElement;
		release: HTMLImageElement;
	};
	box: {
		front: HTMLImageElement;
		back: HTMLImageElement;
	};
	house: {
		left: HTMLImageElement;
		right: HTMLImageElement;
	};
}>();
