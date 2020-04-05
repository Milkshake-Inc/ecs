import { Entity } from '@ecs/ecs/Entity';
import Vector2 from '@ecs/math/Vector2';
import Input from '@ecs/plugins/input/components/Input';
import { InputSystem } from '@ecs/plugins/input/systems/InputSystem';
import Position from '@ecs/plugins/Position';
import Sprite from '@ecs/plugins/render/components/Sprite';
import Space from '@ecs/plugins/space/Space';
import { LoadPixiAssets } from '@ecs/utils/PixiHelper';
import BoundingCircle from './components/BoundingCircle';
import Moveable from './components/Moveable';
import BoundsSystem from './systems/BoundsSystem';
import MovementSystem from './systems/MovementSystem';
import PuckScoreSystem from './systems/PuckScoreSystem';
import { Puck } from './components/Puck';
import BitmapText from '@ecs/plugins/render/components/BitmapText';
import Color from '@ecs/math/Color';
import Score from './components/Score';
import HudSystem, { Hud } from './systems/HudSystem';
import PhysicsSystem from '@ecs/plugins/physics/systems/PhysicsSystem';
import { Body, Circle, Box } from 'p2';

const Assets = {
	Background: 'assets/hockey/background.png',
	RedPaddle: 'assets/hockey/red.png',
	BluePaddle: 'assets/hockey/blue.png',
	Puck: 'assets/hockey/puck.png'
};

export default class Hockey extends Space {
	private score: Score;

	protected async preload() {
		return LoadPixiAssets(Assets);
	}

	setup() {
		this.addSystem(new InputSystem());
		this.addSystem(new MovementSystem());
		this.addSystem(new PhysicsSystem());
		// this.addSystem(new BoundsSystem({ width: 1280, height: 720 }));
		// this.addSystem(new CollisionSystem());
		this.addSystem(new PuckScoreSystem({ width: 1280, height: 720 }));

		const background = new Entity();
		background.addComponent(Position);
		background.addComponent(Sprite, { imageUrl: Assets.Background, anchor: Vector2.ZERO });

		const redPaddle = this.createPaddle(Assets.RedPaddle, Input.WASD(), { x: 100, y: 720 / 2 });
		const bluePaddle = this.createPaddle(Assets.BluePaddle, Input.ARROW(), { x: 1280 - 100, y: 720 / 2 });

		const puck = new Entity();
		puck.addComponent(Position, { x: 1280 / 2, y: 720 / 2 });
		puck.addComponent(Sprite, { imageUrl: Assets.Puck });
		// puck.addComponent(Physics, { velocity: Vector2.EQUAL(0.4), bounce: true, friction: 0.99, maxVelocity: 0.5 });
		// puck.addComponent(CollisionShape, { shape: CollisionShape.Circle(80 / 2) });
		puck.addComponent(Body, {});
		puck.addComponent(Circle, { radius: 3 });
		puck.addComponent(Puck, { damping: 0, type: Body.SLEEPY });
		puck.add((this.score = new Score()));

		const hud = this.hud();
		this.addSystem(new HudSystem(hud));

		this.addEntities(background, redPaddle, bluePaddle, puck, hud.redScore, hud.blueScore, ...this.createWalls());
	}

	createPaddle(asset: string, input: Input, spawnPosition: { x: number; y: number }) {
		const paddle = new Entity();
		paddle.addComponent(Position, { x: spawnPosition.x, y: spawnPosition.y });
		paddle.addComponent(Sprite, { imageUrl: asset });
		paddle.add(input);
		paddle.addComponent(Moveable, { speed: 0.5 });
		// paddle.addComponent(Physics, { bounce: true, friction: 0.8 });
		paddle.addComponent(BoundingCircle, { size: 130 });
		// paddle.addComponent(CollisionShape, { shape: CollisionShape.Circle(130 / 2) });
		paddle.addComponent(Score);
		paddle.addComponent(Body, { mass: 1, damping: 0, type: Body.SLEEPY });
		paddle.addComponent(Circle, { radius: 130 });

		return paddle;
	}

	createWalls(): Entity[] {
		const top = new Entity();
		top.addComponent(Position, { x: 0, y: 0 });
		top.addComponent(Box, { width: 1280, height: 10 });
		// top.addComponent(CollisionShape, { shape: CollisionShape.Box(1280, 10) });

		const bottom = new Entity();
		bottom.addComponent(Position, { x: 0, y: 720 - 10 });
		bottom.addComponent(Body, { mass: 1, type: Body.SLEEPY });
		bottom.addComponent(Box, { width: 1280, height: 10 });
		// bottom.addComponent(CollisionShape, { shape: CollisionShape.Box(1280, 10) });

		const rightTop = new Entity();
		rightTop.addComponent(Position, { x: 1280 - 10, y: 0 });
		rightTop.addComponent(Body, { mass: 1, type: Body.SLEEPY });
		rightTop.addComponent(Box, { width: 10, height: 192 });
		// rightTop.addComponent(CollisionShape, { shape: CollisionShape.Box(10, 192) });

		const rightBottom = new Entity();
		rightBottom.addComponent(Position, { x: 1280 - 10, y: 720 - 192 });
		rightBottom.addComponent(Body, { mass: 1, type: Body.SLEEPY });
		rightBottom.addComponent(Box, { width: 10, height: 192 });
		// rightBottom.addComponent(CollisionShape, { shape: CollisionShape.Box(10, 192) });

		const leftTop = new Entity();
		leftTop.addComponent(Position, { x: 0, y: 0 });
		leftTop.addComponent(Body, { mass: 1, type: Body.SLEEPY });
		leftTop.addComponent(Box, { width: 10, height: 192 });
		// leftTop.addComponent(CollisionShape, { shape: CollisionShape.Box(10, 192) });

		const leftBottom = new Entity();
		leftBottom.addComponent(Position, { x: 0, y: 720 - 192 });
		leftBottom.addComponent(Body, { mass: 1, type: Body.SLEEPY });
		leftBottom.addComponent(Box, { width: 10, height: 192 });
		// leftBottom.addComponent(CollisionShape, { shape: CollisionShape.Box(10, 192) });

		return [top, bottom, rightTop, rightBottom, leftTop, leftBottom];
	}

	hud(): Hud {
		const redScore = new Entity();
		redScore.addComponent(Position, { x: 50, y: 50 });
		redScore.addComponent(BitmapText, { text: '0', tint: Color.Red, size: 50 });

		const blueScore = new Entity();
		blueScore.addComponent(Position, { x: 1280 - 80, y: 50 });
		blueScore.addComponent(BitmapText, { text: '0', tint: Color.Blue, size: 50 });

		return { redScore, blueScore };
	}
}