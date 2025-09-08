import { atom } from 'jotai';

export type Settings = {
	difficulty: number;
	lives: number;
	points: number;
};

export const settingsAtom = atom<Settings | null>(null);
