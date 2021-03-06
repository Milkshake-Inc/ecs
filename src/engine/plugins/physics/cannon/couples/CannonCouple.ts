import { CoupleCallbacks, useCouple, useQueries } from '@ecs/core/helpers';
import { System, all, QueryPattern } from 'tick-knock';
import { Body, Shape, Constraint, ContactMaterial, Material } from 'cannon-es';
import PhysicsState from '../components/PhysicsState';
import CannonInstancedBody from '../components/CannonInstancedBody';

export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const useCannonCouple = <T extends Body | Shape | Shape[] | Constraint | ContactMaterial | Material | CannonInstancedBody>(
	system: System,
	physicsObject: QueryPattern | QueryPattern[],
	callbacks: Optional<CoupleCallbacks<T>, 'onUpdate' | 'onDestroy'>
) => {
	const query = useQueries(system, {
		physicsState: all(PhysicsState),
		physicsObject
	});

	const getPhysicsState = () => {
		return query.physicsState.first.get(PhysicsState);
	};

	return useCouple<T>(query.physicsObject, {
		onCreate: entity => {
			const createdPhysicsObject = callbacks.onCreate(entity);
			const world = getPhysicsState().world;

			if (createdPhysicsObject instanceof Body) {
				world.addBody(createdPhysicsObject);
			}

			if (createdPhysicsObject instanceof CannonInstancedBody) {
				createdPhysicsObject.bodies.forEach(b => world.addBody(b));
			}

			if (createdPhysicsObject instanceof Constraint) {
				world.addConstraint(createdPhysicsObject);
			}

			if (createdPhysicsObject instanceof ContactMaterial) {
				world.addContactMaterial(createdPhysicsObject);
			}

			if (createdPhysicsObject instanceof Material) {
				world.addMaterial(createdPhysicsObject);
			}

			return createdPhysicsObject;
		},
		onUpdate: (entity, physicsObject, dt) => {
			if (callbacks.onUpdate) {
				callbacks.onUpdate(entity, physicsObject, dt);
			}
		},
		onLateUpdate: (entity, physicsObject, dt) => {
			if (callbacks.onLateUpdate) {
				callbacks.onLateUpdate(entity, physicsObject, dt);
			}
		},
		onDestroy: (entity, physicsObject) => {
			if (physicsObject instanceof Body) {
				getPhysicsState().world.removeBody(physicsObject);
			}
		}
	});
};
