import * as THREE from 'three';


const scene = new THREE.Scene();

//THREE.PerspectiveCamera( fov angle, aspect ratio, near depth, far depth );
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);


// Setting up the lights
const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(5, 5, 5);  // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);


// Change me!
const pastPosition = [0, 0, 2];
const testPosition = [0, 5, 0];
const boxSpecs = [
    { dims: [1.5, 1.5, 1.5], pos: [-1, 2.5, 0] },  // Left
    { dims: [1.5, 1.5, 1.5], pos: [0, 2, 0.5] },  // Center
];


// Custom ExtrudeGeometry for box bounds (not written by us!)
// Credit: https://discourse.threejs.org/t/round-edged-box/1402
function createRoundedBox(width, height, depth, radius0, smoothness) {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(width, height, eps, Math.PI / 2, 0, true);
    shape.absarc(width, eps, eps, 0, -Math.PI / 2, true);
    let geometry = new THREE.ExtrudeGeometry(shape, {
        amount: depth - radius0 * 2,
        bevelEnabled: true,
        bevelSegments: smoothness * 2,
        steps: 1,
        bevelSize: radius,
        bevelThickness: radius0,
        curveSegments: smoothness
    });
    geometry.center();
    return geometry;
}


// Creating balls
const pMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
const redMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

let pBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), pMaterial);  // Ball as it was in the previous frame
pBall.position.set(...pastPosition);
pBall.updateMatrixWorld();
scene.add(pBall);

let updatedBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);  // Ball to be bounced
updatedBall.position.set(...testPosition);
updatedBall.updateMatrixWorld();
scene.add(updatedBall);

let testBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);  // Ball as it would be without bounce
testBall.position.set(...testPosition);
testBall.updateMatrixWorld();
scene.add(testBall);


// Creating box objects (with associated bound objects!) based on specs array
let collisionObjs = [];
for (const spec of boxSpecs) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(...(spec.dims)), material);
    box.position.set(...(spec.pos));
    box.updateMatrixWorld();
    scene.add(box);

    const bound = new THREE.Mesh(createRoundedBox(...(spec.dims), 1, 1), material);
    bound.applyMatrix4(box.matrixWorld);

    collisionObjs.push({ box: box, bound: bound });
}


// Manual raytracing for box bound collision detection
// (.raycast() not implemented for BufferGeometries :()
const ray = new THREE.Ray(pBall.position).lookAt(testBall.position);
let closestIntersection = null;
for (const obj of collisionObjs) {
    const indices = obj.bound.geometry.getAttribute("position").array;
    for (let i = 0; i < indices.length; i += 9) {
        const vertices = [];
        vertices.push(new THREE.Vector3().fromArray(indices, i+0).add(obj.bound.position));
        vertices.push(new THREE.Vector3().fromArray(indices, i+3).add(obj.bound.position));
        vertices.push(new THREE.Vector3().fromArray(indices, i + 6).add(obj.bound.position));

        const intersection = new THREE.Vector3();
        if (ray.intersectTriangle(...vertices, true, intersection)) {
            const distance = intersection.distanceTo(pBall.position);
            if (closestIntersection === null || closestIntersection.distance > distance)
                closestIntersection = { distance: distance, vertices: vertices };
        }
    }
}


// Reflecting ball across collision surface on box bound if necessary
if (closestIntersection !== null) {
    testBall.material = redMaterial;
    const reflectionPlane = new THREE.Plane();
    reflectionPlane.setFromCoplanarPoints(...(closestIntersection.vertices));

    // Not great, but an offset to compensate for reflecting across non-affine plane
    const reflectionCompensation = reflectionPlane.normal.clone().setLength(-2 * reflectionPlane.constant);
    updatedBall.position.reflect(reflectionPlane.normal).add(reflectionCompensation);

    updatedBall.updateMatrixWorld();
}

renderer.render(scene, camera);
