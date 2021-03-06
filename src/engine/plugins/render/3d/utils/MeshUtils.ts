import {
	Mesh,
	BufferGeometry,
	InstancedMesh,
	Group,
	MeshPhongMaterial,
	Color as ThreeColor,
	InstancedBufferAttribute,
	InstancedBufferGeometry,
	MeshBasicMaterial,
	Material,
	Box3,
	Vector3 as ThreeVector3
} from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';
import Random from '@ecs/plugins/math/Random';
import { ToVector3 } from '@ecs/plugins/tools/Conversions';

const dummyColor = new ThreeColor();

export const generateInstancedMesh = (mesh: Mesh | Group, count = 50, colorPalette?: number[]) => {
	if (mesh instanceof Group) {
		mesh = getGroupMesh(mesh);
	}

	const instancedMesh = new InstancedMesh(getGeometry(mesh.geometry), mesh.material, count);

	if (colorPalette && colorPalette.length > 0) {
		// Override the material otherwise colors dont come out well. Maybe this could be improved.
		instancedMesh.material = new MeshPhongMaterial({
			flatShading: true,
			reflectivity: 0,
			specular: 0,
			wireframe: false,
			vertexColors: true
		});
		const colors = new Float32Array(count * 3);

		instancedMeshForEach(instancedMesh, i => {
			dummyColor.setHex(Random.fromArray(colorPalette));
			dummyColor.toArray(colors, i * 3);
		});

		(instancedMesh.geometry as InstancedBufferGeometry).setAttribute('color', new InstancedBufferAttribute(colors, 3));
		(instancedMesh.material as MeshBasicMaterial).vertexColors = true;
	}

	return instancedMesh;
};

export const instancedMeshForEach = (mesh: InstancedMesh, each: (i: number) => void) => {
	for (let i = 0; i < mesh.count; i++) {
		each(i);
	}
};

export const getGeometry = (mesh: Mesh | BufferGeometry) => {
	if (!mesh) return null;

	if (mesh instanceof BufferGeometry) {
		return mesh;
	}

	if (!mesh.geometry) return null;

	if (mesh.geometry instanceof BufferGeometry) {
		return mesh.geometry;
	}

	return null;
};

export const getGroupMesh = (group: Group) => {
	const geometries = [];
	const materials = [];

	group.traverse((child: Mesh) => {
		if (child.isMesh) {
			geometries.push(getGeometry(child));
			materials.push(child.material);
		}
	});

	const bufferedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);

	return new Mesh(
		bufferedGeometry,
		new MeshPhongMaterial({
			color: 0xff0000
		})
	);
};

export const flattenGroup = (group: Group) => {
	const meshes = [];

	group.traverse((child: Mesh) => {
		if (child.isMesh) {
			meshes.push(child);
		}
	});

	return meshes;
};

export const getMeshByMaterialName = (group: Group, name: string): Mesh => {
	let mesh: Mesh = null;

	group.traverse((child: Mesh) => {
		if (child.material) {
			if (Array.isArray(child.material)) {
				if (child.material.map(m => m.name).includes(name)) mesh = child;
			}

			if ((child.material as Material).name.includes(name)) mesh = child;
		}
	});

	return mesh;
};

export const getBounds = (mesh: Mesh) => {
	const box3 = new Box3();
	box3.setFromObject(mesh);

	// Get bounds size
	const size = new ThreeVector3();
	box3.getSize(size);

	return ToVector3(size);
};
