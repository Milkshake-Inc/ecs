import { Engine } from '@ecs/ecs/Engine';
import { Entity } from '@ecs/ecs/Entity';
import { useQueries, useState } from '@ecs/ecs/helpers';
import { System } from '@ecs/ecs/System';
import Session from '@ecs/plugins/net/components/Session';
import { all } from '@ecs/ecs/Query';
import GolfPlayer from '../../../golf/components/GolfPlayer';
import PlayerBall from '../../../golf/components/PlayerBall';
import { createBall } from '../../utils/CreateBall';
import {
	AllGamesRequest,
	GameState,
	GolfPacketOpcode,
	JoinRoom,
	StartGame,
	useGolfNetworking,
	GolfGameState
} from './../../constants/GolfNetworking';
import { ServerGolfSpace } from './../../spaces/ServerGolfSpace';
import CannonBody from '@ecs/plugins/physics/3d/components/CannonBody';
import Spawn from '../../../golf/components/Spawn';

class GolfGameServerEngine extends Engine {
	public space: ServerGolfSpace;

	private playerQueries = useQueries(this, {
		players: all(GolfPlayer, Session),
		balls: all(CannonBody, Session),
		spawn: all(Spawn)
	});

	private networking = useGolfNetworking(this);

	private state = useState(this, new GolfGameState(), {
		state: GameState.LOBBY
	});

	constructor() {
		super();

		this.space = new ServerGolfSpace(this, true);

		this.networking.on(GolfPacketOpcode.START_GAME, this.handleStartGame.bind(this));
	}

	handleStartGame(packet: StartGame, entity: Entity) {
		// Ignore if they aren't the host
		if (!entity.get(GolfPlayer).host) return;

		this.playerQueries.players.entities.forEach(entity => {
			const player = createBall();
			player.add(PlayerBall);
			console.log('Creating balls');
			player.components.forEach(c => {
				entity.add(c);
			});
		});

		this.state.state = GameState.INGAME;
	}

	updateFixed(deltaTime: number) {
		super.updateFixed(deltaTime);

		if (this.state.state == GameState.INGAME && this.playerQueries.balls.length == 0) {
			console.log(`🏠  Reset lobby`);
			this.state.state = GameState.LOBBY;
		}

		const host = this.playerQueries.players.first;
		if (host) {
			host.get(GolfPlayer).host = 1;
		}
	}
}

export class ServerRoomSystem extends System {
	protected networking = useGolfNetworking(this, {
		disconnect: entity => this.handleDisconnect(entity)
	});

	protected rooms: Map<string, GolfGameServerEngine>;
	protected entityToRoomEngine: Map<Entity, GolfGameServerEngine>;

	constructor() {
		super();

		this.rooms = new Map();
		this.entityToRoomEngine = new Map();

		this.networking.on(GolfPacketOpcode.ALL_GAMES_REQUEST, this.handleAllGamesRequest.bind(this));
		this.networking.on(GolfPacketOpcode.JOIN_GAME, this.handleJoinGamesRequest.bind(this));

		this.createRoom('default');
		this.createRoom('lucas');
		this.createRoom('jeff');
	}

	handleDisconnect(entity: Entity): void {
		if (this.entityToRoomEngine.has(entity)) {
			const currentRoom = this.entityToRoomEngine.get(entity);

			currentRoom.removeEntity(entity);
		}
	}

	allRoomIds() {
		return Array.from(this.rooms.keys());
	}

	createRoom(name: string) {
		const newEngine = new GolfGameServerEngine();
		this.rooms.set(name, newEngine);

		console.log(`🏠 Created new room ${name}`);
	}

	handleAllGamesRequest(packet: AllGamesRequest, entity: Entity) {
		this.networking.sendTo(entity, {
			opcode: GolfPacketOpcode.ALL_GAMES_RESPONSE,
			games: this.allRoomIds()
		});
	}

	handleJoinGamesRequest(packet: JoinRoom, entity: Entity) {
		// remove from old room
		if (this.entityToRoomEngine.has(entity)) {
			const currentRoom = this.entityToRoomEngine.get(entity);

			currentRoom.removeEntity(entity);
		}

		// add to new room
		if (this.rooms.has(packet.roomId)) {
			const newRoom = this.rooms.get(packet.roomId);

			newRoom.addEntity(entity);
			this.entityToRoomEngine.set(entity, newRoom);
		}
	}

	update(deltaTime: number) {
		for (const room of this.rooms.values()) {
			// Check players
			room.update(deltaTime);
		}
	}

	updateFixed(deltaTime: number) {
		for (const room of this.rooms.values()) {
			room.updateFixed(deltaTime);
		}
	}

	updateLate(deltaTime: number) {
		for (const room of this.rooms.values()) {
			room.updateLate(deltaTime);
		}
	}

	updateRender(deltaTime: number) {
		for (const room of this.rooms.values()) {
			room.updateRender(deltaTime);
		}
	}
}
