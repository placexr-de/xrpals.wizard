import * as THREE from 'three';

export class BlockWorld {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.blocks = new Map(); // key: "x,y,z", value: { mesh, timer }
    }

    _roundCoord(v, decimals = 6) {
        const f = Math.pow(10, decimals);
        return Math.round(v * f) / f;
    }

    _key(x, y, z) {
        return `${this._roundCoord(x)},${this._roundCoord(y)},${this._roundCoord(z)}`;
    }

    _materialKey(material) {
        return material.color.getHexString();
    }

    setBlock(x, y, z, size, material) {
        const key = this._key(x, y, z);
        if (this.blocks.has(key)) {
            return;
        }

        let mesh;

            const geometry = new THREE.BoxGeometry(0.125, 0.055, 0.02);
            const transparentMaterial = new THREE.MeshBasicMaterial({
                color: material.color || 0x00ff00,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });

            mesh = new THREE.Mesh(geometry, transparentMaterial);
            mesh.position.set(x, y, z); // + layerHeight / 2
            this.world.add(mesh);

            // Wireframe edges
            const edges = new THREE.EdgesGeometry(geometry);
            const edgeMaterial = new THREE.LineBasicMaterial({
                color: material.color || 0x00ff00,
                linewidth: 2
            });
            const wireframe = new THREE.LineSegments(edges, edgeMaterial);
            mesh.add(wireframe);
            mesh.userData.wireframe = wireframe;


        // Create coordinate label
            const coordLbl = new THREE.Vector3(x, y, z + 0.01);
            const label = this.createTextLabel(
                `${x}, ${y}, ${z}`,
                coordLbl,
                14,
                {depthTest: false, depthWrite: false, renderOrder: 999}
            );
            // this.world.add(label);


        const baseColor = mesh.material && mesh.material.color
            ? mesh.material.color.clone()
            : new THREE.Color(0xffffff);
        this.blocks.set(key, {
            mesh,
            timer: 0,
            is3D: true,
            baseColor,
            highlightCount: 0
        });
    }


    removeBlock(x, y, z) {
        const key = this._key(x, y, z);
        const block = this.blocks.get(key);
        if (block) {
            // Clean up wireframe if exists
            if (block.mesh.userData.wireframe) {
                block.mesh.remove(block.mesh.userData.wireframe);
                block.mesh.userData.wireframe.geometry.dispose();
                block.mesh.userData.wireframe.material.dispose();
            }
            // this.scene.remove(block.mesh);
            this.world.remove(block.mesh);
            this.blocks.delete(key);
        }
    }

    // Remove all blocks from the scene
    clearAll() {
        for (let [key, block] of this.blocks) {
            this.world.remove(block.mesh);
        }
        this.clearGroup(this.world);
        this.blocks.clear();
    }

    clearLiveBlocks(state) {
        if (state.scene.liveBlock === undefined) {
            return;
        }
        state.scene.liveBlock.forEach(block => this.world.remove(block));
        state.scene.liveBlockLabels.forEach((sprite) => {
            this.world.remove(sprite);
            if (sprite.material && sprite.material.map) sprite.material.map.dispose();
            if (sprite.material) sprite.material.dispose();
        });
        state.scene.liveBlock.length = 0
        state.scene.liveBlockLabels.length = 0
    }

    update() {
        for (let [key, block] of this.blocks) {
            block.timer = (block.timer + 0.01) % 4;
            const color = new THREE.Color(0x33b557).lerp(
                new THREE.Color(0x00bb00),
                Math.sin(block.timer * Math.PI / 2)
            );
            block.mesh.material.color.set(color);
        }
    }


    createTextLabel(text, position, fontSize = 28, options = {}) {
        const {depthTest = true, depthWrite = true, renderOrder = 0} = options;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = 512;
        canvas.height = 128;

        context.font = `${fontSize}px Arial`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest,
            depthWrite,
        });
        const sprite = new THREE.Sprite(material);
        sprite.renderOrder = renderOrder;

        const scale = 1;
        sprite.scale.set(2 * scale, 0.5 * scale, 1);
        sprite.position.set(position.x, position.y, position.z);

        return sprite;
    }

    clearGroup(group) {
        while (group.children.length > 0) {
            const child = group.children[0];

            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }

            if (child.material && child.material.map) {
                child.material.map.dispose();
            }

            group.remove(child);
        }
    }
}