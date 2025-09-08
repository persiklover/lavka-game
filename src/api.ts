export type GameEvent =
	| { event: 'get-config' }
	| {
			event: 'set-config';
			data:
				| {
						status: 'not_played';
						settings: {
							difficulty: number;
							lives: number;
							points: number;
						};
						items: Reward[];
						hasCarousel: boolean;
				  }
				| { status: 'win'; reward: Reward }
				| { status: 'lose' }
				| { error: 'unknown_error' };
	  }
	| { event: 'init-game' }
	| { event: 'pause' }
	| { event: 'resume' }
	| { event: 'get-reward' }
	| {
			event: 'set-reward';
			data: Reward | { error: 'unknown_error' };
	  }
	| {
			event: 'state';
			data:
				| {
						status: 'started';
				  }
				| {
						status: 'paused';
						score: number;
						attempts: number;
				  }
				| {
						status: 'resumed';
				  }
				| {
						status: 'finished';
						score: number;
						attempts: number;
				  };
	  }
	| { event: 'confirm' }
	| { event: 'rules' }
	| { event: 'view-reward' };

export interface Reward {
	id: string;
	title: string;
	imageUrl: string;
	expired: number;
}

export class GameBridge {
	private static listeners = new Set<(event: GameEvent) => void>();

	static send(event: GameEvent) {
		window.parent?.postMessage(JSON.stringify(event), '*');
	}

	static onMessage(handler: (event: GameEvent) => void) {
		GameBridge.listeners.add(handler);
		return () => GameBridge.listeners.delete(handler);
	}

	static init() {
		window.addEventListener('message', (e) => {
			try {
				const data = JSON.parse(e.data);
				if (typeof data === 'object' && 'event' in data) {
					GameBridge.listeners.forEach((cb) => cb(data));
				}
			} catch {
				/* empty */
			}
		});
	}
}
