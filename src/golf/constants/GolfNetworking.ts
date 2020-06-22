import { System } from '@ecs/ecs/System';
import { NetworkingCallbacks, useNetworking } from '@ecs/plugins/net/helpers/useNetworking';

export enum GolfPacketOpcode {
	SEND_MAP = 6,
	PLACE_PART,
	REMOVE_PART,
	SPAWN_PLAYER,
	SHOOT_BALL,
	PREP_SHOOT
}

export type ServerSendMap = {
	opcode: GolfPacketOpcode.SEND_MAP;
	name: string;
	data: { modelName: string; transform: any }[];
};

export type PlacePart = {
	opcode: GolfPacketOpcode.PLACE_PART;
	data: { modelName: string; transform: any };
};

export type SpawnPlayer = {
	opcode: GolfPacketOpcode.SPAWN_PLAYER;
};

export type ShootBall = {
	opcode: GolfPacketOpcode.SHOOT_BALL;
	velocity: {
		x: number;
		z: number;
	};
};

export type PrepShot = {
	opcode: GolfPacketOpcode.PREP_SHOOT;
};

export type GolfPackets = ServerSendMap | PlacePart | SpawnPlayer | ShootBall | PrepShot;

export const useGolfNetworking = (system: System, callbacks?: NetworkingCallbacks) =>
	useNetworking<GolfPacketOpcode, GolfPackets>(system, callbacks);
