import { useCouple, useQueries } from '@ecs/core/helpers';
import { System, all, any } from 'tick-knock';
import { Object3D, Vector3, Raycaster, ArrowHelper, PerspectiveCamera } from 'three';
import Raycast, { RaycastDebug, RaycastCamera } from '../components/Raycaster';
import RenderState from '../components/RenderState';
import RenderSystem from '../systems/RenderSystem';
import { useThreeCouple } from './ThreeCouple';
import Transform from '@ecs/plugins/math/Transform';
import { ToThreeVector3 } from '@ecs/plugins/tools/Conversions';

export const useRaycastCouple = <T extends Object3D>(system: System) => {
	const query = useQueries(system, {
		renderState: all(RenderState),
		raycast: any(Raycast, RaycastCamera),
		camera: any(PerspectiveCamera)
	});

	const getRenderState = () => {
		return query.renderState.first.get(RenderState);
	};

	return useCouple<Raycaster>(query.raycast, {
		onCreate: entity => {
			const raycaster = new Raycaster();
			entity.add(raycaster);
			return raycaster;
		},
		onUpdate: (entity, raycaster, dt) => {
			if (entity.has(Raycast)) {
				const { position } = entity.get(Transform);
				const raycast = entity.get(Raycast);

				raycaster.ray.origin.set(position.x, position.y, position.z);

				if (raycast.offset) {
					raycaster.ray.origin.x += raycast.offset.x;
					raycaster.ray.origin.y += raycast.offset.y;
					raycaster.ray.origin.z += raycast.offset.z;
				}

				raycaster.near = raycast.near;
				raycaster.far = raycast.far;

				raycaster.ray.direction.set(raycast.direction.x, raycast.direction.y, raycast.direction.z);

				raycast.intersects = raycaster.intersectObjects(getRenderState().scene.children, true);
			}

			if (entity.has(RaycastCamera)) {
				if (query.camera.first) {
					const raycast = entity.get(RaycastCamera);
					const camera = query.camera.first.get(PerspectiveCamera);

					raycaster.near = raycast.near;
					raycaster.far = raycast.far;

					raycaster.setFromCamera(raycast.position, camera);
					raycast.intersects = raycaster.intersectObjects(getRenderState().scene.children, true);
				}
			}
		},
		onDestroy: (entity, object3D) => {}
	});
};

export const useRaycastDebugCouple = (system: RenderSystem) =>
	useThreeCouple<ArrowHelper>(system, all(Raycast, RaycastDebug), {
		onCreate: entity => {
			return new ArrowHelper(new Vector3());
		},
		onUpdate(entity, line) {
			const { ray } = entity.get(Raycaster);
			line.setDirection(ToThreeVector3(ray.direction));
			line.setLength(entity.get(RaycastDebug).length);
		}
	});
