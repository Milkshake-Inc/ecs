import { Entity } from '@ecs/ecs/Entity';
import Vector2 from '@ecs/math/Vector2';
import Input from '@ecs/plugins/input/components/Input';
import { InputSystem } from '@ecs/plugins/input/systems/InputSystem';
import Position from '@ecs/plugins/Position';
import Sprite from '@ecs/plugins/render/components/Sprite';
import BoundingCircle from './components/BoundingCircle';
import Moveable from './components/Moveable';
import Physics from './components/Physics';
import BoundsSystem from './systems/BoundsSystem';
import MovementSystem from './systems/MovementSystem';
import PhysicsSystem from './systems/PhysicsSystem';
import Space from '@ecs/plugins/space/Space';
import { LoadPixiAssets } from '@ecs/utils/PixiHelper';
import Key from '@ecs/input/Key';

const Assets = {
	Background: 'assets/hockey/background.png',
	Paddle: 'assets/hockey/red.png',
	Puck: 'assets/hockey/puck.png'
};

export default class Hockey extends Space {
	protected async preload() {
		return LoadPixiAssets(Assets);
	}

	setup() {
		this.addSystem(new InputSystem());
		this.addSystem(new MovementSystem());
		this.addSystem(new PhysicsSystem());
		this.addSystem(new BoundsSystem({ width: 1280, height: 720 }));

		const background = new Entity();
		background.addComponent(Position);
		background.addComponent(Sprite, { imageUrl: Assets.Background, anchor: Vector2.ZERO });

		const paddle = new Entity();
		paddle.addComponent(Position);
		paddle.addComponent(Sprite, { imageUrl: Assets.Paddle });
		paddle.addComponent(Input);
		paddle.addComponent(Moveable, { speed: 0.1 });
		paddle.addComponent(Physics, { bounce: true, friction: 0.8 });
		paddle.addComponent(BoundingCircle, { size: 130 });

		const puck = new Entity();
		puck.addComponent(Position, { x: 1280 / 2, y: 720 / 2 });
		puck.addComponent(Sprite, { imageUrl: Assets.Puck });
		puck.addComponent(Physics, { velocity: Vector2.EQUAL(0.4), bounce: true });
		puck.addComponent(BoundingCircle, { size: 80 });

		this.addEntities(background, paddle, puck);
	}
}
