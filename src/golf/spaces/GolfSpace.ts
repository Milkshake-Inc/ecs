import { Engine } from '@ecs/ecs/Engine';
import { Entity } from '@ecs/ecs/Entity';
import { IterativeSystem } from '@ecs/ecs/IterativeSystem';
import Color from '@ecs/math/Color';
import MathHelper from '@ecs/math/MathHelper';
import Vector3 from '@ecs/math/Vector';
import FreeRoamCameraSystem from '@ecs/plugins/3d/systems/FreeRoamCameraSystem';
import { InputSystem } from '@ecs/plugins/input/systems/InputSystem';
import CannonPhysicsSystem from '@ecs/plugins/physics/systems/CannonPhysicsSystem';
import Space from '@ecs/plugins/space/Space';
import Transform from '@ecs/plugins/Transform';
import { all, makeQuery } from '@ecs/utils/QueryHelper';
import { LoadGLTF, LoadTexture } from '@ecs/utils/ThreeHelper';
import { Body, Plane } from 'cannon-es';
import {
	AmbientLight,
	Color as ThreeColor,
	DirectionalLight,
	Mesh,
	MeshPhongMaterial,
	MeshStandardMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	RepeatWrapping,
	Texture,
	MeshBasicMaterial,
	DoubleSide,
	LinearFilter
} from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { CourseEditorSystem } from '../systems/CourseEditorSystem';
import { KenneyAssets } from './../constants/Assets';
import RenderSystem from '@ecs/plugins/render/systems/RenderSystem';
import { useQueries } from '@ecs/ecs/helpers';
import { System } from '@ecs/ecs/System';
import PixiRenderState from '@ecs/plugins/render/components/RenderState';
import { LoadPixiAssets } from '@ecs/utils/PixiHelper';
import Sprite from '@ecs/plugins/render/components/Sprite';
import Text from '@ecs/plugins/render/components/Text';
import { GolfRenderState } from '../systems/GolfRenderSystem';
import PixiUISystem from '../systems/PixiUISystem';
import { Interactable } from '@ecs/plugins/render/components/Interactable';
const Assets = {
	DARK_TEXTURE: 'assets/prototype/textures/dark/texture_08.png'
};

type AssetsMap<T, K> = {
	[P in keyof T]: K;
};

export type KenneyAssetsGLTF = Partial<AssetsMap<typeof KenneyAssets, GLTF>>;

export class TransfromLerp extends Transform {}

class TransformLerpSystem extends IterativeSystem {
	constructor() {
		super(makeQuery(all(Transform, TransfromLerp)));
	}

	updateEntity(entity: Entity, deltaTime: number) {
		const target = entity.get(TransfromLerp);
		const current = entity.get(Transform);

		if (!target.position) {
			target.position = current.position.clone();
		}

		current.position = MathHelper.lerpVector3(current.position, target.position, 0.4);
		current.scale = MathHelper.lerpVector3(current.scale, target.scale, 0.4);
		current.quaternion = current.quaternion.slerp(target.quaternion, 0.4);
	}
}

const Images = {
	Logo: 'assets/golf/logo.png',
	Noise: 'assets/golf/noise.png',
	Crosshair: 'assets/prototype/crosshair.png',
}

export default class GolfSpace extends Space {
	protected darkTexture: Texture;

	protected kenneyAssets: KenneyAssetsGLTF = {};

	constructor(engine: Engine, open = false) {
		super(engine, open);
	}

	protected async preload() {
		[this.darkTexture] = await Promise.all([LoadTexture(Assets.DARK_TEXTURE)]);
		await LoadPixiAssets(Images);

		const loadModels = Object.keys(KenneyAssets).map(async key => {
			const gltf = await LoadGLTF('assets/golf/' + KenneyAssets[key]);

			// Proccess mesh to nicer material
			gltf.scene.traverse(child => {
				if (child instanceof Mesh) {
					const color = (child.material as MeshStandardMaterial).color;
					child.material = new MeshPhongMaterial({
						color
					});
					child.castShadow = true;
				}
			});

			this.kenneyAssets[key] = gltf;
		});

		await Promise.all(loadModels);
	}

	setup() {
		this.addSystem(new CannonPhysicsSystem(new Vector3(0, -5, 0), 50, false));

		const camera = new Entity();
		camera.add(Transform, { z: 4, y: 2, x: 0, qx: -0.1 });
		camera.add(new PerspectiveCamera(75, 1280 / 720, 0.01, 1000));

		const light = new Entity();
		light.add(new DirectionalLight(new ThreeColor(Color.White), 0.8), {
			castShadow: true
		});
		light.get(DirectionalLight).shadow.mapSize.set(1024 * 4, 1024 * 4);
		light.add(new AmbientLight(new ThreeColor(Color.White), 0.5));
		light.add(Transform, { x: 5 / 10, y: 10 / 10, z: 5 / 10 });

		const ground = new Entity();
		ground.add(Transform, { rx: -Math.PI / 2, y: -0 });
		this.darkTexture.repeat.set(1000, 1000);
		this.darkTexture.wrapT = this.darkTexture.wrapS = RepeatWrapping;
		ground.add(new Mesh(new PlaneGeometry(1000, 1000), new MeshPhongMaterial({ map: this.darkTexture, shininess: 0 })), {
			castShadow: true,
			receiveShadow: true
		});
		ground.add(new Body());
		ground.add(new Plane());

		this.addEntities(light, camera, ground);

		this.addSystem(new FreeRoamCameraSystem(false));

		this.addSystem(new InputSystem());
		this.addSystem(new TransformLerpSystem());

		this.addSystem(new CourseEditorSystem(this.worldEngine, this.kenneyAssets));

		this.addSystem(new RenderSystem(1280, 720, undefined, 1, false));
		this.addSystem(new PixiUISystem());

		// const noise = new Entity();
		// noise.add(Transform, {
		// 	position: new Vector3(1280 / 2, 720 / 2)
		// });
		// noise.add(Sprite, {
		// 	imageUrl: Images.Noise,
		// });
		// noise.add(Interactable);
		// this.addEntity(noise);

		const crosshair = new Entity();
		crosshair.add(Transform, {
			position: new Vector3(1280 / 2, 720 / 2)
		});
		crosshair.add(Sprite, {
			imageUrl: Images.Crosshair,
		});
		this.addEntity(crosshair);
	}
}
