import { Circle, Box, Polygon, Vector } from 'sat';
import Vector2 from '@ecs/math/Vector2';

type Shapes = Circle | Polygon;

export class ArcadeCollisionShape {
	public static Circle(size: number) {
		return new ArcadeCollisionShape(new Circle(undefined, size));
	}

	public static Box(width: number, height: number) {
		return new ArcadeCollisionShape(new Box(undefined, width, height).toPolygon());
	}

	public static Polygon(points: Vector2[]) {
		return new ArcadeCollisionShape(
			new Polygon(
				undefined,
				points.map(v => new Vector(v.x, v.y))
			)
		);
	}

	constructor(public shape: Shapes) {}
}