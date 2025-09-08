import { atom } from 'jotai';

export enum GameState {
	LOADING,
	MENU,
	GAME,
	WIN,
	LOSE,
}

export const gameStateAtom = atom<GameState>(GameState.LOADING);
