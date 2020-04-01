import { Entity, EntitySnapshot } from '@ecs/ecs/Entity';
import { IterativeSystem } from '@ecs/ecs/IterativeSystem';
import Position from '@ecs/plugins/Position';
import { all, any, makeQuery } from '@ecs/utils/QueryHelper';
import { Application, BaseTexture, Container, DisplayObject as PixiDisplayObject, Sprite as PixiSprite, Texture } from 'pixi.js';
import DisplayObject from '../components/DisplayObject';
import Sprite from '../components/Sprite';

export default class RenderSystem extends IterativeSystem {
	public application: Application;

	public container: Container;

	displayObjects: Map<DisplayObject, PixiDisplayObject>;

	constructor(width: number = 1280, height: number = 720, backgroundColor: number = 0xff0000, scale: number = 1) {
		super(makeQuery(all(Position), any(Sprite)));

		this.application = new Application({
			view: <HTMLCanvasElement>document.getElementById('canvas'),
			backgroundColor,
			width,
			height,
			// resolution: window.devicePixelRatio,
			antialias: false,
			autoStart: false
		});

		this.application.stage.addChild((this.container = new Container()));
		this.container.scale.set(scale, scale);

		this.displayObjects = new Map();

		document.body.appendChild(this.application.view);
	}

	protected updateEntity(entity: Entity): void {
		const genericDisplayObjectUpdate = (displayObject: PixiDisplayObject, displayObjectData: DisplayObject) => {
			const position = entity.get(Position);

			displayObject.position.set(position.x, position.y);
			displayObject.scale.set(displayObjectData.scale.x, displayObjectData.scale.y);

			// Dirty sorting stuff - remove / change
			if (displayObjectData.index != null) {
				this.container.setChildIndex(displayObject, this.container.children.length - 1);
			}
		};

		if (entity.has(Sprite)) {
			const sprite = entity.get(Sprite);
			const pixiSprite = this.displayObjects.get(sprite) as PixiSprite;

			genericDisplayObjectUpdate(pixiSprite, sprite);

			if (sprite.frame && pixiSprite.texture.baseTexture.resource.valid) {
				pixiSprite.texture.frame = sprite.frame;
			}

			pixiSprite.tint = sprite.tint;
			pixiSprite.anchor.set(sprite.anchor.x, sprite.anchor.y);
		}
	}

	entityAdded = (snapshot: EntitySnapshot) => {
		if (snapshot.has(Sprite)) {
			const sprite = snapshot.get(Sprite);
			const pixiSprite = new PixiSprite(new Texture(BaseTexture.from(sprite.imageUrl), sprite.frame));

			this.displayObjects.set(sprite, pixiSprite);
			this.container.addChild(pixiSprite);

			this.updateEntity(snapshot.entity);
		}
	};

	entityRemoved = (snapshot: EntitySnapshot) => {
		if (snapshot.has(Sprite)) {
			const sprite = snapshot.get(Sprite);

			this.container.removeChild(this.displayObjects.get(sprite));
			this.displayObjects.delete(sprite);
		}
	};

	public update(dt: number) {
		super.update(dt);
		this.application.render();
	}

	onRemovedFromEngine() {
		this.application.stage.removeChild(this.container);
	}
}
