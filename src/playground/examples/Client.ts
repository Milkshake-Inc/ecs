import RenderSystem from '@ecs/plugins/3d/systems/RenderSystem';
import { ThreeEngine } from '@ecs/plugins/3d/ThreeEngine';
import { Fog, PCFSoftShadowMap } from 'three';
import TerrainSpace from './spaces/TerrainSpace';
import CharacterSpace from './spaces/CharacterSpace';
import VoxelSpace from './spaces/VoxelSpace';
import { Entity } from '@ecs/ecs/Entity';

const engine = new ThreeEngine(
	new RenderSystem({
		color: 0x262626,
		configure: (renderer, scene) => {
			// renderer.setPixelRatio(2);
			renderer.shadowMap.type = PCFSoftShadowMap;
			renderer.shadowMap.enabled = true;

			scene.fog = new Fog(0x262626, 10, 200);
		}
	})
);

const spaces = new Entity();
spaces.add(new TerrainSpace(engine));
spaces.add(new CharacterSpace(engine));
spaces.add(new VoxelSpace(engine));
engine.addEntity(spaces);

spaces.get(TerrainSpace).open();

console.log('🎉 Client');
