import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(5, 5, 5); // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; // Disable zooming
controls.enablePan = false; // Disable panning
controls.autoRotate = false;
controls.target.set(0, 0, 0);
controls.enabled = true;
controls.minDistance = 10;
controls.maxDistance = 50;


// Object modeling helper functions
function createTableWithHole(holeX, holeY) {
    const tableShape = new THREE.Shape();
    tableShape.setFromPoints([
        new THREE.Vector2(-16, -31),
        new THREE.Vector2(16, -31),
        new THREE.Vector2(16, 31),
        new THREE.Vector2(-16, 31)
    ]);

    const holeShape = new THREE.Shape();
    holeShape.absellipse(holeX, holeY, 1.25, 1.25, 0, 2 * Math.PI);
    tableShape.holes.push(holeShape);

    return new THREE.ExtrudeGeometry(tableShape, { depth: 1, bevelEnabled: false });
}

// Custom ExtrudeGeometry for box bounds
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

// Manage array of box bounds
let boxBounds = [];
function createBoxBound(box, ball) {
    const boundGeometry = createRoundedBox(
        box.geometry.parameters.width,
        box.geometry.parameters.height,
        box.geometry.parameters.depth,
        ball.geometry.parameters.radius,
        1
    );
    let bound = new THREE.Mesh(boundGeometry, ballMaterial);
    bound.position.copy(box.position);
    boxBounds.push(bound);
    scene.add(bound);
}


// Create objects
const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xb0b0b0 });
const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 100 });
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x404040, shininess: 100 });
const edgeMaterial = new THREE.MeshPhongMaterial({ color: 0x806040, shininess: 100 });

let ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), ballMaterial);
scene.add(ball);

let table = new THREE.Mesh(createTableWithHole(0, -10), tableMaterial);
table.position.y = -1;
table.rotateX(Math.PI/2);
scene.add(table);

let tableEdgeSpecs = [
    { dims: [2, 4, 64], pos: [-16, -0.5, 0] },  // Left
    { dims: [2, 4, 64], pos: [16, -0.5, 0] },  // Right
    { dims: [34, 4, 2], pos: [0, -0.5, 31] },  // Far
    { dims: [34, 4, 2], pos: [0, -0.5, -31] },  // Near
];
for (const spec of tableEdgeSpecs) {
    let edge = new THREE.Mesh(new THREE.BoxGeometry(...(spec.dims)), edgeMaterial);
    edge.position.set(...(spec.pos));
    scene.add(edge);
    createBoxBound(edge, ball);
}

let wallSpecs = [
    { dims: [1200, 800], pos: [-400, 0, 0], angle: Math.PI / 2 },  // Left
    { dims: [1200, 800], pos: [400, 0, 0], angle: Math.PI / -2 },  // Right
    { dims: [800, 800], pos: [0, 0, -600], angle: 0 },  // Far
    { dims: [800, 800], pos: [0, 0, 600], angle: Math.PI },  // Near
];
for (const spec of wallSpecs) {
    let wall = new THREE.Mesh(new THREE.PlaneGeometry(...(spec.dims)), wallMaterial);
    wall.rotateY(spec.angle);
    wall.position.set(...(spec.pos));
    scene.add(wall);
}
let floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 1200), wallMaterial);
floor.rotateX(Math.PI / -2);
floor.position.y = -400;
scene.add(floor);


// Create a separate scene and camera for UI elements, using an orthographic camera
const uiScene = new THREE.Scene();
const uiCamera = new THREE.OrthographicCamera(
    -window.innerWidth / 2, window.innerWidth / 2,
    window.innerHeight / 2, -window.innerHeight / 2,
    0.1, 10
);
// Create the power bar geometry and material
const powerBarGeometry = new THREE.PlaneGeometry(150, 20); // Width and height of the bar
const powerBarMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
const powerBarMesh = new THREE.Mesh(powerBarGeometry, powerBarMaterial);
uiScene.add(powerBarMesh);

// Position the power bar in the top-right corner
powerBarMesh.position.set(window.innerWidth / 2 - 100, window.innerHeight / 2 - 30, -0.1); // Position slightly inside from the edge
// //Debug command to see if powerbar is created
// console.log(uiScene.children)


// // Resize listener for responsive positioning
// window.addEventListener('resize', () => {
//     uiCamera.left = -window.innerWidth / 2;
//     uiCamera.right = window.innerWidth / 2;
//     uiCamera.top = window.innerHeight / 2;
//     uiCamera.bottom = -window.innerHeight / 2;
//     uiCamera.updateProjectionMatrix();
//     updatePowerBarPosition();
// });

//Physics Properties
const ballVelocity = new THREE.Vector3(0, 0, 0);

  // Function to apply a force to the ball
function applyForce(force) {
    ballVelocity.add(force);
  }
  
  // Function to handle collisions with the floor
function checkFloorCollision() {
    if (ball.position.y <= 0) {
      ball.position.y = 0;
      ballVelocity.y *= -0.8; // Bounce with energy loss
    }
  }

let isHitting = false;
let powerBar = 0;  //0-10
window.addEventListener('keydown', (event) => {
    console.log("space down");
    if (event.code === 'Space'){
    isHitting = true;
    }
});
window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      console.log("space up");
      isHitting = false;
      powerBar = 0;
      // Calculate the direction vector from the camera to the ball
      const direction = new THREE.Vector3();
      direction.subVectors(ball.position, camera.position).normalize();
  
      ballVelocity.addScaledVector(direction, 0.5); 
    }
  });


let animation_time = 0;
let delta_animation_time;
const clock = new THREE.Clock();

let pastPos = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    pastPos = ball.position;

    let elapsedTime = clock.getElapsedTime();

    delta_animation_time = clock.getDelta();
    animation_time += delta_animation_time;
    
    let period10 = elapsedTime % 10.0;
    let normalized_period = period10/10;
    if (isHitting) {
        powerBar =  (period10/10 < 5 ? normalized_period : (1-normalized_period))// Adjust the power increase rate as needed
        console.log(period10);
    
    //calculate color of gradient
        const red = Math.floor(255 * (1 - powerBar));
        const green = Math.floor(255 * powerBar);
        powerBarMaterial.color.set(`rgb(${red},${green},0)`);
    }

    ballVelocity.y -= 0.01;

    ballVelocity.multiplyScalar(0.99);

    // Update ball position based on velocity
    ball.position.add(ballVelocity);

    // Check for floor collision
    checkFloorCollision();

    /*
    // Manual raytracing for collision detection
    const ray = new THREE.Ray(pastPos).lookAt(ball.position);
    let closestIntersection = null;
    for (const bound of boxBounds) {
        const indices = bound.geometry.getAttribute("position").array;
        for (let i = 0; i < indices.length; i += 9) {
            const vertices = [];
            vertices.push(new THREE.Vector3().fromArray(indices, i + 0).add(bound.position));
            vertices.push(new THREE.Vector3().fromArray(indices, i + 3).add(bound.position));
            vertices.push(new THREE.Vector3().fromArray(indices, i + 6).add(bound.position));

            const intersection = new THREE.Vector3();
            if (ray.intersectTriangle(...vertices, true, intersection)) {
                const distance = intersection.distanceTo(pastPos);
                if (closestIntersection === null || closestIntersection.distance > distance)
                    closestIntersection = { distance: distance, vertices: vertices };
            }
        }
    }

    // Reflect ball out of collision surface if necessary
    if (closestIntersection !== null) {
        const reflectionPlane = new THREE.Plane();
        reflectionPlane.setFromCoplanarPoints(...(closestIntersection.vertices));

        // An offset to compensate for reflecting across non-affine plane
        const reflectionCompensation = reflectionPlane.normal.clone().setLength(-2 * reflectionPlane.constant);
        ball.position.reflect(reflectionPlane.normal).add(reflectionCompensation);
        ball.updateMatrixWorld();

        ballVelocity.reflect(reflectionPlane.normal);
    }
    */

    controls.target.copy(ball.position);
    controls.update();
    renderer.render(scene, camera);

    // Render the UI scene with its own orthographic camera
    renderer.autoClear = false;
    renderer.clearDepth(); // Clear depth buffer to prevent UI from being obscured by 3D scene
    renderer.render(uiScene, uiCamera);
}
animate();

