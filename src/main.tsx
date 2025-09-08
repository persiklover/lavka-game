import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';
import { GameEvent } from './api.ts';

createRoot(document.getElementById('root')!).render(<App />);

window.addEventListener('message', (event) => {
	// Эмуляция работы с яндекс лавкой
	// if (import.meta.env.PROD) return;

	if (typeof event.data !== 'string') return;

	let parsed: any;
	try {
		parsed = JSON.parse(event.data);
	} catch {
		return;
	}

	console.log(parsed);

	if (parsed.event === 'get-config') {
		setTimeout(() => {
			const message: GameEvent = {
				event: 'set-config',
				data: {
					status: 'not_played',
					settings: {
						difficulty: 10,
						lives: 3,
						points: 5,
					},
					items: [
						{
							id: '1',
							title: 'Гранд латте за 1 рубль',
							imageUrl: './img/item1.png',
							expired: 3,
						},
						{
							id: '2',
							title: '1000 руб. на любой заказ в Лавке',
							imageUrl: './img/item2.png',
							expired: 5,
						},
						{
							id: '3',
							title: 'Бесплатная доставка',
							imageUrl: './img/item3.png',
							expired: 1,
						},
						{
							id: '4',
							title: 'test 1',
							imageUrl: './img/item1.png',
							expired: 1,
						},
						{
							id: '5',
							title: 'test 2',
							imageUrl: './img/item2.png',
							expired: 1,
						},
						{
							id: '6',
							title: 'test 3',
							imageUrl: './img/item3.png',
							expired: 1,
						},
						{
							id: '7',
							title: 'test 4',
							imageUrl: './img/item1.png',
							expired: 1,
						},
						{
							id: '8',
							title: 'test 5',
							imageUrl: './img/item2.png',
							expired: 1,
						},
						{
							id: '9',
							title: 'test 6',
							imageUrl: './img/item3.png',
							expired: 1,
						},
					],
					hasCarousel: true,
				},
			};

			// const message: GameEvent = {
			// 	event: 'set-config',
			// 	data: {
			// 		status: 'win',
			// 		reward: {
			// 			id: '2',
			// 			title: '1000 руб. на любой заказ в Лавке',
			// 			imageUrl: './img/item2.png',
			// 			expired: 3,
			// 		},
			// 	},
			// };

			// const message: GameEvent = {
			// 	event: 'set-config',
			// 	data: {
			// 		status: 'lose',
			// 	},
			// };

			window.postMessage(JSON.stringify(message), '*');
		}, 500); // Симуляция задержки при запросе на сервер

		// setTimeout(() => {
		// 	const message: GameEvent = { event: 'pause' };
		// 	window.postMessage(JSON.stringify(message), '*');

		// 	setTimeout(() => {
		// 		const message: GameEvent = { event: 'resume' };
		// 		window.postMessage(JSON.stringify(message), '*');
		// 	}, 1_000);
		// }, 3_500);
	} else if (parsed.event === 'get-reward') {
		setTimeout(() => {
			const rewards = [
				{
					id: '1',
					title: 'Гранд латте за 1 рубль',
					imageUrl: './img/item1.png',
					expired: 3,
				},
				{
					id: '2',
					title: '1000 руб. на любой заказ в Лавке',
					imageUrl: './img/item2.png',
					expired: 5,
				},
				{
					id: '3',
					title: 'Бесплатная доставка',
					imageUrl: './img/item3.png',
					expired: 1,
				},
				{
					id: '4',
					title: 'test 1',
					imageUrl: './img/item1.png',
					expired: 1,
				},
				{
					id: '5',
					title: 'test 2',
					imageUrl: './img/item2.png',
					expired: 1,
				},
				{
					id: '6',
					title: 'test 3',
					imageUrl: './img/item3.png',
					expired: 1,
				},
				{
					id: '7',
					title: 'test 4',
					imageUrl: './img/item1.png',
					expired: 1,
				},
				{
					id: '8',
					title: 'test 5',
					imageUrl: './img/item2.png',
					expired: 1,
				},
				{
					id: '9',
					title: 'test 6',
					imageUrl: './img/item3.png',
					expired: 1,
				},
			];

			const message: GameEvent = {
				event: 'set-reward',
				data: rewards[Math.floor(Math.random() * rewards.length)],
				// data: {
				// 	id: '6',
				// 	title: 'test 3',
				// 	imageUrl: './img/item3.png',
				// 	expired: 1,
				// },
			};

			window.postMessage(JSON.stringify(message), '*');
		}, 1_500);
	}
});
