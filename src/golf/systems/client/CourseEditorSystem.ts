import { Engine } from '@ecs/ecs/Engine';
import { Entity } from '@ecs/ecs/Entity';
import { useEvents, useQueries } from '@ecs/ecs/helpers';
import { System } from '@ecs/ecs/System';
import Key from '@ecs/input/Key';
import Keyboard from '@ecs/input/Keyboard';
import MouseButton from '@ecs/input/MouseButton';
import Color from '@ecs/math/Color';
import MathHelper from '@ecs/math/MathHelper';
import Vector3 from '@ecs/math/Vector';
import GLTFHolder from '@ecs/plugins/3d/components/GLTFHolder';
import { RaycastCamera, RaycastDebug } from '@ecs/plugins/3d/components/Raycaster';
import ThirdPersonCameraSystem from '@ecs/plugins/3d/systems/ThirdPersonCameraSystem';
import ThirdPersonTarget from '@ecs/plugins/3d/systems/ThirdPersonTarget';
import { TransfromLerp } from '@ecs/plugins/lerp/components/TransfromLerp';
import CannonBody from '@ecs/plugins/physics/components/CannonBody';
import { ToVector3 } from '@ecs/plugins/physics/utils/Conversions';
import { Interactable } from '@ecs/plugins/render/components/Interactable';
import Text from '@ecs/plugins/render/components/Text';
import Tag from '@ecs/plugins/Tag';
import Transform from '@ecs/plugins/Transform';
import { all } from '@ecs/utils/QueryHelper';
import { Sphere } from 'cannon-es';
import { Graphics } from 'pixi.js';
import { Group, Material, Mesh, MeshPhongMaterial, PerspectiveCamera, PlaneGeometry, SphereGeometry } from 'three';
import CoursePiece from '../../components/CoursePiece';
import PlayerBall from '../../components/PlayerBall';
import { KenneyAssetsGLTF } from '../../constants/GolfAssets';
import { buildCourcePieceEntity } from '../../utils/CourcePiece';
import { deserializeMap, serializeMap } from '../../utils/Serialization';
import ClientBallControllerSystem from './ClientBallControllerSystem';
import { COURSE_MATERIAL, COURSE_BODY } from 'src/golf/constants/Physics';

enum EditorMode {
	EDIT,
	TEST
}

export class CourseEditorSystem extends System {
	protected engine: Engine;
	protected models: KenneyAssetsGLTF;

	protected elapsedTime = 0;
	protected currentPart: Entity;
	protected raycaster: Entity;

	protected index = 49;

	protected keyboard: Keyboard;
	private ball: Entity;

	private mode: EditorMode = EditorMode.EDIT;

	protected queries = useQueries(this, {
		camera: all(PerspectiveCamera),
		pieces: all(CoursePiece)
	});

	protected events = useEvents(this, {
		CLICK: (entity: Entity) => {
			if (Tag.is(entity, 'pointer')) {
				document.body.requestPointerLock();
			}

			if (Tag.is(entity, 'save')) {
				console.log('Saved button');
			}
		}
	});

	constructor(engine: Engine, models: KenneyAssetsGLTF) {
		super();

		this.engine = engine;
		this.models = models;

		this.raycaster = new Entity();
		this.raycaster.add(RaycastDebug);
		this.raycaster.add(RaycastCamera);
		this.engine.addEntity(this.raycaster);

		this.currentPart = new Entity();
		this.currentPart.add(Transform);
		this.currentPart.add(TransfromLerp);
		this.currentPart.add(this.models.CASTLE.scene);
		this.currentPart.add(new CoursePiece('CASTLE'));
		// this.currentPart.add(new GridHelper(11, 11, Color.Black, Color.Black));
		this.engine.addEntity(this.currentPart);

		this.updateCurrentEditorPiece();

		this.keyboard = new Keyboard();

		document.body.addEventListener('click', event => {
			if (document.pointerLockElement && this.mode == EditorMode.EDIT) {
				if (event.button == MouseButton.LEFT) {
					this.placeCourcePiece();
				}
				if (event.button == MouseButton.RIGHT) {
					this.unplaceCoursePiece();
				}
			}
		});

		document.body.addEventListener('mousewheel', (event: MouseWheelEvent) => {
			this.delta += event.deltaY;

			if (this.delta > 10) {
				this.index++;
				this.delta = 0;
			}
			if (this.delta < -10) {
				this.index--;
				this.delta = 0;
			}
			this.updateCurrentEditorPiece();
		});
	}

	protected delta = 0;

	public onAddedToEngine(engine: Engine) {
		super.onAddedToEngine(engine);

		const background = new Entity();
		background.add(Transform);
		background.add(new Graphics().beginFill(0xff0050, 0.01).drawRect(0, 0, 1280, 720));
		background.add(Interactable);
		background.add(Tag, { value: 'pointer' });
		engine.addEntity(background);

		const saveButton = new Entity();
		saveButton.add(Transform, { position: new Vector3(60, 30) });
		saveButton.add(new Graphics().beginFill(0xff0050).drawRoundedRect(-50, -20, 100, 40, 5));
		saveButton.add(Text, {
			value: 'Save',
			tint: Color.White
		});
		saveButton.add(Tag, { value: 'save' });
		saveButton.add(Interactable);
		engine.addEntity(saveButton);
	}

	createBall(radius = 0.04) {
		const entity = new Entity();
		entity.add(Transform);
		entity.add(
			new Mesh(
				new SphereGeometry(radius, 10, 10),
				new MeshPhongMaterial({
					color: Color.White,
					reflectivity: 0,
					specular: 0
				})
			),
			{ castShadow: true, receiveShadow: true }
		);
		entity.add(new CannonBody(COURSE_BODY));
		entity.add(new Sphere(radius));

		return entity;
	}

	protected updateCurrentEditorPiece() {
		const models = Object.values(this.models);

		this.index = MathHelper.mod(this.index, models.length);

		const modelNames = Object.keys(this.models)[this.index];

		this.currentPart.remove(Group);
		this.currentPart.remove(GLTFHolder);

		this.currentPart.add(models[this.index].scene);
		this.currentPart.add(new GLTFHolder(models[this.index]));

		this.currentPart.get(CoursePiece).modelName = modelNames;
	}

	protected createCourcePiece(modelName: string, transform: Transform) {
		this.removeCoursePiece(transform);

		const entities = buildCourcePieceEntity(this.models, modelName, transform);
		this.engine.addEntities(...entities);

		return entities;
	}

	protected removeCoursePiece(transform: Transform) {
		const coursePiece = this.getPieceAtTransform(transform);

		if (coursePiece) {
			this.engine.removeEntity(coursePiece);
		}
	}

	protected getPieceAtTransform(transform: Transform): Entity {
		return this.queries.pieces.firstBy(p => {
			const t = p.get(Transform);
			return transform.position.equals(t.position);
		});
	}

	protected placeCourcePiece() {
		const currentPiece = this.currentPart.get(CoursePiece);
		this.createCourcePiece(currentPiece.modelName, Transform.From(this.currentPart.get(TransfromLerp)));
	}

	protected unplaceCoursePiece() {
		this.removeCoursePiece(Transform.From(this.currentPart.get(TransfromLerp)));
	}

	update(deltaTime: number) {
		this.elapsedTime += deltaTime;

		const intersects = this.raycaster.get(RaycastCamera).intersects;

		const floor = intersects.find(intersect => {
			if (intersect.object instanceof Mesh) {
				// Work out it's the floor
				return intersect.object.geometry instanceof PlaneGeometry;
			}
		});

		if (floor) {
			this.currentPart.get(TransfromLerp).x = Math.round(floor.point.x);
			this.currentPart.get(TransfromLerp).z = Math.round(floor.point.z);
		}

		if (this.keyboard.isPressed(Key.V)) {
			if (this.mode == EditorMode.EDIT) {
				this.mode = EditorMode.TEST;

				this.engine.addSystem(new ThirdPersonCameraSystem());
				this.engine.addSystem(new ClientBallControllerSystem());

				if (!this.ball) {
					this.ball = this.createBall();
					this.ball.add(PlayerBall);
					this.ball.add(ThirdPersonTarget);
				}

				this.ball.get(Transform).position = ToVector3(intersects[0].point).add({ x: 0, y: 1, z: 0 });
				this.ball.get(CannonBody).velocity.set(0, 0, 0);
				this.ball.get(CannonBody).angularVelocity.set(0, 0, 0);

				this.engine.removeEntity(this.currentPart);
				this.engine.addEntity(this.ball);
			} else {
				this.mode = EditorMode.EDIT;

				this.engine.removeSystem(this.engine.getSystem(ThirdPersonCameraSystem));
				this.engine.removeSystem(this.engine.getSystem(ClientBallControllerSystem));

				this.engine.addEntity(this.currentPart);
				this.engine.removeEntity(this.ball);
			}
		}

		if (this.keyboard.isPressed(Key.ONE)) {
			const saveFile = serializeMap(this.queries.pieces);
			localStorage.setItem('map', JSON.stringify(saveFile));
		}

		if (this.keyboard.isPressed(Key.TWO)) {
			const saveFile = JSON.parse(localStorage.getItem('map'));
			console.log(saveFile);
			const entities = deserializeMap(this.models, saveFile);
			this.engine.addEntities(...entities);
		}

		const heightDelta = 0.1465; // Wtf kenney

		const lerpTransform = this.currentPart.get(TransfromLerp);

		if (this.keyboard.isPressed(Key.UP)) {
			lerpTransform.y += heightDelta;
		}

		if (this.keyboard.isPressed(Key.DOWN)) {
			lerpTransform.y -= heightDelta;
		}

		lerpTransform.y = Math.max(lerpTransform.y, 0);

		if (this.keyboard.isPressed(Key.R)) {
			lerpTransform.ry -= Math.PI / 2;
		}

		if (this.keyboard.isPressed(Key.M)) {
			this.index++;
			this.updateCurrentEditorPiece();
		}

		if (this.keyboard.isPressed(Key.N)) {
			this.index--;
			this.updateCurrentEditorPiece();
		}

		if (this.keyboard.isPressed(Key.SPACEBAR)) {
			this.placeCourcePiece();
		}

		this.keyboard.update();

		//
		if (this.currentPart) {
			const group = this.currentPart.get(Group);

			group.traverse(children => {
				if (children instanceof Mesh) {
					if (children.material instanceof Material) {
						children.material.transparent = true;
						const remappedSin = MathHelper.sin(this.elapsedTime / 200, 0.2, 0.5);
						children.material.opacity = remappedSin;
					}
				}
			});
		}
	}
}