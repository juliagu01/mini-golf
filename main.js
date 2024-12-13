import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

import { levelSpecs } from './data.json';
import { createTableWithHole, createRampGeometry, createBoxBound, createRampBound } from './objects.js';



const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0096ff);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; // Disable zooming
controls.autoRotate = false;


//sky
const sky = new Sky();
sky.scale.setScalar( 4500 );

const uniforms = sky.material.uniforms;
uniforms[ 'turbidity' ].value = 0.1;
uniforms[ 'rayleigh' ].value = 0.312;
uniforms[ 'mieCoefficient' ].value = 0.035;
uniforms[ 'mieDirectionalG' ].value = 0.754;

const phi = (90 * Math.PI/180) + 4 ;
const theta = 180 * Math.PI/180;
const sunPosition = new THREE.Vector3().setFromSphericalCoords( 100, phi, theta );

sky.material.uniforms.sunPosition.value = sunPosition;

scene.add( sky );

const pointLight = new THREE.PointLight(0xffffff, 1, 0, 2);
pointLight.position.set(10, 5, 5); // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
//scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight('rgb(255,255,255)', 2); // White light, intensity of 1
sunlight.position.copy(sunPosition); // X, Y, Z coordinates
sunlight.castShadow = true;
scene.add(sunlight);

const textureLoader = new THREE.TextureLoader();
const mapBall = textureLoader.load('textures/paper_0022_4k/ao.jpg');
const bmapBall = textureLoader.load('textures/paper_0022_4k/normal_direct.png');
const dmapBall = textureLoader.load('textures/paper_0022_4k/height.png');
const normalMapWood = textureLoader.load('textures/wood_0019_4k/color.jpg')
const bmapWood = textureLoader.load('textures/wood_0019_4k/normal_directx.png')
const dmapWood = textureLoader.load('textures/wood_0019_4k/height.png')

const ballMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: mapBall,
    bumpMap: bmapBall,
    bumpScale: 2,
    displacementMap: dmapBall,
    displacementScale: 5,
    displacementBias: -2.65
});
const ballRadius = 1;

const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 64, 32), ballMaterial);
ball.castShadow = true;
ball.position.y = 0;
ball.receiveShadow = true;
scene.add(ball);

sunlight.shadow.mapSize.width = 8192;
sunlight.shadow.mapSize.height = 8192;


sunlight.shadow.camera.top += 50;
sunlight.shadow.camera.bottom -= 50;
sunlight.shadow.camera.left -= 50;
sunlight.shadow.camera.right += 50;




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

const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 50 });
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x404040, shininess: 50 });
const edgeMaterial = new THREE.MeshPhongMaterial({
    shininess: 100, 
    bumpMap: bmapWood,
    bumpScale: 50,
    displacementMap: dmapWood,
    displacementScale: 0,
    map: normalMapWood
});
const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0xf0d0b0, shininess: 50 });


const ballIndicatorGeometry = new THREE.BufferGeometry();
ballIndicatorGeometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -20)]);
const ballIndicatorMaterial = new THREE.LineDashedMaterial({ color: 0x0000ff, dashSize: 1, gapSize: 0.5 });
const ballIndicator = new THREE.Line(ballIndicatorGeometry, ballIndicatorMaterial);
ballIndicator.computeLineDistances();
scene.add(ballIndicator);

let holeCenter = new THREE.Vector3(0, 0, 0);
const holeRadius = ballRadius + 0.5;
let holeBounds = [];

let table = new THREE.Mesh(createTableWithHole(0, 0, holeRadius), tableMaterial);
table.position.y = 0 - ballRadius;
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
powerBarMesh.position.set(uiCamera.right - 100, uiCamera.top - 30, -0.1); // Position slightly inside from the edge
// //Debug command to see if powerbar is created
// console.log(uiScene.children)

function onWindowResize(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();

    uiCamera.left = -window.innerWidth / 2;
    uiCamera.right = window.innerWidth / 2;
    uiCamera.top = window.innerHeight / 2;
    uiCamera.bottom = -window.innerHeight / 2;
    uiCamera.updateProjectionMatrix();

    for (const { mesh, x } of textMeshes)
        mesh.position.set(uiCamera.left + x, uiCamera.top - 35, -0.1);
    levelNumMesh.position.set(uiCamera.left + 75, uiCamera.top - 35, -0.1);
    maxLaunchCountMesh.position.set(uiCamera.left + 250, uiCamera.top - 35, -0.1);
    launchCountMesh.position.set(uiCamera.left + 400, uiCamera.top - 35, -0.1);
    extraCreditAmountMesh.position.set(uiCamera.left + 550, uiCamera.top - 35, -0.1);
    powerBarMesh.position.set(uiCamera.right - 100, uiCamera.top - 30, -0.1);
}

window.addEventListener('resize', onWindowResize);


// Create text geometry and material
// Credit: https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_text.html
const textMeshes = [];
let textSpecs = [
    { text: "Level", x: 25 },
    { text: "Max launches:", x: 125 },
    { text: "Launches:", x: 300 },
    { text: "Extra credit:", x: 450 },
];
const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
function createHubText() {
    for (const { text, x } of textSpecs) {
        const textGeometry = new TextGeometry(text, { font: hubFont, size: 12, depth: -1 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(uiCamera.left + x, uiCamera.top - 35, -0.1);
        textMeshes.push({ mesh: textMesh, x: x });
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
        const levelNumGeometry = new TextGeometry(level + "", { font: hubFont, size: 12, depth: -1 });
        levelNumMesh = new THREE.Mesh(levelNumGeometry, textMaterial);
        levelNumMesh.position.set(uiCamera.left + 75, uiCamera.top - 35, -0.1);
        uiScene.add(levelNumMesh);
    }
}


// Create max launch count geometry and material
let maxLaunchCountMesh = null;
function updateMaxLaunchCountText() {
    if (maxLaunchCountMesh)
        uiScene.remove(maxLaunchCountMesh);
    if (hubFont) {
        const maxLaunchCountGeometry = new TextGeometry(levelSpecs[level - 1].maxLaunches + "", { font: hubFont, size: 12, depth: -1 });
        maxLaunchCountMesh = new THREE.Mesh(maxLaunchCountGeometry, textMaterial);
        maxLaunchCountMesh.position.set(uiCamera.left + 250, uiCamera.top - 35, -0.1);
        uiScene.add(maxLaunchCountMesh);
    }
}

// Create launch count geometry and material
let launchCountMesh = null;
function updateLaunchCountText() {
    if (launchCountMesh)
        uiScene.remove(launchCountMesh);
    if (hubFont) {
        const launchCountGeometry = new TextGeometry(launchCount + "", { font: hubFont, size: 12, depth: -1 });
        launchCountMesh = new THREE.Mesh(launchCountGeometry, textMaterial);
        launchCountMesh.position.set(uiCamera.left + 400, uiCamera.top - 35, -0.1);
        uiScene.add(launchCountMesh);
    }
}

// Create launch count geometry and material
let extraCreditAmountMesh = null;
function updateExtraCreditAmountText() {
    if (extraCreditAmountMesh)
        uiScene.remove(extraCreditAmountMesh);
    if (hubFont) {
        const extraCreditAmountGeometry = new TextGeometry("+" + extraCreditAmount, { font: hubFont, size: 12, depth: -1 });
        extraCreditAmountMesh = new THREE.Mesh(extraCreditAmountGeometry, textMaterial);
        extraCreditAmountMesh.position.set(uiCamera.left + 550, uiCamera.top - 35, -0.1);
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
let level = 1;
let prepLaunch = true;
let launchCount = 0;
let extraCreditAmount = 0;
let boxBounds = [];
let rampBounds = [];


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

    restrictControls();
    loosenControls();
    prepLaunch = true;
}
function loadLevel() {
    resetLevel();
    const levelSpec = levelSpecs[level - 1];

    // Update table
    table.geometry = createTableWithHole(...(levelSpec.holePos), holeRadius)
    holeCenter = new THREE.Vector3(levelSpec.holePos[0], 0 - ballRadius, levelSpec.holePos[1]);
    const holeDepthCenter = holeCenter.clone().sub(upVector);
    holeBounds = [{
        object: { position: holeDepthCenter },
        simpleBound: new THREE.Box3().setFromCenterAndSize(holeDepthCenter, new THREE.Vector3(
            holeRadius + 0.001,
            1.5,
            holeRadius + 0.001
        ).multiplyScalar(2)),
        bound: new THREE.ExtrudeGeometry(table.geometry.parameters.shapes.holes[0], {
            depth: -3,
            bevelEnabled: true,
            bevelThickness: 0 - ballRadius,
            bevelSegments: 4
        }).rotateX(Math.PI / 2).center()
    }];

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
}
loadLevel();


// Camera control
function restrictControls() {
    controls.target.copy(ball.position);
    controls.minPolarAngle = Math.PI * 3 / 8;
    controls.maxPolarAngle = Math.PI * 3 / 8;
    controls.minAzimuthAngle = launchAngle;
    controls.maxAzimuthAngle = launchAngle;
    controls.minDistance = 25;
    controls.maxDistance = 25;
    controls.saveState();
    controls.reset();
    controls.enabled = false;
}

function loosenControls() {
    controls.enabled = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minAzimuthAngle = Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
}


// Function to apply a force to the ball
function applyForce(force) {
    ballVelocity.add(force);
}
  
  // Function to handle collisions with the floor
function checkFloorCollision() {
    const projectedHoleCenter = new THREE.Vector3(holeCenter.x, ball.position.y, holeCenter.z);
    if (ball.position.distanceTo(projectedHoleCenter) > holeRadius && ball.position.y <= 0) {
        ball.position.y = 0;
        ballVelocity.y *= -1 * bounceCoefficient; // Bounce with energy loss
    }
}

let power = 0;  // 0-1
// Launch iff space is pressed AND last launch has finished
window.addEventListener('keydown', (event) => {
    if (gameStarted) {
        if (event.code === 'KeyA' || event.code === 'KeyW' ||
            event.code === 'KeyD' || event.code === 'KeyS' ||
            event.code === 'ArrowUp' || event.code === 'ArrowDown') {
            const polarAngle = controls.getPolarAngle();
            const translation = new THREE.Vector3();
            camera.getWorldDirection(translation);
            if (event.code === 'KeyA')
                translation.set(translation.z, 0, -translation.x);
            if (event.code === 'KeyW')
                translation.setY(0);
            if (event.code === 'KeyD')
                translation.set(translation.z, 0, -translation.x).multiplyScalar(-1);
            if (event.code === 'KeyS')
                translation.setY(0).multiplyScalar(-1);
            if (event.code === 'ArrowUp')
                translation.set(0, 1, 0);
            if (event.code === 'ArrowDown' && camera.position.y > 1)
                translation.set(0, -1, 0);
            translation.normalize();
            controls.target.add(translation);
            camera.position.add(translation);
            controls.minPolarAngle = polarAngle;
            controls.maxPolarAngle = polarAngle;
            controls.saveState();
            controls.reset();
            loosenControls();
        }
        if (event.code === 'Space' && prepLaunch) {
            launchCount++;
            updateLaunchCountText();
            console.log(`launch ${launchCount} start`);
            // Calculate the direction vector from the launch angle
            const direction = forwardVector.clone();
            direction.applyAxisAngle(upVector, launchAngle);
            ballVelocity.addScaledVector(direction, power);
            ballIndicator.visible = false;

            restrictControls();
            prepLaunch = false;
        }
        if (event.code === 'ArrowLeft' && prepLaunch) {
            launchAngle += Math.PI / 60;
            ballIndicator.setRotationFromAxisAngle(upVector, launchAngle);
            restrictControls();
            loosenControls();
        }
        if (event.code === 'ArrowRight' && prepLaunch) {
            launchAngle -= Math.PI / 60;
            ballIndicator.setRotationFromAxisAngle(upVector, launchAngle);
            restrictControls();
            loosenControls();
        }
        if (event.code === 'KeyR')
            resetLevel();
        if (event.code === 'KeyP') {
            console.log(controls.target);
            console.log(camera.position);
        }
    }
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
   
    ballVelocity.y -= 0.02;  // gravity

    ballVelocity.multiplyScalar(0.98);  // friction

    // Update ball position based on velocity
    ball.position.add(ballVelocity);

    const adjustedVelocity = ballVelocity.clone();
    adjustedVelocity.y = 0;
    const linearVelocity = adjustedVelocity.length();
    const angularVelocity = linearVelocity / ballRadius;

    const axis = new THREE.Vector3(ballVelocity.z, 0, -ballVelocity.x).normalize();
    axis.normalize()
    ball.rotateOnAxis(axis, angularVelocity);

    // Manual raytracing for collision detection
    const ray = new THREE.Ray(pastPos).lookAt(ball.position);
    let closestIntersection = null;
    for (const { object, simpleBound, bound } of tableEdgeBounds.concat(boxBounds).concat(rampBounds).concat(holeBounds)) {
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

        // Update camera
        const flattenedVelocity = ballVelocity.clone();
        flattenedVelocity.y = 0;
        let cameraAngle = flattenedVelocity.angleTo(forwardVector);
        if (forwardVector.clone().cross(flattenedVelocity).dot(upVector) < 0)
            cameraAngle *= -1;
        controls.minAzimuthAngle = cameraAngle;
        controls.maxAzimuthAngle = cameraAngle;
    }

    // Check for floor collision
    checkFloorCollision();

    // Ball in hole logic
    if (ball.position.y <= -3) {
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
        ballIndicator.position.copy(ball.position);
        ballIndicator.visible = true;
        ballVelocity.set(0, 0, 0);

        restrictControls();
        loosenControls();
        prepLaunch = true;

        // If the max launch count is reached without reaching the goal, restart the level
        if (launchCount == levelSpecs[level - 1].maxLaunches) {
            console.log(`restart level ${level}`);
            resetLevel();
        }
    }

    // Render the game scene
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    if (!prepLaunch)
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
function startScreen(){
    

  // Add lighting and golf ball for start screen

    const fontLoader = new FontLoader();
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
    let startBall = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 64, 32), ballMaterial);
    startBall.castShadow = true;
    
    startBall.receiveShadow = true;
    scene.add(startBall);

    startBall.position.set(40.4, 42, 38.5);
    camera.position.set(40, 40, 60); // Set the camera position higher
    camera.lookAt(new THREE.Vector3(40, 40, 0)); // Focus on the center of the scene

    controls.enabled = false;

    fontLoader.load("fonts/helvetiker_regular.typeface.json", (font)=>{
        const textMaterials = new THREE.MeshStandardMaterial({color:0xf0f0f0});

        const topTextGeometry1 = new TextGeometry('Paper', {
            font: font,
            size: 2.3,
            depth: 3,
            curveSegments: 12,
        });
        const topTextGeometry2 = new TextGeometry('Chase', {
            font: font,
            size: 2.3,
            depth: 3,
            curveSegments: 12,
        });
      
        const topTextMesh1 = new THREE.Mesh(topTextGeometry1, textMaterials);
        topTextGeometry1.center(); // Center the text geometry
        topTextMesh1.position.set(40, 42, 37.5); // Position above the ball
        scene.add(topTextMesh1);
        topTextMesh1.castShadow = true;
        topTextMesh1.receiveShadow = true;

        const topTextMesh2 = new THREE.Mesh(topTextGeometry2, textMaterials);
        topTextGeometry2.center(); // Center the text geometry
        topTextMesh2.position.set(40, 39.25, 37.5); // Position above the ball
        scene.add(topTextMesh2);
        topTextMesh2.castShadow = true;
        topTextMesh2.receiveShadow = true;
      
         
        window.addEventListener('click', () => {
            scene.remove(startBall);
            scene.remove(topTextMesh1);
            scene.remove(topTextMesh2);
            const pulseText = document.getElementById('pulse-text');
            if (pulseText) {
            pulseText.style.display = 'none';
            }
        });
    // Start the animation loop for the start screen
        function animateStartScreen() {
            if (!gameStarted) {
                requestAnimationFrame(animateStartScreen);
                //startBall.rotation.x += 0.01; // Adjust speed as needed
                startBall.rotation.y += 0.01;
                renderer.render(scene, camera);
            }
    }

    animateStartScreen();
    })
}

let gameStarted = false;
document.addEventListener('click', function() {
    if (!gameStarted){
        gameStarted = true;
        camera.position.copy(new THREE.Vector3(0, 10, 20));
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        restrictControls();
        loosenControls();
        animate();
    }
})
startScreen();

