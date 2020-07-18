import { Material, ContactMaterial } from 'cannon-es';
import { CannonBodyOptions } from '@ecs/plugins/physics/components/CannonBody';

export const COURSE_MATERIAL = new Material('COURSE_MATERIAL');

export const BALL_MATERIAL = new Material('BALL_MATERIAL');

export const FLOOR_BALL_MATERIAL = new ContactMaterial(COURSE_MATERIAL, BALL_MATERIAL, {
	friction: 0.3,
	restitution: 0.7
});

export const BALL_BODY: CannonBodyOptions = {
	mass: 1,
	material: BALL_MATERIAL,
	angularDamping: 0.7,
	linearDamping: 0.5
};

export const COURSE_BODY: CannonBodyOptions = {
	material: COURSE_MATERIAL
};
