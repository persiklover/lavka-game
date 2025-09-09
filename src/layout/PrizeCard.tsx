import { forwardRef } from 'react';
import classNames from 'classnames';

interface PrizeCardProps {
	className?: string;
	title: string;
	imageUrl: string;
}

export const PrizeCard = forwardRef<HTMLDivElement, PrizeCardProps>(
	({ className, title, imageUrl }, ref) => {
		return (
			<div
				ref={ref}
				className={classNames(
					'flex-shrink-0 flex flex-col w-45 p-4 pb-7 bg-white rounded-3xl text-[#234B89]',
					className
				)}
			>
				<div className="size-42 flex justify-center items-center">
					<img className="mb-2 max-w-full max-h-full object-cover" src={imageUrl} alt="Prize" />
				</div>
				<p className="mt-auto text-left text-[#21201F] font-medium text-[16px] leading-[17px] tracking-[-0.08px]">
					{title}
				</p>
			</div>
		);
	}
);

PrizeCard.displayName = 'PrizeCard';
