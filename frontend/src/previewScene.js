import * as THREE from "three";
import {OrbitControls} from "three-stdlib";
import {BlockWorld} from "./blockWorld.js";
import {store} from "./store.js";

export function setupWorld(scene) {
    const world = new THREE.Group();
    scene.add(world);
    world.rotation.order = 'XYZ';
    world.rotation.x = -Math.PI / 2;
    return new BlockWorld(scene, world)
}

export function createEmbeddedScene(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const origin = new THREE.Vector3(0, 0.02, 0);
    const axisLength = 1.6;
    const headLength = 0.2;
    const headWidth  = 0.1;

    const xArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1),
        origin,
        axisLength,
        0x00ff00,
        headLength,
        headWidth
    );

    const zArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0), // up
        origin,
        axisLength,
        0x0000ff,
        headLength,
        headWidth
    );

    const yArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        origin,
        axisLength,
        0xff0000,
        headLength,
        headWidth
    );

    scene.add(xArrow);
    scene.add(zArrow);
    scene.add(yArrow);
    scene.add(new THREE.GridHelper(10,10));

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(4, 6, 8);
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(8, 10, 8);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const grid = new THREE.GridHelper(10, 10, 0xb8c7f0, 0xd7e0f7);
    scene.add(grid);

    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    window.addEventListener("resize", resize);

    return {scene, camera, renderer, controls, resize};
}

export function animateEmbedded(renderer, scene, camera, controls) {
    function tick() {
        requestAnimationFrame(tick);
        controls.update();
        renderer.render(scene, camera);
    }

    tick();
}

export const grassMaterial = new THREE.MeshStandardMaterial({color: 0x00ff00});

const mouse = new THREE.Vector2();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
export const move = {forward: false, backward: false, left: false, right: false, up: false, down: false};
const speed = 5; // units per second
let prevTime = performance.now();

export function animate(state, renderer, controls, camera) {
    requestAnimationFrame(() => animate(state, renderer, controls, camera)); //!start

    const time = performance.now();
    const delta = (time - prevTime) / 1000; // in seconds

    // Movement
    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize(); // diagonal movement

    velocity.x = direction.x * speed * delta;
    velocity.z = direction.z * speed * delta;

    // Vertical movement (Q = up, E = down)
    const verticalSpeed = speed * delta;
    if (move.up) {
        controls.getObject().position.y += verticalSpeed;
    }
    if (move.down) {
        controls.getObject().position.y -= verticalSpeed;
    }

    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);

    // Update blocks (change colors over time)
    state.scene.blockWorld.update();

    renderer.render(state.scene.blockWorld.scene, camera);//!end
    prevTime = time;
}

export function createScene() {


    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // sky blue
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(4, 4, 12); // pull camera back
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Basic light setup
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Start on click
    document.body.addEventListener('click', () => {
        controls.lock();
    });

    // Controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());

    return {scene, camera, renderer, controls};
}

let preview = null;

export function initAnchorPreview(store) {
    const container = document.getElementById("anchorPreviewCanvas");
    if (!container || preview) return;

    const {scene, camera, renderer, controls} = createEmbeddedScene(container);
    const blockWorld = setupWorld(scene);

    store.setState(state => ({
        ...state,
        scene: {
            ...state.scene,
            blockWorld: blockWorld
        }
    }));
    preview = {scene, camera, renderer, controls, blockWorld};

    animateEmbedded(renderer, scene, camera, controls);
}

export function renderAnchorPreview(anchors) {
    if (anchors === undefined) {
        return;
    }
    if (!preview) return;

    const {blockWorld} = preview;
    blockWorld.clearAll();

    Object.entries(anchors).forEach(([id, pos]) => {
        blockWorld.setBlock(
            pos.x,
            pos.y,
            pos.z,
            0.18,            // block size not used
            grassMaterial
        );
    });
}

const droneEmaPos = [];

export function updateLiveAgentPosition([x, y, z], liveBlockIndex = 0, state, options = {}) {
    const {
        alpha = 0.4,          // smoothing factor (0..1).
    } = options;

    if (!state.scene.liveBlock || state.scene.liveBlock.length <= liveBlockIndex) {
        console.warn(`liveBlock index ${liveBlockIndex} invalid, current length: ${state.scene.liveBlock ? state.scene.liveBlock.length : 0}`);
        return;
    }

    const droneObject = state.scene.liveBlock[liveBlockIndex];
    if (!droneObject) {
        console.warn(`liveBlock[${liveBlockIndex}] does not exist`);
        return;
    }

    const labelOffset = 0.25;
    const zPosRaw = (z !== undefined) ? z : 1.0;

    let ema = droneEmaPos[liveBlockIndex];

    if (!ema) {
        ema = droneEmaPos[liveBlockIndex] = {x, y, z: zPosRaw};
    } else {
        const smooth = (prev, target) => {
            const next = prev + alpha * (target - prev);

            // prevent overshoot
            if ((target - prev) > 0) {
                return Math.min(next, target);
            } else {
                return Math.max(next, target);
            }
        };

        ema.x = smooth(ema.x, x);
        ema.y = smooth(ema.y, y);
        ema.z = smooth(ema.z, zPosRaw);
    }

    const sx = ema.x;
    const sy = ema.y;
    const sz = ema.z;

    // droneObject.position.set(sx, sy, sz);
    droneObject.position.set(x, y, zPosRaw);


    if (state.scene.liveBlockLabels[liveBlockIndex]) {
        state.scene.liveBlockLabels[liveBlockIndex].position.set(sx, sy, sz + labelOffset);
    }
}

export function initLiveBlock(state) {

    state.scene.blockWorld.clearLiveBlocks(state)

    const labelOffset = 0.25; // height above drone in world Z

    for (let i = 0; i < 1; i++) {
        const color = new THREE.Color().setHSL((0.6 + i * 0.1) % 1.0, 1.0, 0.5);

        let droneObject;
        // const droneSize = 0.17;

        const liveBlockMaterial = new THREE.MeshStandardMaterial({color});
        droneObject = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.03),
            liveBlockMaterial
        );

        // Example placement: offset each block in x-direction
        droneObject.position.set(0, 0, 1.5);

        state.scene.blockWorld.world.add(droneObject);
        state.scene.liveBlock.push(droneObject);

        const cfId = `tracker`;
        const labelPos = new THREE.Vector3(0, 0, 1.5 + labelOffset);
        const label = state.scene.blockWorld.createTextLabel(cfId, labelPos, 16, {
            depthTest: false,
            depthWrite: false,
            renderOrder: 999
        });
        state.scene.blockWorld.world.add(label);
        state.scene.liveBlockLabels.push(label);
    }
}