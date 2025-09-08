import classNames from 'classnames';
import { twMerge } from 'tailwind-merge';

export const clsx = (...args: (string | boolean | undefined)[]) => twMerge(classNames(args));
