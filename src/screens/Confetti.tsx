import { useEffect, useRef, useState } from 'react';

import { clsx } from '@/utils/clsx';

interface ConfettiProps {
	count?: number;
	duration?: number; // ms
	onComplete?: () => void;
}

export const Confetti = ({ count = 60, duration = 5000, onComplete }: ConfettiProps) => {
	const [visible, setVisible] = useState(true);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const ctx = canvas.getContext('2d')!;
		const width = window.innerWidth;
		const height = window.innerHeight;
		canvas.width = width;
		canvas.height = height;

		const pieces = Array.from({ length: count }, () => ({
			x: Math.random() * width,
			y: Math.random() * -height, // начинаем сверху
			r: Math.random() * 6 + 4,
			dx: Math.random() * 2 - 1,
			dy: Math.random() * 2 + 2,
			rotation: Math.random() * 360,
			color: ['#FFCB05', '#00C389', '#FF4D9D', '#1976D2', '#66BB6A'][Math.floor(Math.random() * 5)],
		}));

		let animationId: number;
		let completed = false;

		function draw() {
			ctx.clearRect(0, 0, width, height);
			for (const p of pieces) {
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate((p.rotation * Math.PI) / 180);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
				ctx.restore();
			}
		}

		function update() {
			for (const p of pieces) {
				p.y += p.dy;
				p.x += p.dx;
				p.rotation += 5;
			}
		}

		function animate() {
			update();
			draw();
			animationId = requestAnimationFrame(animate);
		}

		animate();

		const timer = setTimeout(() => {
			if (!completed) {
				cancelAnimationFrame(animationId);
				onComplete?.();
				completed = true;
				setVisible(false);
			}
		}, duration);

		return () => {
			clearTimeout(timer);
			cancelAnimationFrame(animationId);
		};
	}, [count, duration, onComplete]);

	return (
		<canvas
			ref={canvasRef}
			className={clsx(
				'fixed z-50 inset-0 pointer-events-none opacity-0 transition-opacity duration-500',
				visible && 'opacity-100'
			)}
		/>
	);
};
