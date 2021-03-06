import { Engine, Entity, System, all } from 'tick-knock';
import { useQueries, useEvents } from '@ecs/core/helpers';
import { Packet, PacketOpcode } from '../components/Packet';
import { NetEvents } from '@ecs/plugins/net/components/NetEvents';
import Session from '../components/Session';

export type NetworkingCallbacks = {
	connect?: (entity: Entity) => void;
	disconnect?: (entity: Entity) => void;
};

export const useBaseNetworking = (system: System | Engine, callbacks?: NetworkingCallbacks) =>
	useNetworking<PacketOpcode, Packet>(system, callbacks);

export const networkingHandlers = new Map<any, Map<any, any>>();

export const useNetworking = <TOpcode, TPackets extends { opcode: TOpcode }>(system: System | Engine, callbacks?: NetworkingCallbacks) => {
	type PacketsOfType<T extends TOpcode> = Extract<TPackets, { opcode: T }>;

	const events = useEvents();

	if (callbacks?.connect) {
		events.on(NetEvents.OnConnected, callbacks.connect);
	}

	if (callbacks?.disconnect) {
		events.on(NetEvents.OnDisconnected, callbacks.disconnect);
	}

	const queries = useQueries(system, {
		sessions: all(Session)
	});

	const hasEntity = (entity: Entity) => {
		return queries.sessions.includes(entity);
	};

	return {
		on: <T extends TOpcode>(opcode: T, onPacket: (packet: PacketsOfType<T>, entity?: Entity) => void) => {
			const handler = (entity: Entity, packet: TPackets) => {
				if (packet.opcode === opcode) {
					if (!entity || hasEntity(entity)) {
						onPacket(packet as PacketsOfType<T>, entity);
					}
				}
			};
			events.on(NetEvents.OnPacket, handler);

			let opcodeHandlers = networkingHandlers.get(opcode);
			if (!opcodeHandlers) {
				opcodeHandlers = new Map();
				networkingHandlers.set(opcode, opcodeHandlers);
			}
			opcodeHandlers.set(onPacket, handler);
		},
		off: <T extends TOpcode>(opcode: T, onPacket: (packet: PacketsOfType<T>, entity?: Entity) => void) => {
			const handler = networkingHandlers.get(opcode)?.get(onPacket);

			if (handler) {
				events.off(NetEvents.OnPacket, handler);
			}
		},
		once: <T extends TOpcode>(opcode: T, onPacket: (packet: PacketsOfType<T>, entity?: Entity) => void) => {
			const handler = (entity: Entity, packet: TPackets) => {
				if (packet.opcode === opcode) {
					if (!entity || hasEntity(entity)) {
						onPacket(packet as PacketsOfType<T>, entity);
					}
				}
			};
			events.once(NetEvents.OnPacket, handler);
		},
		broadcast: (packet: TPackets, reliable = false) => {
			events.emit(NetEvents.Send, packet, reliable);
		},
		send: (packet: TPackets, reliable = false) => {
			queries.sessions.forEach(entity => events.emit(NetEvents.SendTo, entity, packet, reliable));
		},
		sendRaw: (packet: Uint8Array, reliable = false) => {
			queries.sessions.forEach(entity => events.emit(NetEvents.SendToRaw, entity, packet, reliable));
		},
		sendTo: (entity: Entity, packet: TPackets, reliable = false) => {
			events.emit(NetEvents.SendTo, entity, packet, reliable);
		},
		sendToRaw: (entity: Entity, packet: Uint8Array, reliable = false) => {
			events.emit(NetEvents.SendToRaw, entity, packet, reliable);
		},
		sendExcept: (exceptEntity: Entity, packet: TPackets, reliable = false) => {
			events.emit(NetEvents.SendExcept, exceptEntity, packet, reliable);
		},
		disconnect: (entity: Entity) => {
			events.emit(NetEvents.Disconnect, entity);
		}
	};
};
