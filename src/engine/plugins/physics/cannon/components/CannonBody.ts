import { Body, Quaternion, Vec3, BodyOptions } from 'cannon-es';
import Vector3, { Vector } from '@ecs/plugins/math/Vector';
import MathHelper from '@ecs/plugins/math/MathHelper';
import { ToCannonVector3 } from '../utils/Conversions';

export interface CannonBodyOptions extends BodyOptions {
	interpolation?: boolean;
}

export default class CannonBody extends Body {
	public offset: Vector3 = null;
	public interpolation = false;

	constructor(options?: CannonBodyOptions) {
		super(options);
		if (options && options.interpolation) {
			this.interpolation = options.interpolation;
		}
	}

	get moving() {
		return !new Vec3(this.velocity.x, 0, this.velocity.z).almostZero(1e-1);
	}

	setPosition(position: Vector) {
		this.position = ToCannonVector3(position);
		this.velocity.set(0, 0, 0);
		this.angularVelocity.set(0, 0, 0);
	}

	rotate(euler: Vector3 | Vec3) {
		this.quaternion.mult(new Quaternion().setFromEuler(euler.x, euler.y, euler.z), this.quaternion);
	}

	look(direction: Vector3 | Vec3 = Vector3.FORWARD) {
		return this.quaternion.vmult(ToCannonVector3(direction));
	}

	// Still a bit buggy
	// https://stackoverflow.com/questions/12435671/quaternion-lookat-function
	// https://gamedev.stackexchange.com/questions/15070/orienting-a-model-to-face-a-target
	lookAt(body: CannonBody, up: Vector3 | Vec3 = Vector3.FORWARD) {
		const direction = body.position.vsub(this.position);
		direction.normalize();
		const dot = ToCannonVector3(Vector3.FORWARD).dot(direction);

		if (Math.abs(dot - -1) < 0.000001) {
			this.quaternion.set(up.x, up.y, up.z, MathHelper.toRadians(180.0));
			return;
		}

		if (Math.abs(dot - 1) < 0.000001) {
			this.quaternion = new Quaternion();
			return;
		}

		const rotAngle = Math.acos(dot);

		const axis = ToCannonVector3(up).cross(direction);
		axis.normalize();

		this.quaternion.setFromAxisAngle(axis, rotAngle);
		// this.quaternion.inverse(this.quaternion);
	}

	get forward() {
		return this.look(Vector3.FORWARD);
	}

	get back() {
		return this.look(Vector3.BACKWARD);
	}

	get left() {
		return this.look(Vector3.LEFT);
	}

	get right() {
		return this.look(Vector3.RIGHT);
	}

	get up() {
		return this.look(Vector3.UP);
	}

	get down() {
		return this.look(Vector3.DOWN);
	}
}
