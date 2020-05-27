import { Engine } from "@ecs/ecs/Engine";
import { Entity } from "@ecs/ecs/Entity";
import { System } from "@ecs/ecs/System";

export const useEntity = (system: System, create: (entity: Entity) => void) => {

    const entity = new Entity();
    create(entity);

	const onAddedCallback = (engine: Engine) => {
		engine.addEntity(entity);
    };

    const onRemovedCallback = (engine: Engine) => {
		engine.removeEntity(entity);
    };

	system.signalOnAddedToEngine.connect(onAddedCallback);
    system.signalOnRemovedFromEngine.disconnect(onRemovedCallback);

    return entity;
};