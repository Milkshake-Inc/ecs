import { Entity, EntitySnapshot } from '@ecs/ecs/Entity';
import { Queries, StatefulIterativeSystem } from '@ecs/ecs/helpers/StatefulSystems';
import { any, makeQuery, all } from '@ecs/utils/QueryHelper';
import diff from 'json-diff';
import { ClientPingState } from '../components/ClientPingState';
import { PacketOpcode, WorldSnapshot } from '../components/Packet';
import Session from '../components/Session';
import { ClientPingStateQuery } from './ClientPingSystem';

export class ClientWorldSnapshotState<T> {
	public snapshotHistory: T[];
	public receivedServerSnapshot: number;
	public latestAuthoritativeSnapshotTick: number;

	public snapshotsRewrote: number[];

	constructor() {
		this.snapshotHistory = [];
		this.receivedServerSnapshot = 0;
		this.latestAuthoritativeSnapshotTick = 0;
		this.snapshotsRewrote = [];
	}
}

export const ClientWorldSnapshotStateQuery = {
	snapshotState: makeQuery(all(ClientWorldSnapshotState))
};

const objectIsEqual = (objectA: {}, objectB: {}) => {
	return JSON.stringify(objectA) == JSON.stringify(objectB);
};

export abstract class ClientWorldSnapshotSystem<TSnapshot extends {}, TQueries extends Queries = {}> extends StatefulIterativeSystem<
	ClientWorldSnapshotState<TSnapshot>,
	TQueries & typeof ClientPingStateQuery
> {
	constructor(queries: TQueries) {
		super(makeQuery(any(Session)), new ClientWorldSnapshotState(), {
			...queries,
			...ClientPingStateQuery
		});
	}

	abstract takeSnapshot(): TSnapshot;
	abstract applySnapshot(snapshot: TSnapshot): void;
	abstract createEntitiesFromSnapshot(snapshot: TSnapshot): void;
	abstract runSimulation(deltaTime: number): void;
	abstract applyPlayerInput(tick: number): void;

	added = false;


	updateEntityFixed(entity: Entity, deltaTime: number) {
		// Handle world packets
		if(!this.added) {
			const session = entity.get(Session);
		session.socket.handleImmediate((packet) => {

			if(packet.opcode == PacketOpcode.WORLD) {
				this.updateSnapshot(packet as any);
			}
		});

		this.added = true;
		}
	}

	updateFixed(deltaTime: number) {
		this.state.snapshotHistory[this.serverTick] = this.takeSnapshot();

		super.updateFixed(deltaTime);
	}

	updateSnapshot({ snapshot, tick }: WorldSnapshot<TSnapshot>) {
		this.createEntitiesFromSnapshot(snapshot);

		// If first tick - applySnapshot()



		const remoteTick = tick;
		const historicLocalSnapshot = this.state.snapshotHistory[remoteTick];

		// We didn't proccess these frames on client
		if (remoteTick < this.state.receivedServerSnapshot) {
			console.log('👴🏼 Snapshot before my time');
			return;
		}

		// Old update
		if (tick < this.state.latestAuthoritativeSnapshotTick) {
			console.log('👴🏼 Received old/out-of-order packet - Ignoring.');
			return;
		}

		// We have this snapshot
		if (historicLocalSnapshot) {
			const historyMatchesServer = objectIsEqual(historicLocalSnapshot, snapshot);

			if (!historyMatchesServer) {
				console.log('🔌 Out of sync diff - Client diff to server');
				console.log(diff.diffString(snapshot, historicLocalSnapshot));

				if (this.state.snapshotsRewrote.includes(tick)) {
					console.log("🤯 We've already re-written state for this frame. Why again?");
				}

				this.applySnapshot(snapshot);

				// Over ride the old snapshot with the servers new one
				Object.assign(historicLocalSnapshot, this.takeSnapshot());

				this.state.snapshotHistory[tick] = historicLocalSnapshot;

				// Check what we've applied is right
				const appliedCorrectly = objectIsEqual(historicLocalSnapshot, snapshot);

				if (!appliedCorrectly) {
					console.log("🛑 Couldn't apply serverSnapshot!");
					console.log(diff.diffString(historicLocalSnapshot, snapshot));
				}

				this.state.latestAuthoritativeSnapshotTick = tick;

				// Revert time back to server snapshots tick
				console.log(
					`⏪ Rewinding to tick ${remoteTick}. Fast-Forwarding to ${this.serverTick} (${this.serverTick - remoteTick}ticks)`
				);

				// Since we've applied the servers results of remoteTick, we start applying updates on
				// the ticks after (let currentEmulatedTick = remoteTick + 1)
				for (let currentEmulatedTick = remoteTick + 1; currentEmulatedTick <= this.serverTick; currentEmulatedTick++) {
					// Apply this local historic input for this frame
					this.applyPlayerInput(currentEmulatedTick);

					// Re-run systems that effect these entities - maybe call updateEntity manually be better?
					this.runSimulation(1000 / 60);

					// Store this newly generated snapsho t from an authorative server snapshot in history
					this.state.snapshotHistory[currentEmulatedTick] = this.takeSnapshot();

					this.state.snapshotsRewrote.push(currentEmulatedTick);
				}
			}
		} else {
			console.log("Not on record - apply")
			this.applySnapshot(snapshot);
			this.state.snapshotHistory[this.serverTick] = this.takeSnapshot();
		}

		this.state.receivedServerSnapshot = tick;
	}

	get serverTick() {
		return this.queries.pingState.first.get(ClientPingState).serverTick;
	}
}
