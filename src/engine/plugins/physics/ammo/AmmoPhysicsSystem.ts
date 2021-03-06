import { Entity, System } from 'tick-knock';
import { useEvents, useState } from '@ecs/core/helpers';
import Vector3 from '@ecs/plugins/math/Vector';
import Ammo from 'ammojs-typed';
import { useAmmoBodyCouple } from './couples/AmmoBodyCouple';
import { useAmmoShapeCouple } from './couples/AmmoShapeCouple';
import { useAmmoTrimeshCouple } from './couples/AmmoTrimeshCouple';
import { AmmoInstance } from './AmmoLoader';

export class AmmoState {
	world: Ammo.btDiscreteDynamicsWorld;
	ground: Ammo.btRigidBody;
}

export enum AmmoEvents {
	Collision = 'collision'
}

export default class AmmoPhysicsSystem extends System {
	protected state = useState(this, new AmmoState());
	protected events = useEvents();

	protected couples = [useAmmoBodyCouple(this), useAmmoTrimeshCouple(this), useAmmoShapeCouple(this)];

	constructor(gravity: Vector3 = new Vector3(0, -4, 0)) {
		super();

		this.state.world = this.createWorld(gravity);
	}

	protected createWorld(gravity: Vector3): Ammo.btDiscreteDynamicsWorld {
		const collisionConfiguration = new AmmoInstance.btDefaultCollisionConfiguration();
		const dispatcher = new AmmoInstance.btCollisionDispatcher(collisionConfiguration);
		const broadphase = new AmmoInstance.btDbvtBroadphase();
		const solver = new AmmoInstance.btSequentialImpulseConstraintSolver();
		const world = new AmmoInstance.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);

		world.setGravity(new AmmoInstance.btVector3(gravity.x, gravity.y, gravity.z));
		(world as any).activateContactAddedCallbackAdjustInternalEdgeContacts();

		return world;
	}

	findEntityByAmmoObject(ammoObject: Ammo.btCollisionObject): Entity {
		for (const couple of this.couples) {
			const entity = couple.getEntity(ammoObject);

			if (entity) return entity;
		}
	}

	updateFixed(dt: number) {
		super.updateFixed(dt);

		if (this.state.world) {
			// TODO
			// stepSimulation expects detlaTime in seconds! Should be (dt / 1000)
			this.state.world.stepSimulation(dt / 1000, 10);
			this.updateCollisions();
		}

		this.couples.forEach(couple => couple.update(dt));
	}

	updateCollisions() {
		const collisionCount = this.state.world.getDispatcher().getNumManifolds();

		for (let index = 0; index < collisionCount; index++) {
			const element = this.state.world.getDispatcher().getManifoldByIndexInternal(index);

			if (element.getNumContacts() > 0) {
				const entityA = this.findEntityByAmmoObject(element.getBody0());
				const entityB = this.findEntityByAmmoObject(element.getBody1());

				this.events.emit(AmmoEvents.Collision, entityA, entityB);
			}
		}
	}

	updateLate(dt: number) {
		this.couples.forEach(couple => couple.lateUpdate(dt));
	}
}
