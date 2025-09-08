import { atom } from 'jotai';

import type { Reward } from './reward';

export const rewardsAtom = atom<Reward[] | null>(null);
