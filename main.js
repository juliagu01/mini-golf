import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { levelSpecs } from './data.json';
import {ShadowMesh} from 'three/addons/objects/ShadowMesh.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0096ff);

const camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );



const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(10, 5, 5); // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight('rgb(255,255,255)', 3); // White light, intensity of 1
sunlight.position.set(10, 20, -1); // X, Y, Z coordinates
sunlight.castShadow = true;
scene.add(sunlight);

sunlight.shadow.mapSize.width = 8192;
sunlight.shadow.mapSize.height = 8192;


sunlight.shadow.camera.top += 50;
sunlight.shadow.camera.bottom -= 50;
sunlight.shadow.camera.left -= 50;
sunlight.shadow.camera.right += 50;


//const helper = new THREE.CameraHelper(sunlight.shadow.camera);
//scene.add(helper);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; // Disable zooming
controls.enablePan = false; // Disable panning
controls.autoRotate = false;
controls.target.set(0, 0, 0);
controls.enabled = true;
controls.minDistance = 10;
controls.maxDistance = 50;

const mapWidth = 17;
const mapHeight = 32;
const mapRenderer = new THREE.WebGLRenderer({ antialias: true });
mapRenderer.setSize(mapWidth * 10, mapHeight * 10);
const mapElem = mapRenderer.domElement;
mapElem.style.position = "absolute";
mapElem.style.left = `calc(100% - ${mapWidth * 10 + 20}px)`;
mapElem.style.top = `calc(100% - ${mapHeight * 10 + 20}px)`;
mapElem.style.opacity = "0.9";
document.body.appendChild(mapElem);

const mapCamera = new THREE.OrthographicCamera(0 - mapWidth, mapWidth, mapHeight, 0 - mapHeight);
mapCamera.position.set(0, 10, 0);
mapCamera.lookAt(0, 0, 0);

let hubFont = null;
const loader = new FontLoader();
loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
    hubFont = font;
    createHubText();
});


// Define materials
const textureLoader = new THREE.TextureLoader();
const normalMap1 = textureLoader.load('textures/golfball.jpg');
const normalMap2 = textureLoader.load('textures/wood_0019_color_4k.jpg')
const bmap = textureLoader.load('textures/wood_0019_normal_directx_4k.png')
const dmap = textureLoader.load('textures/wood_0019_height_4k.png')
const clearcoatMap = textureLoader.load('textures/Scratched_gold_01_1K_Normal.png')

const ballMaterial = new THREE.MeshPhysicalMaterial({
     color: 0xffffff,
     normalMap: normalMap1,
     clearcoatNormalMap: clearcoatMap,
     clearcoat: 1.0
     });
const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 100 });
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x404040, shininess: 100 });
const edgeMaterial = new THREE.MeshPhongMaterial({
    shininess: 100, 
    bumpMap:bmap,
    bumpScale: 50,
    displacementMap: dmap,
    displacementScale: 0,
    map: normalMap2, 
   
    
});
const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0xf0d0b0, shininess: 100 });


// Object modeling helper functions
function createTableWithHole(holeX, holeY, holeRadius) {
    const tableShape = new THREE.Shape();
    tableShape.setFromPoints([
        new THREE.Vector2(-16, -31),
        new THREE.Vector2(16, -31),
        new THREE.Vector2(16, 31),
        new THREE.Vector2(-16, 31)
    ]);

    const holeShape = new THREE.Shape();
    holeShape.absellipse(holeX, holeY, holeRadius, holeRadius, 0, 2 * Math.PI);
    tableShape.holes.push(holeShape);
    
    return new THREE.ExtrudeGeometry(tableShape, { depth: 1, bevelEnabled: false });
}


// Custom ExtrudeGeometry for ramps
function createRampGeometry(width, height, depth) {
    let shape = new THREE.Shape([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0, height),
        new THREE.Vector2(width, 0)
    ]);
    let geometry = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
    geometry.parameters.width = width;
    geometry.parameters.height = height;
    geometry.parameters.depth = depth;
    geometry.center();
    return geometry;
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

// Custom ExtrudeGeometry for ramp bounds
function createRoundedRamp(width, height, depth, radius0, smoothness) {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    let normalAngle = Math.PI / 2 - Math.atan2(height, width);
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height, eps, Math.PI, normalAngle, true);
    shape.absarc(width, eps, eps, normalAngle, -Math.PI / 2, true);
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

// Manage array of boxes and box bounds
let boxBounds = [];
function createBoxBound(box, ball, boundsArr) {
    const boxParams = box.geometry.parameters;
    const ballParams = ball.geometry.parameters;

    const simpleBound = new THREE.Box3().setFromCenterAndSize(box.position, new THREE.Vector3(
        boxParams.width + ballParams.radius * 2,
        boxParams.height + ballParams.radius * 2,
        boxParams.depth + ballParams.radius * 2
    ));

    const bound = createRoundedBox(
        boxParams.width,
        boxParams.height,
        boxParams.depth,
        ballParams.radius,
        1
    );

    boundsArr.push({ object: box, simpleBound: simpleBound, bound: bound });
}

// Manage array of ramps and ramp bounds
let rampBounds = [];
function createRampBound(ramp, ball, boundsArr) {
    const rampParams = ramp.geometry.parameters;
    const ballParams = ball.geometry.parameters;

    const simpleBound = new THREE.Box3().setFromCenterAndSize(ramp.position, new THREE.Vector3(
        rampParams.width + ballParams.radius * 2,
        rampParams.height + ballParams.radius * 2,
        rampParams.depth + ballParams.radius * 2
    ));

    const bound = createRoundedRamp(
        rampParams.width,
        rampParams.height,
        rampParams.depth,
        ballParams.radius,
        1
    );

    boundsArr.push({ object: ramp, simpleBound: simpleBound, bound: bound });
}


// Create objects

let level = 1;
const ballRadius = 1;

const ball = new THREE.Mesh(new THREE.SphereGeometry(0.8 * ballRadius, 64, 32), ballMaterial);
ball.castShadow = true;
ball.position.y = -0.1;
ball.receiveShadow = true;
scene.add(ball);

const ballIndicatorGeometry = new THREE.BufferGeometry();
ballIndicatorGeometry.setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -20)
]);
const ballIndicatorMaterial = new THREE.LineDashedMaterial({
    color: 0x0000ff,
    dashSize: 1,
    gapSize: 0.5
});
const ballIndicator = new THREE.Line(ballIndicatorGeometry, ballIndicatorMaterial);
ballIndicator.computeLineDistances();
scene.add(ballIndicator);

let holeCenter = new THREE.Vector3(0, 0, 0);
const holeRadius = 1.25;
let table = new THREE.Mesh(createTableWithHole(0, 0, holeRadius), tableMaterial);
table.position.y = -0.9 * ballRadius;
table.rotateX(Math.PI/2);
table.receiveShadow  = true;
scene.add(table);

let tableEdgeSpecs = [
    { dims: [2, 4, 64], pos: [-16, -0.5, 0] },  // Left
    { dims: [2, 4, 64], pos: [16, -0.5, 0] },  // Right
    { dims: [34, 4, 2], pos: [0, -0.5, 31] },  // Far
    { dims: [34, 4, 2], pos: [0, -0.5, -31] },  // Near
];
let tableEdgeBounds = [];
for (const { dims, pos } of tableEdgeSpecs) {
    let edge = new THREE.Mesh(new THREE.BoxGeometry(...dims), edgeMaterial);
    edge.castShadow = true;
    edge.receiveShadow = true;
    edge.position.set(...pos);
    scene.add(edge);
    createBoxBound(edge, ball, tableEdgeBounds);
}

let wallSpecs = [
    { dims: [1200, 800], pos: [-400, 0, 0], angle: Math.PI / 2 },  // Left
    { dims: [1200, 800], pos: [400, 0, 0], angle: Math.PI / -2 },  // Right
    { dims: [800, 800], pos: [0, 0, -600], angle: 0 },  // Far
    { dims: [800, 800], pos: [0, 0, 600], angle: Math.PI },  // Near
];
for (const { dims, pos, angle } of wallSpecs) {
    let wall = new THREE.Mesh(new THREE.PlaneGeometry(...dims), wallMaterial);
    wall.rotateY(angle);
    wall.position.set(...pos);
    //scene.add(wall);
}


// Create a separate scene and camera for UI elements, using an orthographic camera
const uiScene = new THREE.Scene();
const uiCamera = new THREE.OrthographicCamera(
    window.innerWidth / -2, window.innerWidth / 2,
    window.innerHeight / 2, window.innerHeight / -2,
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


// Create text geometry and material
// Credit: https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_text.html
let textSpecs = [
    { text: "Level", x: 25 },
    { text: "Max launches:", x: 125 },
    { text: "Launches:", x: 300 },
    { text: "Extra credit:", x: 450 },
];
const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
function createHubText() {
    for (const { text, x } of textSpecs) {
        const textGeometry = new TextGeometry(text, {
            font: hubFont,
            size: 12,
            depth: -1
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(window.innerWidth / -2 + x, window.innerHeight / 2 - 35, -0.1);
        uiScene.add(textMesh);
    }
    updateLevelNumText();
    updateMaxLaunchCountText();
    updateLaunchCountText();
    updateExtraCreditAmountText();
}


// Create level number geometry and material
let levelNumMesh = null;
function updateLevelNumText() {
    if (levelNumMesh)
        uiScene.remove(levelNumMesh);
    if (hubFont) {
        const levelNumGeometry = new TextGeometry(level + "", {
            font: hubFont,
            size: 12,
            depth: -1
        });
        levelNumMesh = new THREE.Mesh(levelNumGeometry, textMaterial);
        levelNumMesh.position.set(window.innerWidth / -2 + 75, window.innerHeight / 2 - 35, -0.1);
        uiScene.add(levelNumMesh);
    }
}


// Create max launch count geometry and material
let maxLaunchCountMesh = null;
function updateMaxLaunchCountText() {
    if (maxLaunchCountMesh)
        uiScene.remove(maxLaunchCountMesh);
    if (hubFont) {
        const maxLaunchCountGeometry = new TextGeometry(levelSpecs[level - 1].maxLaunches + "", {
            font: hubFont,
            size: 12,
            depth: -1
        });
        maxLaunchCountMesh = new THREE.Mesh(maxLaunchCountGeometry, textMaterial);
        maxLaunchCountMesh.position.set(window.innerWidth / -2 + 250, window.innerHeight / 2 - 35, -0.1);
        uiScene.add(maxLaunchCountMesh);
    }
}


// Create launch count geometry and material
let launchCountMesh = null;
function updateLaunchCountText() {
    if (launchCountMesh)
        uiScene.remove(launchCountMesh);
    if (hubFont) {
        const launchCountGeometry = new TextGeometry(launchCount + "", {
            font: hubFont,
            size: 12,
            depth: -1
        });
        launchCountMesh = new THREE.Mesh(launchCountGeometry, textMaterial);
        launchCountMesh.position.set(window.innerWidth / -2 + 400, window.innerHeight / 2 - 35, -0.1);
        uiScene.add(launchCountMesh);
    }
}


// Create launch count geometry and material
let extraCreditAmountMesh = null;
function updateExtraCreditAmountText() {
    if (extraCreditAmountMesh)
        uiScene.remove(extraCreditAmountMesh);
    if (hubFont) {
        const extraCreditAmountGeometry = new TextGeometry("+" + extraCreditAmount, {
            font: hubFont,
            size: 12,
            depth: -1
        });
        extraCreditAmountMesh = new THREE.Mesh(extraCreditAmountGeometry, textMaterial);
        extraCreditAmountMesh.position.set(window.innerWidth / -2 + 550, window.innerHeight / 2 - 35, -0.1);
        uiScene.add(extraCreditAmountMesh);
    }
}


// Physics properties
const ballVelocity = new THREE.Vector3(0, 0, 0);
let launchAngle = 0;
const bounceCoefficient = 0.8;

const forwardVector = new THREE.Vector3(0, 0, -1);  // for launch angle calculations
const upVector = new THREE.Vector3(0, 1, 0);


// Level properties
let prepLaunch = true;
let launchCount = 0;
let extraCreditAmount = 0;


// Restore states on level start and restart
function resetLevel() {
    ball.position.set(...(levelSpecs[level - 1].ballPos));
    ballVelocity.set(0, 0, 0);
    launchAngle = 0;
    ballIndicator.setRotationFromAxisAngle(upVector, launchAngle);
    ballIndicator.position.copy(ball.position);
    ballIndicator.visible = true;

    launchCount = 0;
    updateLaunchCountText();
}
function loadLevel() {
    resetLevel();
    const levelSpec = levelSpecs[level - 1];

    // Update table
    table.geometry = createTableWithHole(...(levelSpec.holePos), holeRadius)
    holeCenter = new THREE.Vector3(levelSpec.holePos[0], -1, levelSpec.holePos[1]);

    // Update boxes
    for (const { object } of boxBounds)
        scene.remove(object);
    boxBounds = [];
    for (const { dims, pos } of levelSpec.boxes) {
        let box = new THREE.Mesh(new THREE.BoxGeometry(...dims), obstacleMaterial);
        box.position.set(...pos);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        createBoxBound(box, ball, boxBounds);
    }

    // Update ramps
    for (const { object } of rampBounds)
        scene.remove(object);
    rampBounds = [];
    for (const { dims, pos } of levelSpec.ramps) {
        let ramp = new THREE.Mesh(createRampGeometry(...dims), obstacleMaterial);
        ramp.position.set(...pos);
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        scene.add(ramp);
        createRampBound(ramp, ball, rampBounds);
    }

    updateLevelNumText();
    updateMaxLaunchCountText();
    prepLaunch = true;
}
loadLevel();


// Function to apply a force to the ball
function applyForce(force) {
    ballVelocity.add(force);
}
  
  // Function to handle collisions with the floor
function checkFloorCollision() {
    if (ball.position.y <= -.1 * ballRadius) {
        ball.position.y = -.1 * ballRadius;
        ballVelocity.y *= -1 * bounceCoefficient; // Bounce with energy loss
    }
}

let power = 0;  // 0-1
// Launch iff space is pressed AND last launch has finished
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && prepLaunch) {
        launchCount++;
        updateLaunchCountText();
        console.log(`launch ${launchCount} start`);
        // Calculate the direction vector from the launch angle
        const direction = forwardVector.clone();
        direction.applyAxisAngle(upVector, launchAngle);
        ballVelocity.addScaledVector(direction, power);
        ballIndicator.visible = false;
        prepLaunch = false;
    }
    if (event.code === 'ArrowLeft' && prepLaunch) {
        launchAngle += 0.1;
        ballIndicator.setRotationFromAxisAngle(upVector, launchAngle);
    }
    if (event.code === 'ArrowRight' && prepLaunch) {
        launchAngle -= 0.1;
        ballIndicator.setRotationFromAxisAngle(upVector, launchAngle);
    }
    if (event.code === 'KeyR')
        resetLevel();
    if (event.code === 'KeyP')
        console.log(ball.scale);
});



const clock = new THREE.Clock();
let pastPos = new THREE.Vector3();
function animate() {
    requestAnimationFrame(animate);

    pastPos = ball.position.clone();

    // Update power bar if waiting to be launched
    if (prepLaunch) {
        power = (Math.sin(clock.getElapsedTime()) + 1) / 2;
        const red = Math.floor(255 * (1 - power));
        const green = Math.floor(255 * power);
        powerBarMaterial.color.set(`rgb(${red},${green},0)`);

        ballIndicator.position.copy(ball.position);
    }

    // Update ball velocity
    ballVelocity.y -= 0.01;  // gravity
    ballVelocity.multiplyScalar(0.95);  // friction

    // Update ball position based on velocity
    ball.position.add(ballVelocity);

    const linearVelocity = ballVelocity.length()
    const angularVelocity = linearVelocity / ballRadius;

    const axis = new THREE.Vector3(ballVelocity.z, 0, -ballVelocity.x).normalize();
    ball.rotateOnWorldAxis(axis, angularVelocity);

    // Manual raytracing for collision detection
    const ray = new THREE.Ray(pastPos).lookAt(ball.position);
    let closestIntersection = null;
    for (const { object, simpleBound, bound } of tableEdgeBounds.concat(boxBounds).concat(rampBounds)) {
        // Check intersection with simple bound
        const simpleOverlap = simpleBound.containsPoint(pastPos);
        const simpleIntersection = new THREE.Vector3();
        ray.intersectBox(simpleBound, simpleIntersection);
        if (simpleOverlap || simpleIntersection?.distanceTo(pastPos) < ballVelocity.length()) {
            // Check intersection with bound
            const indices = bound.getAttribute("position").array;
            for (let i = 0; i < indices.length; i += 9) {
                const vertices = [];
                vertices.push(new THREE.Vector3().fromArray(indices, i + 0).add(object.position));
                vertices.push(new THREE.Vector3().fromArray(indices, i + 3).add(object.position));
                vertices.push(new THREE.Vector3().fromArray(indices, i + 6).add(object.position));

                const intersection = new THREE.Vector3();
                if (ray.intersectTriangle(...vertices, true, intersection)) {
                    const distance = intersection.distanceTo(pastPos);
                    if (distance < ballVelocity.length() && (closestIntersection === null || closestIntersection.distance > distance))
                        closestIntersection = { distance: distance, vertices: vertices, position: intersection };
                }
            }
        }
    }

    // Reflect ball out of collision surface if necessary
    if (closestIntersection !== null) {
        console.log("collision");
        const reflectionPlane = new THREE.Plane();
        reflectionPlane.setFromCoplanarPoints(...(closestIntersection.vertices));

        // An offset to compensate for reflecting across non-affine plane
        const reflectionCompensation = reflectionPlane.normal.clone().setLength(-2 * reflectionPlane.constant);
        const idealPosition = ball.position.clone().reflect(reflectionPlane.normal).add(reflectionCompensation);

        // Apply energy-loss bounce
        const reducedPosition = closestIntersection.position.clone().lerp(idealPosition, bounceCoefficient);
        ball.position.copy(reducedPosition);
        ball.updateMatrixWorld();
        ballVelocity.reflect(reflectionPlane.normal).multiplyScalar(bounceCoefficient);
    }

    // Check for floor collision
    checkFloorCollision();

    // Ball in hole logic
    if (ball.position.distanceTo(holeCenter) <= holeRadius) {
        console.log(`level ${level} complete`);
        ballVelocity.set(0, 0, 0);
        // If launches remain, add as extra credit
        extraCreditAmount += (levelSpecs[level - 1].maxLaunches - launchCount);
        updateExtraCreditAmountText();
        // Increment level and load new level
        if (level < levelSpecs.length) {
            level++;
            loadLevel();
        }
        // If no more levels, end the game
        else {
            ball.visible = false;
            ballIndicator.visible = false;
            console.log("all levels complete");
            return;
        }
    }

    // Determine end of launch (note to self: should check that acceleration is 0 too!!)
    if (!prepLaunch && ballVelocity.length() < 0.03) {
        console.log(`launch ${launchCount} end`);
        ballVelocity.y = 0;
        launchAngle = ballVelocity.angleTo(forwardVector);
        if (forwardVector.clone().cross(ballVelocity).dot(upVector) < 0)
            launchAngle *= -1;
        ballIndicator.setRotationFromAxisAngle(upVector, launchAngle);
        ballIndicator.visible = true;
        ballVelocity.set(0, 0, 0);
        prepLaunch = true;

        // If the max launch count is reached without reaching the goal, restart the level
        if (launchCount == levelSpecs[level - 1].maxLaunches) {
            console.log(`restart level ${level}`);
            resetLevel();
        }
    }

    // Render the game scene
    controls.target.copy(ball.position);
    controls.update();
    renderer.render(scene, camera);

    // Render the UI scene with its own orthographic camera
    renderer.autoClear = false;
    renderer.clearDepth(); // Clear depth buffer to prevent UI from being obscured by 3D scene
    renderer.render(uiScene, uiCamera);

    // Render the map scene with its own orthographic camera
    mapRenderer.render(scene, mapCamera);
}
animate();

