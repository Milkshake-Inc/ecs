import { createContext } from 'preact';
import { Engine } from 'tick-knock';
import { useState, useEffect, useContext, EffectCallback, useRef } from 'preact/hooks';
import { functionalSystem } from '@ecs/core/helpers';

export const EngineContext = createContext(null as Engine);

export const useForceUpdate = () => {
	const [, setState] = useState(0);
	return () => setState(state => ++state);
};

export const useBeforeMount = (callback: EffectCallback) => {
	let cleanup: void | (() => void);

	// call cleanup on unmounting
	useEffect(() => cleanup, []);

	const willMount = useRef(true);

	if (willMount.current) {
		cleanup = callback();
	}

	willMount.current = false;
};

export const attachToEngine = (cleanup?: (engine: Engine) => void) => {
	const engine = useContext(EngineContext);
	const forceUpdate = useForceUpdate();

	useBeforeMount(() => {
		const system = functionalSystem([], {
			updateFixed: dt => {
				forceUpdate();
			}
		});
		engine.addSystem(system);

		// cleanup system
		return () => {
			console.log('removing ui system');
			engine.removeSystem(system);
			if (cleanup) {
				cleanup(engine);
			}
		};
	});

	return engine;
};

export const useECS = <T>(state?: (engine: Engine) => T, cleanup?: (engine: Engine) => void) => {
	const [s] = useState(() => {
		const engine = attachToEngine(cleanup);
		return state ? state(engine) : ({} as T);
	});

	return s;
};
