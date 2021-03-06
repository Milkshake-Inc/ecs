import AmmoBody from '../components/AmmoBody';
import { all, System } from 'tick-knock';
import { useAmmoCouple } from './AmmoCouple';
import Transform from '@ecs/plugins/math/Transform';
import Collisions from '../../3d/components/Collisions';

export const useAmmoBodyCouple = (system: System) =>
	useAmmoCouple(system, all(Transform, AmmoBody), {
		onCreate: entity => {
			const body = entity.get(AmmoBody);
			const transform = entity.get(Transform);
			body.position = transform.position;
			body.quaternion = transform.quaternion;

			// Should this always be here
			body.setCollisionFlags(body.getCollisionFlags() | 8);

			// TODO
			// Should this be added manually when creating an entity
			entity.add(Collisions);

			return body;
		},
		onUpdate: (entity, body: AmmoBody) => {
			const transform = entity.get(Transform);

			transform.position.setFromVector(body.position);
			transform.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
		}
	});
