/* eslint-disable no-mixed-spaces-and-tabs */

import InputDevice, { PressedState } from './InputDevice';
import { Manager, DIRECTION_ALL } from 'hammerjs';
import InputManager from './InputManager';
import { Control, Gesture } from './Control';

const DeviceSensitivity = window.screen.width * 0.0001;

export default class Touch extends InputDevice {
	protected manager: HammerManager;

	protected lastEvent: Map<Gesture, HammerInput> = new Map();

	protected get listeners() {
		// https://hammerjs.github.io/recognizer-pan/
		return {
			tap: (event: HammerInput) => this.handleGesture(Gesture.Tap, event),
			pan: (event: HammerInput) => this.handleGesture(Gesture.Pan, event),
			panend: (event: HammerInput) => this.handleGestureEnd(Gesture.Pan, event),
			swipeleft: (event: HammerInput) => this.handleGesture(Gesture.SwipeLeft, event),
			swiperight: (event: HammerInput) => this.handleGesture(Gesture.SwipeRight, event),
			swipeup: (event: HammerInput) => this.handleGesture(Gesture.SwipeLeft, event),
			swipedown: (event: HammerInput) => this.handleGesture(Gesture.SwipeDown, event),
			pinch: (event: HammerInput) => this.handleGesture(Gesture.Pinch, event),
			pinchend: (event: HammerInput) => this.handleGestureEnd(Gesture.Pinch, event),
			rotate: (event: HammerInput) => this.handleGesture(Gesture.Rotate, event),
			rotateend: (event: HammerInput) => this.handleGestureEnd(Gesture.Rotate, event),
			press: (event: HammerInput) => this.handleGesture(Gesture.Press, event),
			pressup: (event: HammerInput) => this.handleGestureEnd(Gesture.Press, event)
		};
	}

	static gesture(gesture: Gesture, sensitivityX = 1, sensitivityY = 1): Control {
		return (input: InputManager) => {
			const event = input.touch.lastEvent.get(gesture);
			const x = event?.velocityX || 0;
			const y = event?.velocityY || 0;

			return {
				down: input.touch.isDown(gesture),
				once: input.touch.isDownOnce(gesture),
				up: input.touch.isUpOnce(gesture),
				x: x * DeviceSensitivity * sensitivityX,
				y: y * DeviceSensitivity * sensitivityY
			};
		};
	}

	protected handleGesture(gesture: Gesture, event: HammerInput) {
		// console.log(gesture, event);
		this.pressed.set(gesture, this.pressed.has(gesture) ? null : PressedState.Down);
		this.lastEvent.set(gesture, event);
	}

	protected handleGestureEnd(gesture: Gesture, event: HammerInput) {
		this.pressed.set(gesture, PressedState.Up);
	}

	public update(deltaTime: number) {
		super.update(deltaTime);

		// These gestures have no up event, so got to clear it manually...
		[Gesture.Tap, Gesture.SwipeDown, Gesture.SwipeLeft, Gesture.SwipeRight, Gesture.SwipeUp].forEach(g => {
			if (this.isDownOnce(g)) this.pressed.set(g, null); // Set as down
			if (this.isDown(g)) this.pressed.set(g, PressedState.Up); // Show as down for one tick, then trigger up
		});
	}

	protected addListeners() {
		if (!this.manager) {
			this.manager = new Manager(document.body);

			this.manager.add(new Hammer.Tap());
			this.manager.add(new Hammer.Pan());
			this.manager.add(new Hammer.Swipe({ direction: DIRECTION_ALL })); // Not tested
			this.manager.add(new Hammer.Pinch()); // Not tested
			this.manager.add(new Hammer.Rotate()); // Not tested
			this.manager.add(new Hammer.Press());
		}

		for (const event of Object.keys(this.listeners)) {
			this.manager.on(event, this.listeners[event]);
		}
	}

	protected removeListeners() {
		for (const event of Object.keys(this.listeners)) {
			this.manager.off(event, this.listeners[event]);
		}
	}
}
