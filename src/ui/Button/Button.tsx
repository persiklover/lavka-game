import { HTMLAttributes } from 'react';
import classNames from 'classnames';

export const Button = ({ className, children, ...rest }: HTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			{...rest}
			className={classNames(
				'bg-[#234B89] px-4 py-3.5 rounded-4xl text-xl text-white font-bold',
				className
			)}
		>
			{children}
		</button>
	);
};
