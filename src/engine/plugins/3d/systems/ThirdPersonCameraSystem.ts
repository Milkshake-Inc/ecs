import { useQueries } from '@ecs/ecs/helpers';
import { System } from '@ecs/ecs/System';
import MathHelper from '@ecs/math/MathHelper';
import Vector3 from '@ecs/math/Vector';
import Transform from '@ecs/plugins/Transform';
import { all } from '@ecs/utils/QueryHelper';
import { PerspectiveCamera } from 'three';
import ThirdPersonTarget from './ThirdPersonTarget';

export default class ThirdPersonCameraSystem extends System {
	private lastPosition = { x: 0, y: 0 };
	private cameraAngle: Vector3 = new Vector3(0.76, 0.3);

	private zoom = 4;

	private queries = useQueries(this, {
		camera: all(Transform, PerspectiveCamera),
		target: all(Transform, ThirdPersonTarget)
	});

	constructor() {
		super()

		window.addEventListener("mousemove", this.handleMouseMove.bind(this));
		window.addEventListener("wheel", this.handleMouseWheel.bind(this));
	}

	get target() {
        return this.queries.target.first.get(Transform);
	}

	get camera() {
        return this.queries.camera.first.get(Transform);
	}

	get acamera() {
        return this.queries.camera.first.get(PerspectiveCamera);
	}

	handleMouseWheel(event: WheelEvent) {
		this.zoom += event.deltaY * -0.01;
	}

	handleMouseMove(event: MouseEvent) {
        const mouse = {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1
        }

        const delta = {
            x: mouse.x - this.lastPosition.x,
            y: mouse.y - this.lastPosition.y,
        }

        this.cameraAngle.x += delta.x * 4;
        this.cameraAngle.y -= delta.y * 4;

		this.cameraAngle.y = MathHelper.clamp(this.cameraAngle.y, 0.3, 1);

        this.lastPosition = mouse;
    }

	// Vector3 newForward = Vector3.Normalize(Position - GameState.Avatar.Position);
	// calc the rotation so the avatar faces the target
	// Rotation = Helpers.GetRotation(Vector3.Forward, newForward, Vector3.Up);
	// Cannon.Shoot(Position, Rotation, this);

	update(dt: number) {



		this.acamera.lookAt(this.target.x, this.target.position.y, this.target.position.z);
		this.acamera.quaternion.set(this.acamera.quaternion.x, this.acamera.quaternion.y, this.acamera.quaternion.z, this.acamera.quaternion.w);

		const xAngle = -(this.cameraAngle.x * 2);
		const yAngle = this.cameraAngle.y * 6;

		const angleX = Math.cos(-xAngle) * this.zoom;
		const angleY = Math.sin(-xAngle) * this.zoom;

		this.camera.x = this.target.x + angleX;
		this.camera.z = this.target.z + angleY;
		this.camera.y = this.target.y + yAngle;
	}
}