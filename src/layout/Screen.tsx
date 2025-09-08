import { HTMLAttributes } from 'react';

import { clsx } from '@/utils/clsx';

interface ScreenProps extends HTMLAttributes<HTMLDivElement> {
	active?: boolean;
}

export const Screen = ({ active, children, className, ...rest }: ScreenProps) => {
	return (
		<div
			{...rest}
			className={clsx(
				'fixed z-1 inset-0 opacity-0 transition-opacity duration-250 pointer-events-none',
				active && 'opacity-100 pointer-events-auto',
				className
			)}
		>
			{children}
		</div>
	);
};
