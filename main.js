import * as THREE from 'three';


const scene = new THREE.Scene();

//THREE.PerspectiveCamera( fov angle, aspect ratio, near depth, far depth );
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 16, 0);
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
const ballRadius = 0.5;
const pastPosition = new THREE.Vector3(-9, 0, 10);
const velocity = new THREE.Vector3(4, 0, -4);
const boxSpecs = [
    { dims: [1.5, 1.5, 1.5], pos: [-1, 2.5, 0] },  // Left
    { dims: [1.5, 1.5, 1.5], pos: [0, 0, 0] },  // Center
];


// Custom ExtrudeGeometry for box bounds (not written by us)
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
        depth: depth,
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
const basicMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

let pBall = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16), pMaterial);  // Ball as it was in the previous frame
pBall.position.copy(pastPosition);
scene.add(pBall);

let updatedBall = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16), material);  // Ball to be bounced
updatedBall.position.copy(pastPosition);
updatedBall.position.add(velocity);
scene.add(updatedBall);

let testBall = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16), material);  // Ball as it would be without bounce
testBall.position.copy(pastPosition);
testBall.position.add(velocity);
scene.add(testBall);


// Creating box objects (with associated bound objects) based on specs array
let collisionObjs = [];
for (const spec of boxSpecs) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(...(spec.dims)), material);
    box.position.set(...(spec.pos));
    scene.add(box);

    const bound = new THREE.Mesh(createRoundedBox(...(spec.dims), ballRadius, 1), basicMaterial);
    bound.applyMatrix4(box.matrixWorld);

    collisionObjs.push({ box: box, bound: bound });
}


// Original velocity
let pVelocityPoints = [pBall.position, testBall.position];
const pVelocityLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const pVelocityLineGeometry = new THREE.BufferGeometry().setFromPoints(pVelocityPoints);
const pVelocityLine = new THREE.Line(pVelocityLineGeometry, pVelocityLineMaterial);
scene.add(pVelocityLine);

// Trajectory
let trajectoryPoints = [pBall.position, pBall.position, pBall.position];
const trajectoryLineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
const trajectoryLineGeometry = new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
const trajectoryLine = new THREE.Line(trajectoryLineGeometry, trajectoryLineMaterial);
scene.add(trajectoryLine);

// New velocity
let velocityPoints = [updatedBall.position, updatedBall.position];
const velocityLineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const velocityLineGeometry = new THREE.BufferGeometry().setFromPoints(velocityPoints);
const velocityLine = new THREE.Line(velocityLineGeometry, velocityLineMaterial);
scene.add(velocityLine);


function animate() {
    setTimeout(function () {
        requestAnimationFrame(animate);
    }, 1000 / 2);

    // Manual raytracing for box bound collision detection
    // (.raycast() not implemented for BufferGeometries :()
    const ray = new THREE.Ray(pBall.position).lookAt(testBall.position);
    let closestIntersection = null;
    for (const obj of collisionObjs) {
        const indices = obj.bound.geometry.getAttribute("position").array;
        for (let i = 0; i < indices.length; i += 9) {
            const vertices = [];
            vertices.push(new THREE.Vector3().fromArray(indices, i + 0).add(obj.bound.position));
            vertices.push(new THREE.Vector3().fromArray(indices, i + 3).add(obj.bound.position));
            vertices.push(new THREE.Vector3().fromArray(indices, i + 6).add(obj.bound.position));

            const intersection = new THREE.Vector3();
            if (ray.intersectTriangle(...vertices, true, intersection)) {
                const distance = intersection.distanceTo(pBall.position);
                if (distance < velocity.length() && (closestIntersection === null || closestIntersection.distance > distance))
                    closestIntersection = { distance: distance, point: intersection, vertices: vertices };
            }
        }
    }

    // Original velocity
    pVelocityPoints = [pBall.position, testBall.position];
    pVelocityLine.geometry.copy(new THREE.BufferGeometry().setFromPoints(pVelocityPoints));

    // Trajectory
    trajectoryPoints = [pBall.position, pBall.position, pBall.position];
    trajectoryLine.geometry.copy(new THREE.BufferGeometry().setFromPoints(trajectoryPoints));

    // New velocity
    const futurePosition = updatedBall.position.clone();
    futurePosition.add(velocity);
    velocityPoints = [updatedBall.position, futurePosition];
    velocityLine.geometry.copy(new THREE.BufferGeometry().setFromPoints(velocityPoints));
    testBall.material = material;

    // Reflecting ball across collision surface on box bound if necessary
    if (closestIntersection !== null) {
        testBall.material = redMaterial;

        const reflectionPlane = new THREE.Plane();
        reflectionPlane.setFromCoplanarPoints(...(closestIntersection.vertices));

        // Not great, but an offset to compensate for reflecting across non-affine plane
        const reflectionCompensation = reflectionPlane.normal.clone().setLength(-2 * reflectionPlane.constant);
        updatedBall.position.reflect(reflectionPlane.normal).add(reflectionCompensation);

        velocity.reflect(reflectionPlane.normal);

        // Trajectory
        trajectoryPoints = [pBall.position, closestIntersection.point, updatedBall.position];
        trajectoryLine.geometry.copy(new THREE.BufferGeometry().setFromPoints(trajectoryPoints));

        // New velocity
        const futurePosition = updatedBall.position.clone();
        futurePosition.add(velocity);
        velocityPoints = [updatedBall.position, futurePosition];
        velocityLine.geometry.copy(new THREE.BufferGeometry().setFromPoints(velocityPoints));
    }

    renderer.render(scene, camera);

    pBall.position.copy(updatedBall.position);
    testBall.position.copy(pBall.position);
    testBall.position.add(velocity);
    updatedBall.position.copy(pBall.position);
    updatedBall.position.add(velocity);
}

animate();
