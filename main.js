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


// Creating objects
const p_material = new THREE.MeshPhongMaterial({ color: 0x808080 });
const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
const red_material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

let p_ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), p_material);  // Ball as it was in the previous frame
scene.add(p_ball);

let ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);  // Ball as it is in the current frame
ball1.matrixAutoUpdate = false;
ball1.translateX(3);
ball1.translateY(3);
ball1.translateZ(0);
ball1.updateMatrix();
ball1.updateMatrixWorld();
scene.add(ball1);

let ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);  // Ball as it is in an alternate current frame
ball2.matrixAutoUpdate = false;
ball2.translateX(1.1);
ball2.translateY(-2);
ball2.translateZ(2.5);
ball2.updateMatrix();
ball2.updateMatrixWorld();
scene.add(ball2);

const p_sphere = new THREE.Sphere();  // Spherical bound of p_ball
p_ball.geometry.computeBoundingSphere();
p_sphere.copy(p_ball.geometry.boundingSphere).applyMatrix4(p_ball.matrixWorld);

const sphere1 = new THREE.Sphere();  // Bound of ball1
ball1.geometry.computeBoundingSphere();
sphere1.copy(ball1.geometry.boundingSphere).applyMatrix4(ball1.matrixWorld);

const sphere2 = new THREE.Sphere();  // Bound of ball2
ball2.geometry.computeBoundingSphere();
sphere2.copy(ball2.geometry.boundingSphere).applyMatrix4(ball2.matrixWorld);

const box_specs = [
    { dims: { w: 1, h: 1, d: 1 }, pos: { x: 1, y: 1, z: 0 } },  // Upper left
    { dims: { w: 1, h: 1, d: 1 }, pos: { x: -1, y: 2, z: 0 } },  // Upper right
    { dims: { w: 1, h: 1, d: 1 }, pos: { x: -4, y: -1, z: 0 } },  // Lower left
    { dims: { w: 1, h: 1, d: 1 }, pos: { x: 0, y: -1.45, z: 0 } },  // Lower center
];

// Create box objects (with associated bound objects!) based on specs array
let collision_objs = [];
for (const spec of box_specs) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(spec.dims.w, spec.dims.h, spec.dims.d), material);
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

// Helper function for vertices of a Box3 object
function getBox3Segments(box3) {
    const max = box3.max;
    const min = box3.min;

    const vertices = [max,
        new THREE.Vector3(max.x, max.y, min.z),
        new THREE.Vector3(max.x, min.y, max.z),
        new THREE.Vector3(max.x, min.y, min.z),
        new THREE.Vector3(min.x, max.y, max.z),
        new THREE.Vector3(min.x, max.y, min.z),
        new THREE.Vector3(min.x, min.y, max.z),
        min];  // Organized as two "N" shapes

    return [
        { v0: vertices[0], v1: vertices[1] },
        { v0: vertices[0], v1: vertices[2] },
        { v0: vertices[0], v1: vertices[4] },
        { v0: vertices[3], v1: vertices[1] },
        { v0: vertices[3], v1: vertices[2] },
        { v0: vertices[3], v1: vertices[7] },
        { v0: vertices[5], v1: vertices[1] },
        { v0: vertices[5], v1: vertices[4] },
        { v0: vertices[5], v1: vertices[7] },
        { v0: vertices[6], v1: vertices[2] },
        { v0: vertices[6], v1: vertices[4] },
        { v0: vertices[6], v1: vertices[7] },
    ];  // Organized as spokes from four vertices
}

// Check if any part of the Box3 intersects with the volume in
// space that the sphere just moved through. The swept sphere 
// should resemble a tube with hemispheres at the ends.
// If intersection, there was a collision!
function box3IntersectsSweptSphere(p_sphere, sphere, box3) {
    if (box3.intersectsSphere(sphere))
        return true;

    const ray = new THREE.Ray(p_sphere.center);  // Axis-box intersection
    ray.lookAt(sphere.center);
    if (ray.intersectsBox(box3))
        return true;

    for (const segment of getBox3Segments(box3))  // Tube-edge intersection
        if (ray.distanceSqToSegment(segment.v0, segment.v1) < sphere.radius * sphere.radius)
            return true;

    return false;
}

for (const obj of collision_objs) {
    if (box3IntersectsSweptSphere(p_sphere, sphere1, obj.bound) ||
        box3IntersectsSweptSphere(p_sphere, sphere2, obj.bound))
        obj.box.material = red_material;
}

renderer.render(scene, camera);
