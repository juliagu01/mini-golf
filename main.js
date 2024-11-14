import * as THREE from 'three';


const scene = new THREE.Scene();

//THREE.PerspectiveCamera( fov angle, aspect ratio, near depth, far depth );
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, 10);


// Setting up the lights
const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(5, 5, 5);  // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);


// Creating objects
const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
const red_material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

let ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), material);
scene.add(ball);

const sphere = new THREE.Sphere();
ball.geometry.computeBoundingSphere();
sphere.copy(ball.geometry.boundingSphere).applyMatrix4(ball.matrixWorld);

const box_specs = [
    { dims: [1, 1, 1], pos: { x: 1, y: 1, z: 0 } },
    { dims: [1, 1, 1], pos: { x: -1, y: 2, z: 0 } },
    { dims: [1, 1, 1], pos: { x: -4, y: -1, z: 0 } },
    { dims: [1, 1, 1], pos: { x: 0, y: -1.45, z: 0 } },
];

let collision_objs = [];
for (const spec of box_specs) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(...spec.dims), material);
    box.matrixAutoUpdate = false;
    box.translateX(spec.pos.x);
    box.translateY(spec.pos.y);
    box.translateZ(spec.pos.z);
    box.updateMatrix();
    box.updateMatrixWorld();
    scene.add(box);

    const bound = new THREE.Box3();
    box.geometry.computeBoundingBox();
    bound.copy(box.geometry.boundingBox).applyMatrix4(box.matrixWorld);

    collision_objs.push({ box: box, bound: bound });
}

for (const obj of collision_objs) {
    if (obj.bound.intersectsSphere(sphere))
        obj.box.material = red_material;
}

renderer.render(scene, camera);
