import { Entity } from '@ecs/ecs/Entity';
import { CoupleCallbacks, useCouple, useQueries } from '@ecs/ecs/helpers/StatefulSystems';
import { System } from '@ecs/ecs/System';
import Position from '@ecs/plugins/Position';
import { all, QueryPattern } from '@ecs/utils/QueryHelper';
import { DisplayObject, DisplayObject as PixiDisplayObject } from 'pixi.js';
import RenderState from '../components/RenderState';

export const genericDisplayObjectUpdate = (entity: Entity, displayObject: PixiDisplayObject) => {
	const position = entity.get(Position);

	displayObject.position.set(position.x, position.y);
	displayObject.scale.set(position.scale.x, position.scale.y);
	displayObject.zIndex = position.z;
};

export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const usePixiCouple = <T extends DisplayObject>(
	system: System,
	displayObjectQuery: QueryPattern | QueryPattern[],
	callbacks: Optional<CoupleCallbacks<T>, 'onUpdate' | 'onDestroy'>
) => {
	const query = useQueries(system, {
		renderState: all(RenderState),
		displayObjectQuery
	});

	const getRenderState = () => {
		return query.renderState.first.get(RenderState);
	};

	return useCouple<T>(query.displayObjectQuery, {
		onCreate: entity => {
			const createdDisplayObject = callbacks.onCreate(entity);
			return getRenderState().container.addChild(createdDisplayObject);
		},
		onUpdate: (entity, displayObject, dt) => {
			genericDisplayObjectUpdate(entity, displayObject);
			if (callbacks.onUpdate) {
				callbacks.onUpdate(entity, displayObject, dt);
			}
		},
		onDestroy: (entity, displayObject) => {
			getRenderState().container.removeChild(displayObject);
		}
	});
};
