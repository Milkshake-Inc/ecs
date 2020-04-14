import { IterativeSystem } from '@ecs/ecs/IterativeSystem';
import Keyboard from '@ecs/input/Keyboard';
import { QueryBuilder } from '@ecs/ecs/Query';
import Input from '../components/Input';
import { Entity } from '@ecs/ecs/Entity';
import Key from '@ecs/input/Key';

export class InputSystem extends IterativeSystem {
	keyboard: Keyboard;

	constructor() {
		super(new QueryBuilder().contains(Input).build());

		this.keyboard = new Keyboard();
	}

	public updateFixed(dt: number) {
		super.updateFixed(dt);

		this.keyboard.update(dt);
	}

	protected updateEntityFixed(entity: Entity, dt: number) {
		const input = entity.get(Input);

		input.rightDown = this.keyboard.isEitherDown(input.rightKeybinding);
		input.leftDown = this.keyboard.isEitherDown(input.leftKeybinding);

		input.upDown = this.keyboard.isEitherDown(input.upKeybinding);
		input.downDown = this.keyboard.isEitherDown(input.downKeybinding);

		input.jumpDown = this.keyboard.isDown(Key.SPACEBAR) || this.keyboard.isDown(Key.W);
		input.fireDown = this.keyboard.isDown(Key.E);
	}
}
