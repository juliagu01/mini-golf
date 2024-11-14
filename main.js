import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


const scene = new THREE.Scene();

//THREE.PerspectiveCamera( fov angle, aspect ratio, near depth, far depth );
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 5, 10);
controls.target.set(0, 5, 0);


// Setting up the lights
const pointLight = new THREE.PointLight(0xffffff, 100, 100);
pointLight.position.set(5, 5, 5); // Position the light
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0.5, .0, 1.0).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x505050);  // Soft white light
scene.add(ambientLight);


// Transformation matrices
function translationMatrix(tx, ty, tz) {
    return new THREE.Matrix4().set(
        1, 0, 0, tx,
        0, 1, 0, ty,
        0, 0, 1, tz,
        0, 0, 0, 1
    );
}
function rotationMatrixZ(theta) {
    return new THREE.Matrix4().set(
        Math.cos(theta), -Math.sin(theta), 0, 0,
        Math.sin(theta),  Math.cos(theta), 0, 0,
                      0,                0, 1, 0,
                      0,                0, 0, 1
    );
}
function rotationMatrixX(theta) {
    return new THREE.Matrix4().set(
        1,               0,                0, 0,
        0, Math.cos(theta), -Math.sin(theta), 0,
        0, Math.sin(theta),  Math.cos(theta), 0,
        0,               0,                0, 1
    );
}
function scalingMatrix(sx, sy, sz) {
    return new THREE.Matrix4().set(
        sx,  0,  0, 0,
         0, sy,  0, 0,
         0,  0, sz, 0,
         0,  0,  0, 1
    );
}

// Creating objects
const ball_geometry = new THREE.SphereGeometry(1, 16, 16);
const side_wall_geometry = new THREE.BoxGeometry(1, 800, 1200);
const non_side_wall_geometry = new THREE.BoxGeometry(800, 800, 1);
const side_edge_geometry = new THREE.BoxGeometry(2, 2, 64);
const non_side_edge_geometry = new THREE.BoxGeometry(34, 2, 2);

const table_points = [
    new THREE.Vector2(-16, -31),
    new THREE.Vector2(16, -31),
    new THREE.Vector2(16, 31),
    new THREE.Vector2(-16, 31)
];
const table_shape = new THREE.Shape();
table_shape.setFromPoints(table_points);
const hole_shape = new THREE.Shape();  // hole in table
hole_shape.absellipse(0, -10, 1.25, 1.25, 0, 2 * Math.PI);
table_shape.holes.push(hole_shape);
const extrudeSettings = {
    depth: 1,
    bevelEnabled: false
};
const table_geometry = new THREE.ExtrudeGeometry(table_shape, extrudeSettings);

const ball_material = new THREE.MeshPhongMaterial({ color: 0xb0b0b0 });
const table_material = new THREE.MeshPhongMaterial({color: 0x00ff00,shininess: 100});
const wall_material = new THREE.MeshPhongMaterial({ color: 0x404040, shininess: 100 });
const edge_material = new THREE.MeshPhongMaterial({ color: 0x806040, shininess: 100 });

let ball = new THREE.Mesh(ball_geometry, ball_material);
ball.matrixAutoUpdate = false;
scene.add(ball);

let table = new THREE.Mesh(table_geometry, table_material);
table.matrixAutoUpdate = false;
table.matrix.premultiply(rotationMatrixX(Math.PI/2));
table.matrix.premultiply(translationMatrix(0, -1.5, 0));
scene.add(table);

let left_edge = new THREE.Mesh(side_edge_geometry, edge_material);
left_edge.matrixAutoUpdate = false;
left_edge.matrix.premultiply(translationMatrix(-16, -0.5, 0));
scene.add(left_edge);

let right_edge = new THREE.Mesh(side_edge_geometry, edge_material);
right_edge.matrixAutoUpdate = false;
right_edge.matrix.premultiply(translationMatrix(16, -0.5, 0));
scene.add(right_edge);

let front_edge = new THREE.Mesh(non_side_edge_geometry, edge_material);
front_edge.matrixAutoUpdate = false;
front_edge.matrix.premultiply(translationMatrix(0, -0.5, 31));
scene.add(front_edge);

let back_edge = new THREE.Mesh(non_side_edge_geometry, edge_material);
back_edge.matrixAutoUpdate = false;
back_edge.matrix.premultiply(translationMatrix(0, -0.5, -31));
scene.add(back_edge);

let left_wall = new THREE.Mesh(side_wall_geometry, wall_material);
left_wall.matrixAutoUpdate = false;
left_wall.matrix.premultiply(translationMatrix(-400, 0, 0));
scene.add(left_wall);

let right_wall = new THREE.Mesh(side_wall_geometry, wall_material);
right_wall.matrixAutoUpdate = false;
right_wall.matrix.premultiply(translationMatrix(400, 0, 0));
scene.add(right_wall);

let back_wall = new THREE.Mesh(non_side_wall_geometry, wall_material);
back_wall.matrixAutoUpdate = false;
back_wall.matrix.premultiply(translationMatrix(0, 0, -600));
scene.add(back_wall);

let front_wall = new THREE.Mesh(non_side_wall_geometry, wall_material);
front_wall.matrixAutoUpdate = false;
front_wall.matrix.premultiply(translationMatrix(0, 0, 600));
scene.add(front_wall);

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
  let powerBar = 0;
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space'){
    isHitting = true;
    }
});
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      isHitting = false;
      // Calculate the direction vector from the camera to the ball
      const direction = new THREE.Vector3();
      direction.subVectors(ball.position, camera.position).normalize();
  
      ballVelocity.addScaledVector(direction, powerBar); 
      powerBar = 0;
    }
  });




let animation_time = 0;
let delta_animation_time;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    

    delta_animation_time = clock.getDelta();
    animation_time += delta_animation_time;

    let transformation = new THREE.Matrix4();
    ball.matrix = transformation.clone();
    if (isHitting) {
        powerBar += 0.1; // Adjust the power increase rate as needed
        powerBar = Math.min(powerBar, 10); // Cap the maximum power
    }
    ballVelocity.y -= 0.01;

    ballVelocity.multiplyScalar(0.99);

    // Update ball position based on velocity
    ball.position.add(ballVelocity);
  
    // Check for floor collision
    checkFloorCollision();
    
    controls.update();
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
