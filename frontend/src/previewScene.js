import * as THREE from "three";
import {OrbitControls, PointerLockControls} from "three-stdlib";
import {BlockWorld} from "./blockWorld.js";

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

function disposeObjectTree(root) {
    root.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (material.map) material.map.dispose();
                material.dispose();
            }
        }
    });
}

function clearGroupChildren(group) {
    if (!group) return;
    while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        disposeObjectTree(child);
    }
}

function createAnchorLabel(id, x, y, z) {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 72;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255,255,255,0.96)";
    context.strokeStyle = "rgba(54,145,91,0.72)";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(3, 3, canvas.width - 6, canvas.height - 6, 16);
    context.fill();
    context.stroke();
    context.font = "700 34px system-ui, sans-serif";
    context.fillStyle = "#247647";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(id), canvas.width / 2, canvas.height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.25, 0.1125, 1);
    sprite.position.set(x, y, z + 0.12);
    sprite.renderOrder = 20;
    return sprite;
}

function ensureXrPoseMarker() {
    if (!preview || preview.xrPoseMarker) return preview?.xrPoseMarker ?? null;

    const color = 0xf59e0b; // orange distinguishes XR tracking from green anchors and blue Crazyflie
    const marker = new THREE.Group();
    marker.name = "xr-head-pose-marker";
    marker.visible = false;

    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 18, 14),
        new THREE.MeshStandardMaterial({
            color,
            emissive: 0x5a3200,
            emissiveIntensity: 0.24,
            roughness: 0.42,
            metalness: 0.05
        })
    );
    marker.add(sphere);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.012, 7, 28),
        new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.9})
    );
    ring.position.z = -0.055;
    marker.add(ring);

    // The arrow points along the local -Z axis; the incoming quaternion rotates it.
    const heading = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0, 0),
        0.34,
        color,
        0.10,
        0.065
    );
    marker.add(heading);

    preview.blockWorld.world.add(marker);
    preview.xrPoseMarker = marker;
    return marker;
}

export function initAnchorPreview(store) {
    const container = document.getElementById("anchorPreviewCanvas");
    if (!container || preview) return;

    const {scene, camera, renderer, controls, resize} = createEmbeddedScene(container);
    const blockWorld = setupWorld(scene);

    const anchorMarkersGroup = new THREE.Group();
    anchorMarkersGroup.name = "anchor-markers";
    blockWorld.world.add(anchorMarkersGroup);

    preview = {
        scene,
        camera,
        renderer,
        controls,
        resize,
        blockWorld,
        anchorMarkersGroup,
        xrPoseMarker: null
    };

    store.setState(state => ({
        ...state,
        scene: {
            ...state.scene,
            blockWorld
        }
    }));

    animateEmbedded(renderer, scene, camera, controls);
}

export function renderAnchorPreview(anchors) {
    if (anchors === undefined || !preview) return;

    const {anchorMarkersGroup} = preview;
    clearGroupChildren(anchorMarkersGroup);

    const entries = Object.entries(anchors ?? {}).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (const [id, position] of entries) {
        const x = Number(position?.x);
        const y = Number(position?.y);
        const z = Number(position?.z);
        if (![x, y, z].every(Number.isFinite)) continue;

        const geometry = new THREE.BoxGeometry(0.125, 0.055, 0.02);
        const material = new THREE.MeshBasicMaterial({
            color: 0x35a765,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide
        });
        const anchor = new THREE.Mesh(geometry, material);
        anchor.position.set(x, y, z);
        anchor.name = `anchor-${id}`;
        anchorMarkersGroup.add(anchor);

        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({color: 0x26874e, linewidth: 2});
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        anchor.add(edges);

        const label = createAnchorLabel(id, x, y, z);
        if (label) anchorMarkersGroup.add(label);
    }
}

/** Update the orange XR headset marker with coordinates in the anchor/world frame. */
export function setXrHeadPose(position, rotation = null) {
    if (!preview || !position) return;

    const x = Number(position.x);
    const y = Number(position.y);
    const z = Number(position.z);
    if (![x, y, z].every(Number.isFinite)) return;

    const marker = ensureXrPoseMarker();
    if (!marker) return;

    marker.position.set(x, y, z);
    if (rotation && [rotation.x, rotation.y, rotation.z, rotation.w].every(value => Number.isFinite(Number(value)))) {
        marker.quaternion.set(
            Number(rotation.x),
            Number(rotation.y),
            Number(rotation.z),
            Number(rotation.w)
        ).normalize();
    } else {
        marker.quaternion.identity();
    }
    marker.visible = true;
}

export function setXrHeadPoseVisible(visible) {
    if (preview?.xrPoseMarker) {
        preview.xrPoseMarker.visible = Boolean(visible);
    }
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
    if (!state?.scene?.blockWorld) {
        console.warn("Cannot initialize the Crazyflie marker before the 3D preview.");
        return;
    }
    state.scene.liveBlock ??= [];
    state.scene.liveBlockLabels ??= [];
    state.scene.blockWorld.clearLiveBlocks(state);

    const labelOffset = 0.25; // height above drone in world Z

    for (let i = 0; i < 1; i++) {
        const color = new THREE.Color(0x3478f6);

        let droneObject;
        // const droneSize = 0.17;

        const liveBlockMaterial = new THREE.MeshStandardMaterial({color});
        droneObject = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.03),
            liveBlockMaterial
        );

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