import { atom } from 'jotai';

export interface Reward {
	id: string;
	title: string;
	imageUrl: string;
	expired: number;
}

export const rewardAtom = atom<Reward | null>(null);
