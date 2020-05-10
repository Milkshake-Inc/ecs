import { NetEngine } from '@ecs/plugins/net/NetEngine';
import { Entity } from '@ecs/ecs/Entity';
import { ShipBase } from './spaces/ShipBase';
import { ShipServer } from './spaces/ShipServer';

const engine = new NetEngine();
const spaces = new Entity();
spaces.add(new ShipBase(engine, true));
spaces.add(new ShipServer(engine, true));
engine.addEntity(spaces);

console.log('🎉 Server');
