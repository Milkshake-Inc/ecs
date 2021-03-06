import { Entity, System, all, QueryPattern } from 'tick-knock';
import { CoupleCallbacks, useCouple, useQueries, useEvents } from '@ecs/core/helpers';
import Transform from '@ecs/plugins/math/Transform';
import { Object3D } from 'three';
import RenderState from '../components/RenderState';

export const genericObject3DUpdate = (entity: Entity, object3D: Object3D) => {
	const transform = entity.get(Transform);

	object3D.position.set(transform.x, transform.y, transform.z);
	object3D.scale.set(transform.sx, transform.sy, transform.sz);
	object3D.quaternion.set(transform.qx, transform.qy, transform.qz, transform.qw);
};

export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export enum ThreeEvents {
	Clicked = 'clicked'
}

export const useThreeCouple = <T extends Object3D>(
	system: System,
	object3DQuery: QueryPattern | QueryPattern[],
	callbacks: Optional<CoupleCallbacks<T>, 'onUpdate' | 'onDestroy'>
) => {
	const query = useQueries(system, {
		renderState: all(RenderState),
		object3DQuery
	});

	const events = useEvents();

	const getRenderState = () => {
		return query.renderState.first.get(RenderState);
	};

	return useCouple<T>(query.object3DQuery, {
		onCreate: entity => {
			const created3DObject = callbacks.onCreate(entity);

			created3DObject.addEventListener('click', () => {
				events.emit(ThreeEvents.Clicked, entity);
			});

			getRenderState().scene.add(created3DObject);
			return created3DObject;
		},
		onUpdate: (entity, object3D, dt) => {
			genericObject3DUpdate(entity, object3D);
			if (callbacks.onUpdate) {
				callbacks.onUpdate(entity, object3D, dt);
			}
		},
		onLateUpdate: (entity, object3D, dt) => {
			if (callbacks.onLateUpdate) {
				callbacks.onLateUpdate(entity, object3D, dt);
			}
		},
		onDestroy: (entity, object3D) => {
			getRenderState().scene.remove(object3D);
		}
	});
};
