import Quaternion from '@ecs/plugins/math/Quaternion';
import { Vector } from '@ecs/plugins/math/Vector';
import { PxActorFlag } from '../PxActorFlag';
import { PxShapeFlag } from '../PxShapeFlags';

export class PhysXBody {
	body: PhysX.RigidActor;
	static: boolean = false;
	mass: number = 1;
	staticFriction: number = 0.1;
	dynamicFriction: number = 0.1;
	restitution: number = 0.2;
	shapeFlags: any = PxShapeFlag.eSCENE_QUERY_SHAPE | PxShapeFlag.eSIMULATION_SHAPE;
	actorFlags: any = 0;
	bodyFlags: number = 0;

	public setPosition(value: Vector) {
		const currentPose = this.body.getGlobalPose();
		currentPose.translation = value;
		this.body.setGlobalPose(currentPose, true);
	}

	public setRotation(value: Quaternion) {
		const currentPose = this.body.getGlobalPose();
		currentPose.rotation = value;
		this.body.setGlobalPose(currentPose, true);
	}

	public getRotation() {
		return this.body.getGlobalPose().rotation;
	}

	public clearVelocity() {
		this.body.setLinearVelocity({ x: 0, y: 0, z: 0 }, true);
	}
}
