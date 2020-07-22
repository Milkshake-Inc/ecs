import { InputActions, InputBindings } from '@ecs/plugins/input/Control';
import InputManager from '@ecs/plugins/input/InputManager';

export default class Input<B extends InputBindings> {
	private bindings: B;
	private playerIndex: number;
	private inputs: InputActions<B>;

	constructor(bindings: B, playerIndex = 0) {
		this.bindings = bindings;
		this.playerIndex = playerIndex;
	}

	get state() {
		return this.inputs;
	}

	update(inputManager: InputManager) {
		const inputs = {};

		Object.keys(this.bindings).forEach(key => {
			inputs[key] = this.bindings[key](inputManager);
		});

		this.inputs = inputs;
	}
}
