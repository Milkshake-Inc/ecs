/* eslint-disable no-prototype-builtins */
import { all, any, System, Entity } from 'tick-knock';
import {
	Shape,
	Body,
	Particle,
	Plane,
	Sphere,
	Heightfield,
	Cylinder,
	ConvexPolyhedron,
	Box,
	Vec3,
	Quaternion as CannonQuaternion,
	Trimesh
} from 'cannon-es';
import { useCannonCouple } from './CannonCouple';
import Transform from '@ecs/plugins/math/Transform';
import MeshShape from '../components/MeshShape';
import { Mesh, Vector3 as ThreeVector3, Quaternion as ThreeQuaternion, Euler, BufferGeometry } from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry';
import CannonBody from '../components/CannonBody';
import BoundingSphereShape from '../components/BoundingSphereShape';
import BoundingCylinderShape from '../components/BoundingCylinderShape';
import BoundingBoxShape from '../components/BoundingBoxShape';
import BoundingCapsuleShape from '../components/BoundingCapsuleShape';
import CapsuleShape from '../components/CapsuleShape';
import CannonInstancedBody from '../components/CannonInstancedBody';
import GLTFShape from '../components/GLTFShape';
import { getGeometry } from '@ecs/plugins/render/3d/utils/MeshUtils';
import { ToCannonVector3 } from '../utils/Conversions';
import { applyToMeshesIndividually, getMesh } from '../../utils/PhysicsUtils';

export const UnexpectedShapeError = new Error('should not use shape on entity');

export const useShapeCouple = (system: System) =>
	useCannonCouple<Shape | Shape[]>(
		system,
		[
			all(Transform),
			any(Body, CannonBody, CannonInstancedBody),
			any(
				Shape,
				Particle,
				Plane,
				Box,
				Sphere,
				ConvexPolyhedron,
				Cylinder,
				Trimesh,
				Heightfield,
				MeshShape,
				BoundingSphereShape,
				BoundingBoxShape,
				BoundingCylinderShape,
				BoundingCapsuleShape,
				CapsuleShape,
				GLTFShape
			)
		],
		{
			onCreate: entity => {
				const body = getBody(entity);

				if (entity.has(Shape)) {
					throw UnexpectedShapeError;
				}

				if (entity.has(Particle)) {
					body.addShape(entity.get(Particle));
					return entity.get(Particle);
				}

				if (entity.has(Plane)) {
					body.addShape(entity.get(Plane));

					// By default cannon points plane in local z dir. Change to y.
					body.quaternion.setFromAxisAngle(new Vec3(-1, 0, 0), Math.PI / 2);

					return entity.get(Plane);
				}

				if (entity.has(Box)) {
					body.addShape(entity.get(Box));
					return entity.get(Box);
				}

				if (entity.has(Sphere)) {
					body.addShape(entity.get(Sphere));
					return entity.get(Sphere);
				}

				if (entity.has(ConvexPolyhedron)) {
					body.addShape(entity.get(ConvexPolyhedron));
					return entity.get(ConvexPolyhedron);
				}

				if (entity.has(Trimesh)) {
					body.addShape(entity.get(Trimesh));
					return entity.get(Trimesh);
				}

				if (entity.has(Cylinder)) {
					body.addShape(entity.get(Cylinder));
					return entity.get(Cylinder);
				}

				if (entity.has(GLTFShape)) {
					const gltf = entity.get(GLTFShape).gltf;
					const shapes: Shape[] = [];

					gltf.scene.traverse(child => {
						if (child.hasOwnProperty('userData')) {
							if (child.userData.hasOwnProperty('data')) {
								if (child.userData.data === 'collision') {
									const pos = ToCannonVector3(child.getWorldPosition(new ThreeVector3()));
									const visible = Boolean(child.userData.visible);

									if (child.userData.shape === 'box') {
										child.visible = visible;

										const box = new Box(new Vec3(child.scale.x, child.scale.y, child.scale.z));
										body.addShape(box, pos);
										shapes.push(box);
									}

									if (child.userData.shape === 'boundingbox') {
										child.visible = visible;

										const { shape, position } = generateBoundingBox(child as Mesh);

										body.addShape(shape, ToCannonVector3(position));
										shapes.push(shape);
									}

									if (child.userData.shape === 'sphere') {
										child.visible = visible;

										const sphere = new Sphere(child.scale.x);
										body.addShape(sphere, pos);
										shapes.push(sphere);
									}

									if (child.userData.shape === 'mesh') {
										child.visible = visible;

										const mesh = child.clone() as Mesh;
										const geometry = getGeometry(mesh);
										geometry.scale(child.scale.x, child.scale.y, child.scale.z);

										const shape = generateConvexPolyhedron(geometry);
										body.addShape(shape, pos);
										shapes.push(shape);
									}
								}
							}
						}
					});

					return shapes;
				}

				if (entity.has(Heightfield)) {
					const mesh = getMesh(entity);

					const position = new ThreeVector3();
					const scale = new ThreeVector3();
					const rotation = new ThreeQuaternion();

					mesh.updateMatrixWorld();
					mesh.matrixWorld.decompose(position, rotation, scale);

					mesh.geometry.computeBoundingBox();
					const size = mesh.geometry.boundingBox.getSize(new ThreeVector3()).divideScalar(2);

					const newRotation = new CannonQuaternion();
					newRotation.setFromEuler(Math.PI, -Math.PI, Math.PI / 2);
					body.addShape(entity.get(Heightfield), new Vec3(-size.x, size.y, 0), newRotation);

					return entity.get(Heightfield);
				}

				if (entity.has(CapsuleShape)) {
					const capsule = entity.get(CapsuleShape);

					const shapes: Shape[] = [];

					let height = capsule.height;
					if (capsule.offsetRadius) {
						height = capsule.height - capsule.radius * 2;
					}

					const position = new Vec3(0, height / 2, 0);

					const major = entity.get(CapsuleShape).axis;
					const rotation = new ThreeQuaternion().setFromEuler(
						new Euler(major == 'y' ? Math.PI / 2 : 0, major == 'x' ? Math.PI / 2 : 0, major == 'z' ? Math.PI / 2 : 0)
					);

					const cylinderShape = new Cylinder(capsule.radius, capsule.radius, height, 12);
					body.addShape(cylinderShape, position, new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));
					shapes.push(cylinderShape);

					const topSphereShape = new Sphere(capsule.radius);
					const topSphereShapePos = position.clone();
					topSphereShapePos[major] -= height / 2;
					body.addShape(topSphereShape, topSphereShapePos, new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));
					shapes.push(topSphereShape);

					const bottomSphereShape = new Sphere(capsule.radius);
					const bottomSphereShapePos = position.clone();
					bottomSphereShapePos[major] += height / 2;
					body.addShape(
						bottomSphereShape,
						bottomSphereShapePos,
						new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
					);
					shapes.push(bottomSphereShape);

					entity.add(shapes);
					return shapes;
				}

				if (entity.has(BoundingBoxShape)) {
					const shapes: Box[] = [];

					applyToMeshesIndividually(entity, ({ mesh, geometry, position, rotation }) => {
						// console.log(`generating BoundingBox for ${mesh.name}`);

						// Calculate bounding box and offset world position
						geometry.computeBoundingBox();
						const center = geometry.boundingBox.getCenter(new ThreeVector3());
						const size = geometry.boundingBox.getSize(new ThreeVector3()).divideScalar(2);
						position.add(center.applyQuaternion(rotation));

						const shape = new Box(new Vec3(size.x, size.y, size.z));

						body.addShape(
							shape,
							new Vec3(position.x, position.y, position.z),
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);
						shapes.push(shape);
					});

					entity.add(shapes);
					return shapes;
				}

				if (entity.has(BoundingSphereShape)) {
					const shapes: Sphere[] = [];

					applyToMeshesIndividually(entity, ({ mesh, geometry, position, rotation }) => {
						// console.log(`generating BoundingSphere for ${mesh.name}`);

						// Calculate bounding sphere and offset world position
						geometry.computeBoundingSphere();
						const center = geometry.boundingSphere.center;
						const size = geometry.boundingSphere.radius;
						position.add(center.applyQuaternion(rotation));

						const shape = new Sphere(size);

						body.addShape(
							shape,
							new Vec3(position.x, position.y, position.z),
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);
						shapes.push(shape);
					});

					entity.add(shapes);
					return shapes;
				}

				if (entity.has(BoundingCylinderShape)) {
					const shapes: Cylinder[] = [];

					applyToMeshesIndividually(entity, ({ mesh, geometry, position, rotation }) => {
						// console.log(`generating BoundingCylinder for ${mesh.name}`);

						// Calculate bounding box and offset world position
						geometry.computeBoundingBox();
						const box = geometry.boundingBox;
						const center = box.getCenter(new ThreeVector3());
						position.add(center.applyQuaternion(rotation));

						const axes = ['x', 'y', 'z'];
						const major = entity.get(BoundingCylinderShape).axis;
						const minor = axes.splice(axes.indexOf(major), 1) && axes;

						const height = box.max[major] - box.min[major];
						const radius = 0.5 * Math.max(box.max[minor[0]] - box.min[minor[0]], box.max[minor[1]] - box.min[minor[1]]);

						rotation = rotation.multiplyQuaternions(
							rotation,
							new ThreeQuaternion().setFromEuler(
								new Euler(major == 'y' ? Math.PI / 2 : 0, major == 'x' ? Math.PI / 2 : 0, major == 'z' ? Math.PI / 2 : 0)
							)
						);

						const shape = new Cylinder(radius, radius, height, 12);

						body.addShape(
							shape,
							new Vec3(position.x, position.y, position.z),
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);
						shapes.push(shape);
					});

					entity.add(shapes);
					return shapes;
				}

				// TODO: Still a bug in here somewhere around nested rotation of meshes.
				// The rotation needs to also be applied to the spheres which currently isn't done by `position.add(center.applyQuaternion(rotation));`
				if (entity.has(BoundingCapsuleShape)) {
					const shapes: Shape[] = [];

					applyToMeshesIndividually(entity, ({ geometry, position, rotation }) => {
						// console.log(`generating BoundingCylinder for ${mesh.name}`);

						// Calculate bounding box and offset world position
						geometry.computeBoundingBox();
						const box = geometry.boundingBox;
						const center = box.getCenter(new ThreeVector3());

						const axes = ['x', 'y', 'z'];
						const major = entity.get(BoundingCapsuleShape).axis;
						const minor = axes.splice(axes.indexOf(major), 1) && axes;

						let height = box.max[major] - box.min[major];
						const radius = 0.5 * Math.max(box.max[minor[0]] - box.min[minor[0]], box.max[minor[1]] - box.min[minor[1]]);

						// Needs investigation.
						position.add(center.applyQuaternion(rotation));
						rotation = rotation.multiplyQuaternions(
							rotation,
							new ThreeQuaternion().setFromEuler(
								new Euler(major == 'y' ? Math.PI / 2 : 0, major == 'x' ? Math.PI / 2 : 0, major == 'z' ? Math.PI / 2 : 0)
							)
						);

						if (entity.get(BoundingCapsuleShape).offsetRadius) {
							height = height - radius * 2;
						}

						const cylinderShape = new Cylinder(radius, radius, height, 12);
						body.addShape(
							cylinderShape,
							new Vec3(position.x, position.y, position.z),
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);
						shapes.push(cylinderShape);

						const topSphereShape = new Sphere(radius);
						const topSphereShapePos = new Vec3(position.x, position.y, position.z);
						topSphereShapePos[major] -= height / 2;
						body.addShape(
							topSphereShape,
							topSphereShapePos,
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);

						shapes.push(topSphereShape);

						const bottomSphereShape = new Sphere(radius);
						const bottomSphereShapePos = new Vec3(position.x, position.y, position.z);
						bottomSphereShapePos[major] += height / 2;
						body.addShape(
							bottomSphereShape,
							bottomSphereShapePos,
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);
						shapes.push(bottomSphereShape);
					});

					entity.add(shapes);
					return shapes;
				}

				if (entity.has(MeshShape)) {
					const shapes: ConvexPolyhedron[] = [];

					applyToMeshesIndividually(entity, ({ geometry, position, rotation }) => {
						// console.log(`generating MeshShape for ${mesh.name}`);

						const shape = generateConvexPolyhedron(geometry);

						body.addShape(
							shape,
							new Vec3(position.x, position.y, position.z),
							new CannonQuaternion(rotation.x, rotation.y, rotation.z, rotation.w)
						);
						shapes.push(shape);
					});

					entity.add(shapes);
					return shapes;
				}
			}
		}
	);

export const generateBoundingBox = (mesh: Mesh) => {
	const geometry = getGeometry(mesh);

	mesh.updateWorldMatrix(true, false);
	const position = new ThreeVector3();
	const scale = new ThreeVector3();
	const rotation = new ThreeQuaternion();
	mesh.matrixWorld.decompose(position, rotation, scale);

	// Calculate bounding box and offset world position
	geometry.computeBoundingBox();
	const center = geometry.boundingBox.getCenter(new ThreeVector3());
	const size = geometry.boundingBox.getSize(new ThreeVector3()).divideScalar(2);
	position.add(center.applyQuaternion(rotation));

	return { shape: new Box(new Vec3(size.x, size.y, size.z)), position };
};

export const generateConvexPolyhedron = (geometry: BufferGeometry) => {
	let vertices = [];
	let attribute = geometry.attributes.position;
	for (let i = 0; i < attribute.count; i++) {
		const v = new ThreeVector3();
		v.fromBufferAttribute(attribute, i);
		vertices.push(v);
	}

	const convexGeometry = new ConvexGeometry(vertices);

	vertices = [];
	attribute = convexGeometry.attributes.position;
	for (let i = 0; i < attribute.count; i++) {
		const v = new ThreeVector3();
		v.fromBufferAttribute(attribute, i);
		vertices.push(new Vec3(v.x, v.y, v.z));
	}

	const faces = [];
	attribute = convexGeometry.index;
	for (let i = 0; i < attribute.count; i++) {
		const v = new ThreeVector3();
		v.fromBufferAttribute(attribute, i);
		faces.push([v.x, v.y, v.z]);
	}

	return new ConvexPolyhedron({ vertices, faces });
};

export const getBody = (entity: Entity) => {
	return entity.get(CannonBody) || entity.get(CannonInstancedBody) || entity.get(Body);
};
