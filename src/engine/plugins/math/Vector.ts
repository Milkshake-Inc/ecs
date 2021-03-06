import MathHelper from './MathHelper';
import Quaternion from './Quaternion';

export type Vector = { x: number; y: number; z: number };

export type Vector2 = { x: number; y: number };

// Refs
// https://github.com/ManojLakshan/monogame/blob/master/MonoGame.Framework/Vector3.cs
// https://github.com/photonstorm/phaser/blob/v2.4.4/src/geom/Point.js
export default class Vector3 {
	public static get ZERO(): Vector3 {
		return Vector3.Equal(0);
	}
	public static get ONE(): Vector3 {
		return Vector3.Equal(1);
	}
	public static get HALF(): Vector3 {
		return Vector3.Equal(0.5);
	}

	public static get UP(): Vector3 {
		return new Vector3(0, 1, 0);
	}

	public static get DOWN(): Vector3 {
		return new Vector3(0, -1, 0);
	}

	public static get LEFT(): Vector3 {
		return new Vector3(-1, 0, 0);
	}

	public static get RIGHT(): Vector3 {
		return new Vector3(1, 0, 0);
	}

	public static get FORWARD(): Vector3 {
		return new Vector3(0, 0, -1);
	}

	public static get BACKWARD(): Vector3 {
		return new Vector3(0, 0, 1);
	}

	public static From(value: Vector): Vector3 {
		return new Vector3(value.x, value.y, value.z);
	}

	public static To(value: Vector3) {
		return { x: value.x, y: value.y, z: value.z };
	}

	public static Equal(value: number): Vector3 {
		return new Vector3(value, value, value);
	}

	public static Reflect(inDirection: Vector3, inNormal: Vector3) {
		const factor = -2 * Vector3.Dot(inNormal, inDirection);
		return new Vector3(factor * inNormal.x + inDirection.x, factor * inNormal.y + inDirection.y, factor * inNormal.z + inDirection.z);
	}

	public static Dot(value1: Vector3, value2: Vector3) {
		return value1.x * value2.x + value1.y * value2.y + value1.z * value2.z;
	}

	public static Cross(value1: Vector3, value2: Vector3) {
		const x = value1.y * value2.z - value2.y * value1.z;
		const y = -(value1.x * value2.z - value2.x * value1.z);
		const z = value1.x * value2.y - value2.x * value1.y;

		return new Vector3(x, y, z);
	}

	public static Normalize(value: Vector3): Vector3 {
		let factor = Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);
		factor = 1 / factor;
		return new Vector3(value.x * factor, value.y * factor, value.z * factor);
	}

	public static Angle(from: Vector3, to: Vector3): number {
		return Math.acos(MathHelper.clamp(Vector3.Dot(from.normalize(), to.normalize()), -1, 1)) * 57.29578;
	}

	public x: number;
	public y: number;
	public z: number;

	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	set(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;

		return this;
	}

	from(value: Vector) {
		return this.copy(value);
	}

	copy(value: Vector) {
		this.x = value.x;
		this.y = value.y;
		this.z = value.z;

		return this;
	}

	add(value: Partial<Vector> | number) {
		this.x += typeof value === 'number' ? value : value.x || 0;
		this.y += typeof value === 'number' ? value : value.y || 0;
		this.z += typeof value === 'number' ? value : value.z || 0;

		return this;
	}

	sub(value: Partial<Vector> | number) {
		this.x -= typeof value === 'number' ? value : value.x || 0;
		this.y -= typeof value === 'number' ? value : value.y || 0;
		this.z -= typeof value === 'number' ? value : value.z || 0;

		return this;
	}

	multi(value: Partial<Vector> | number) {
		this.x *= typeof value === 'number' ? value : value.x || 1;
		this.y *= typeof value === 'number' ? value : value.y || 1;
		this.z *= typeof value === 'number' ? value : value.z || 1;

		return this;
	}

	dev(value: Partial<Vector> | number) {
		this.x /= typeof value === 'number' ? value : value.x || 1;
		this.y /= typeof value === 'number' ? value : value.y || 1;
		this.z /= typeof value === 'number' ? value : value.z || 1;

		return this;
	}

	reverse() {
		return this.multi(-1);
	}

	reflect(normal: Vector3) {
		const factor = -2 * Vector3.Dot(normal, this);
		this.x = factor * normal.x + this.x;
		this.y = factor * normal.y + this.y;
		this.z = factor * normal.z + this.z;

		return this;
	}

	setFromQuaternion({ x, y, z, w }: Quaternion) {
		this.x = Math.atan2(2 * (x * y + z * w), 1 - 2 * (y * y + z * z));
		this.y = Math.asin(2 * (x * z - w * y));
		this.z = Math.atan2(2 * (x * w + y * z), 1 - 2 * (z * z + w * w));

		return this;
	}

	projectOnVector(vector: Vector3) {
		const denom = vector.lengthSq();
		if (denom === 0) {
			return Vector3.ZERO;
		}

		return vector.multi(vector.dot(this) / denom);
	}

	projectOnPlane(planeNormal: Vector3) {
		return this.sub(this.projectOnVector(planeNormal));
	}

	distance(value: Vector3 | Vector): number {
		return Math.sqrt(this.distanceSq(value));
	}

	distanceSq(value: Vector3 | Vector): number {
		return Math.pow(this.x - value.x, 2) + Math.pow(this.y - value.y, 2) + Math.pow(this.z - value.z, 2);
	}

	length() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	lengthSq() {
		return Math.sqrt(this.length());
	}

	equals(value: Vector): boolean {
		return this.x == value.x && this.y == value.y && this.z == value.z;
	}

	clone(): Vector3 {
		return Vector3.From(this);
	}

	toString(): string {
		return `x: ${this.x}, y: ${this.y}, z: ${this.y}`;
	}

	toBoolean(): boolean {
		return !this.equals(Vector3.ZERO);
	}

	magnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	normalize() {
		return Vector3.Normalize(this);
	}

	dot(value: Vector3 | Vector) {
		return this.x * value.x + this.y * value.y + this.z * value.z;
	}

	cross(value: Vector3 | Vector) {
		const x = this.y * value.z - value.y * this.z;
		const y = -(this.x * value.z - value.x * this.z);
		const z = this.x * value.y - value.x * this.y;

		return new Vector3(x, y, z);
	}

	applyQuaternion(q: Quaternion) {
		const x = this.x,
			y = this.y,
			z = this.z;
		const qx = q.x,
			qy = q.y,
			qz = q.z,
			qw = q.w;

		// calculate quat * vector
		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = -qx * x - qy * y - qz * z;

		// calculate result * inverse quat
		return new Vector3(
			ix * qw + iw * -qx + iy * -qz - iz * -qy,
			iy * qw + iw * -qy + iz * -qx - ix * -qz,
			iz * qw + iw * -qz + ix * -qy - iy * -qx
		);
	}
}
