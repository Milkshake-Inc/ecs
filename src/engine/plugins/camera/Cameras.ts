import { Entity } from '@ecs/ecs/Entity';
import Transform from '../Transform';
import Camera from './components/Camera';

export function DefaultCamera() {
	const camera = new Entity();
	camera.add(Transform);
	camera.add(Camera, { width: 1280, height: 720, zoom: 1 });
}
