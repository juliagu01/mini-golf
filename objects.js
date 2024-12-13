import * as THREE from 'three';

// Table geometry with a single hole
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

// Box geometries, bounding boxes, and rounded box bounds
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

// Ramp geometries, bounding boxes, and rounded ramp bounds
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

export { createTableWithHole, createRampGeometry, createBoxBound, createRampBound };
