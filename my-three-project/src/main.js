import * as THREE from "three";
import { Terminal } from "./terminal.js"; // Ensure the filename matches
import { World } from "./world.js"
import RAPIER from "@dimforge/rapier3d";


// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5;
camera.rotation.order = "YXZ";

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);



// Loaders & Objects
const textureLoader = new THREE.TextureLoader();
const world = new World(scene);

const physicsWorld = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0
});

console.log(physicsWorld);

const groundBody = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
);

physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(50, 0.1, 50),
    groundBody
);

const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
        color: 0xff0000
    })
);

cube.position.set(0, 5, 0);

scene.add(cube);

const cubeBody = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0)
);

physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5),
    cubeBody
);



// Lights
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Stars
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 2000;
const starPositions = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 500; 
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    sizeAttenuation: true
});
const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// Mouse Look
let yaw = 0;
let pitch = 0;
const sensitivity = 0.002;
const maxPitch = Math.PI / 2 - 0.01;

// Only request pointer lock if the terminal isn't open
renderer.domElement.addEventListener("click", () => {
    if (!interfaceTerminal.isVisible) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return;

    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
});

// Keyboard & Movement
const keys = {};
document.addEventListener("keydown", (e) => (keys[e.code] = true));
document.addEventListener("keyup", (e) => (keys[e.code] = false));

const speed = 0.05;
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

// Initialize the Terminal Object
const interfaceTerminal = new Terminal(camera, scene);

// Animate Loop
function animate() {
    requestAnimationFrame(animate);

    physicsWorld.step();
    const pos = cubeBody.translation();

    cube.position.set(
        pos.x,
        pos.y,
        pos.z
    );

    const rot = cubeBody.rotation();

    cube.quaternion.set(
        rot.x,
        rot.y,
        rot.z,
        rot.w
    );

    // Movement Logic
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up).normalize();

    if (keys.KeyW) camera.position.addScaledVector(forward, speed);
    if (keys.KeyS) camera.position.addScaledVector(forward, -speed);
    if (keys.KeyA) camera.position.addScaledVector(right, -speed);
    if (keys.KeyD) camera.position.addScaledVector(right, speed);
    if (keys.Space) camera.position.y += speed;
    if (keys.ShiftLeft || keys.ShiftRight) camera.position.y -= speed;

    // Cleaned up: No longer passing a boolean down
    interfaceTerminal.update();

    renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});