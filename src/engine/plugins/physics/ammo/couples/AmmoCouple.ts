import { CoupleCallbacks, useCouple, useQueries } from '@ecs/core/helpers';
import { all, QueryPattern, System } from 'tick-knock';
import Ammo from 'ammojs-typed';
import { Optional } from '../../3d/couples/CannonCouple';
import { AmmoInstance } from '../AmmoLoader';
import { AmmoState } from '../AmmoPhysicsSystem';
import AmmoBody from '../components/AmmoBody';

// TODO: Maybe have useAmmoShapeCouple - For shared code between AmmoShapeCouple & AmmoTrimeshCouple
export const useAmmoCouple = (
	system: System,
	physicsObject: QueryPattern | QueryPattern[],
	callbacks: Optional<CoupleCallbacks<any>, 'onUpdate' | 'onDestroy'>
) => {
	const query = useQueries(system, {
		ammoState: all(AmmoState),
		physicsObject
	});

	const getAmmoState = () => {
		return query.ammoState.first?.get(AmmoState);
	};

	const couple = useCouple(query.physicsObject, {
		onCreate: entity => {
			const createdPhysicsObject = callbacks.onCreate(entity);
			const world = getAmmoState().world;

			if (createdPhysicsObject instanceof AmmoInstance.btRigidBody) {
				const body = createdPhysicsObject as AmmoBody;

				// https://pybullet.org/Bullet/BulletFull/btDiscreteDynamicsWorld_8cpp_source.html
				if (body.groups || body.groupsCollideWith) {
					world.addRigidBody(createdPhysicsObject, body.groups, body.groupsCollideWith);
				} else {
					world.addRigidBody(createdPhysicsObject);
				}
			}

			return createdPhysicsObject;
		},
		onUpdate: (entity, physicsObject, dt) => {
			if (callbacks.onUpdate) {
				if (physicsObject) {
					callbacks.onUpdate(entity, physicsObject, dt);
				}
			}
		},
		onDestroy: (entity, physicsObject) => {
			if (!getAmmoState()) return;
			const { world } = getAmmoState();
			if (physicsObject instanceof AmmoInstance.btRigidBody) {
				world.removeRigidBody(physicsObject);
			}
		}
	});

	return {
		...couple,
		getEntity: (ammoObjectA: Ammo.btCollisionObject) => {
			for (const [entity] of couple.entities) {
				const ammoObjectB: any = couple.entities.get(entity);

				// TODO
				// Maybe a cheaper way of doing this?
				// And with types
				if ((ammoObjectA as any).getCollisionShape() == ammoObjectB.getCollisionShape()) return entity;
			}
		}
	};
};
