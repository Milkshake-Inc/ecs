import { Entity } from '@ecs/ecs/Entity';
import Color from '@ecs/math/Color';
import Vector2 from '@ecs/math/Vector2';
import Input from '@ecs/plugins/input/components/Input';
import { InputSystem } from '@ecs/plugins/input/systems/InputSystem';
import ClientConnectionSystem from '@ecs/plugins/net/systems/ClientConnectionSystem';
import ClientPingSystem from '@ecs/plugins/net/systems/ClientPingSystem';
import PhysicsBody from '@ecs/plugins/physics/components/PhysicsBody';
import PhysicsRenderSystem from '@ecs/plugins/physics/systems/PhysicsRenderSystem';
import Position from '@ecs/plugins/Position';
import BitmapText from '@ecs/plugins/render/components/BitmapText';
import Sprite from '@ecs/plugins/render/components/Sprite';
import RenderSystem from '@ecs/plugins/render/systems/RenderSystem';
import Space from '@ecs/plugins/space/Space';
import TickerEngine from '@ecs/TickerEngine';
import { LoadPixiAssets } from '@ecs/utils/PixiHelper';
import Hockey, { PlayerColor, Snapshot, SnapshotEntity } from './spaces/Hockey';
import Splash from './spaces/Splash';
import HudSystem, { Hud } from './systems/HudSystem';
import { PuckSoundSystem } from './systems/PuckSoundSystem';
import { WorldSnapshotHandlerSystem } from '@ecs/plugins/net/systems/PacketHandlerSystem';
import { WorldSnapshot } from '@ecs/plugins/net/components/Packet';
import ClientInputSenderSystem from '@ecs/plugins/net/systems/ClientInputSenderSystem';
import PlayerSpawnSystem from './systems/PlayerSpawnSystem';

class PixiEngine extends TickerEngine {
	protected spaces: Map<string, Space>;

	constructor(tickRate = 60) {
		super(tickRate);

		this.addSystem(new RenderSystem());
		this.addSystem(new ClientConnectionSystem(this), 1000); // has to be low priority so systems get packets before the queue is cleared
		this.addSystem(new ClientPingSystem());

		this.spaces = new Map();
	}

	public getSpace(spaceName: string) {
		return this.spaces.get(spaceName);
	}

	public registerSpaces(...spaces: Space[]) {
		spaces.forEach(v => this.spaces.set(v.name, v));
	}

	protected getTime(): number {
		return performance.now();
	}

	protected buildCallback(callback: () => void) {
		const handleAnimationFrame = () => {
			callback();
			requestAnimationFrame(handleAnimationFrame);
		};

		requestAnimationFrame(handleAnimationFrame);
	}
}

const Assets = {
	Background: 'assets/hockey/background.png',
	RedPaddle: 'assets/hockey/red.png',
	BluePaddle: 'assets/hockey/blue.png',
	Puck: 'assets/hockey/puck.png'
};

class ClientHockey extends Hockey {
	protected async preload() {
		return LoadPixiAssets(Assets);
	}

	setup() {
		this.addSystem(new InputSystem());

		const background = new Entity();
		background.add(Position);
		background.add(Sprite, { imageUrl: Assets.Background, anchor: Vector2.ZERO });

		this.addEntities(background);

		super.setup();

		this.addSystem(new PhysicsRenderSystem(this));
		this.addSystem(new PuckSoundSystem());

		const hud = this.hud();
		this.addSystem(new HudSystem(hud));

		this.addEntities(hud.redScore, hud.blueScore);

		this.addSystem(
			new WorldSnapshotHandlerSystem<Snapshot>((e, p) => this.processSnapshot(p))
		);

		this.addSystem(new ClientInputSenderSystem());

		this.addSystem(
			new PlayerSpawnSystem(entity => {
				this.createPaddle(entity, PlayerColor.Red, { x: 100, y: 100 });
			})
		);
	}

	processSnapshot({ snapshot }: WorldSnapshot<Snapshot>) {
		const processEntity = (entity: Entity, snapshot: SnapshotEntity) => {
			const physics = entity.get(PhysicsBody);

			physics.position = {
				x: snapshot.position.x,
				y: snapshot.position.y
			};

			physics.velocity = {
				x: snapshot.velocity.x,
				y: snapshot.velocity.y
			};
		};

		// processEntity(this.redPaddle, snapshot.redPaddle);
		// processEntity(this.bluePaddle, snapshot.bluePaddle);
		processEntity(this.puck, snapshot.puck);
	}

	createPaddle(entity: Entity, player: PlayerColor, spawnPosition: { x: number; y: number }) {
		super.createPaddle(entity, player, spawnPosition);

		entity.add(Sprite, { imageUrl: player == PlayerColor.Red ? Assets.RedPaddle : Assets.BluePaddle });
		entity.add(player == PlayerColor.Red ? Input.WASD() : Input.ARROW());
	}

	createPuck(): Entity {
		const puck = super.createPuck();

		puck.add(Sprite, { imageUrl: Assets.Puck });

		return puck;
	}

	hud(): Hud {
		const redScore = new Entity();
		redScore.add(Position, { x: 50, y: 50 });
		redScore.add(BitmapText, { text: '0', tint: Color.Red, size: 50 });

		const blueScore = new Entity();
		blueScore.add(Position, { x: 1280 - 80, y: 50 });
		blueScore.add(BitmapText, { text: '0', tint: Color.Blue, size: 50 });

		return { redScore, blueScore };
	}
}

const engine = new PixiEngine();
engine.registerSpaces(new Splash(engine, 'splash'), new ClientHockey(engine));

engine.getSpace('splash').open();

setTimeout(() => {
	engine.getSpace('splash').close();
	engine.getSpace('hockey').open();
}, 500);

console.log('🎉 Client');