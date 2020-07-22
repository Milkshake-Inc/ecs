export enum PressedState {
	Down = 'down',
	Up = 'up'
}

export default abstract class InputDevice {
	protected pressed: Map<any, PressedState.Down | PressedState.Up> = new Map();

	constructor() {
		this.addListeners();
	}

	protected abstract get listeners(): { [event: string]: EventListener };

	public update(deltaTime: number) {
		for (const key of Array.from(this.pressed.keys())) {
			if (this.isDownOnce(key)) this.pressed.set(key, null);
			if (this.isUpOnce(key)) this.pressed.delete(key);
		}
	}

	public isDown(btn: any) {
		return this.pressed.has(btn);
	}

	public isDownOnce(btn: any) {
		return this.pressed.get(btn) == PressedState.Down;
	}

	public isUpOnce(btn: any) {
		return this.pressed.get(btn) == PressedState.Up;
	}

	public destroy() {
		this.removeListeners();
	}

	protected addListeners() {
		for (const event of Object.keys(this.listeners)) {
			window.addEventListener(event, this.listeners[event], false);
		}
	}

	protected removeListeners() {
		for (const event of Object.keys(this.listeners)) {
			window.removeEventListener(event, this.listeners[event]);
		}
	}
}