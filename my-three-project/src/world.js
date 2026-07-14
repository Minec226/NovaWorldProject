import * as THREE from "three";

export class World {
    constructor(scene) {
        this.scene = scene;

        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x4caf50,
            side: THREE.DoubleSide
        });

        this.plane = new THREE.Mesh(geometry, material);
        this.plane.rotation.x = -Math.PI / 2;

        this.scene.add(this.plane);

        this.rocks = [];
        
        for (let i = 0; i < 100; i++) {

        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                Math.random() + 0.2
            ),
            new THREE.MeshStandardMaterial({
                color: 0x888888
            })
        );

        rock.position.set(
            (Math.random() - 0.5) * 90,
            0.4,
            (Math.random() - 0.5) * 90
        );

        this.scene.add(rock);

        this.rocks.push(rock);
        }
    }

    update() {
    for (const rock of this.rocks) {
        rock.rotation.y += 0.01;
    }
    }
}