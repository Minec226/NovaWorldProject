import * as THREE from "three";

export class Terminal {
    constructor(camera, scene) {
        this.camera = camera;
        
        // State variables
        this.scanOffset = 0;
        this.glowTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFPSTime = performance.now();
        this.previousPosition = camera.position.clone();
        this.playerSpeed = 0;
        this.compass = new THREE.Vector3();
        
        // Interface Navigation State
        this.isVisible = false; 
        this.currentMenu = "MAIN"; // Options: "MAIN", "TASKS", "SETTINGS"

        // Raycasting utilities for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Canvas Setup
        this.terminalCanvas = document.createElement("canvas");
        this.terminalCanvas.width = 1024;
        this.terminalCanvas.height = 512;
        this.terminalCtx = this.terminalCanvas.getContext("2d");
        this.terminalTexture = new THREE.CanvasTexture(this.terminalCanvas);

        // Material & Mesh
        this.terminalMaterial = new THREE.MeshBasicMaterial({
            map: this.terminalTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.terminalGeometry = new THREE.PlaneGeometry(2.2, 1.1);
        this.terminalMesh = new THREE.Mesh(this.terminalGeometry, this.terminalMaterial);
        this.terminalMesh.position.set(0, 0, -2);

        // Attach to camera
        camera.add(this.terminalMesh);
        scene.add(camera);

        this.terminalMesh.visible = this.isVisible;

        // Listen for the slash key to toggle visibility
        window.addEventListener("keydown", (event) => {
            if (event.key === "/") {
                this.isVisible = !this.isVisible;
                
                // Reset to main menu when closed
                if (!this.isVisible) {
                    this.currentMenu = "MAIN";
                }
                
                // Drop pointer lock immediately if the terminal was just opened
                if (this.isVisible && document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        });

        // Handle clicks on the 3D terminal canvas
        window.addEventListener("click", (event) => {
            if (!this.isVisible) return;

            // Normalize mouse coordinates (-1 to +1)
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Raycast against the terminal mesh
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.terminalMesh);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                if (intersect.uv) {
                    // Map UV coordinates (0 to 1) directly to Canvas pixel space
                    const canvasX = intersect.uv.x * this.terminalCanvas.width;
                    const canvasY = (1 - intersect.uv.y) * this.terminalCanvas.height;
                    
                    this.handleInterfaceClick(canvasX, canvasY);
                }
            }
        });
    }

    // Process coordinates to determine button hits
    handleInterfaceClick(x, y) {
        if (this.currentMenu === "MAIN") {
            // Tasks Button bounds (X: 40-200, Y: 380-425)
            if (x >= 40 && x <= 200 && y >= 380 && y <= 425) {
                this.currentMenu = "TASKS";
            }
            // Settings Button bounds (X: 220-380, Y: 380-425)
            else if (x >= 220 && x <= 380 && y >= 380 && y <= 425) {
                this.currentMenu = "SETTINGS";
            }
        } else {
            // Back Button bounds (same position as the main action button)
            if (x >= 40 && x <= 200 && y >= 380 && y <= 425) {
                this.currentMenu = "MAIN";
            }
        }
    }

    getDirectionText() {
        this.camera.getWorldDirection(this.compass);
        const angle = Math.atan2(this.compass.x, this.compass.z);
        const deg = (angle * 180 / Math.PI + 360) % 360;

        if (deg < 22.5 || deg >= 337.5) return "North";
        if (deg < 67.5) return "North-East";
        if (deg < 112.5) return "East";
        if (deg < 157.5) return "South-East";
        if (deg < 202.5) return "South";
        if (deg < 247.5) return "South-West";
        if (deg < 292.5) return "West";
        return "North-West";
    }

    update() {
        this.terminalMesh.visible = this.isVisible;

        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFPSTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSTime = now;
        }

        this.playerSpeed = this.camera.position.distanceTo(this.previousPosition) * 60;
        this.previousPosition.copy(this.camera.position);

        if (this.terminalMesh.visible) {
            this.draw();
        }
    }

    draw() {
        this.glowTime += 0.04;
        this.scanOffset += 4;

        if (this.scanOffset > this.terminalCanvas.height) {
            this.scanOffset = 0;
        }

        const ctx = this.terminalCtx;
        ctx.clearRect(0, 0, this.terminalCanvas.width, this.terminalCanvas.height);

        // Pulsing background
        const pulse = 0.18 + Math.sin(this.glowTime) * 0.07;
        ctx.fillStyle = `rgba(0,60,120,${pulse})`;
        ctx.fillRect(0, 0, this.terminalCanvas.width, this.terminalCanvas.height);

        // Cyan Glow Borders
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#00ffff";
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, this.terminalCanvas.width - 20, this.terminalCanvas.height - 20);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#55ffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(22, 22, this.terminalCanvas.width - 44, this.terminalCanvas.height - 44);

        // Scan Lines
        ctx.strokeStyle = "rgba(0,255,255,0.08)";
        ctx.lineWidth = 2;
        for (let y = -40; y < this.terminalCanvas.height + 40; y += 22) {
            ctx.beginPath();
            ctx.moveTo(0, y + this.scanOffset);
            ctx.lineTo(this.terminalCanvas.width, y + this.scanOffset);
            ctx.stroke();
        }

        // Moving Scanner
        ctx.fillStyle = "rgba(0,255,255,0.18)";
        ctx.fillRect(0, this.scanOffset - 8, this.terminalCanvas.width, 14);

        // --- RENDER MENUS DEPENDING ON STATE ---
        ctx.fillStyle = "#77ffff";
        ctx.lineWidth = 2;

        if (this.currentMenu === "MAIN") {
            // Main Text Interface
            ctx.font = "40px monospace";
            ctx.fillText("SYSTEM INTERFACE", 40, 65);

            ctx.font = "24px monospace";
            ctx.fillText("> Neural Link : ONLINE", 40, 125);
            ctx.fillText("> Camera      : ACTIVE", 40, 160);
            ctx.fillText(`> FPS         : ${this.fps}`, 40, 215);
            ctx.fillText(`> Speed       : ${this.playerSpeed.toFixed(2)}`, 40, 250);
            ctx.fillText(`> Facing      : ${this.getDirectionText()}`, 40, 285);
            ctx.fillText("> Test", 40, 340);

            // Action Buttons
            ctx.strokeStyle = "#00ffff";
            ctx.fillStyle = "rgba(0,255,255,0.15)";
            
            // Tasks Button
            ctx.strokeRect(40, 380, 160, 45);
            ctx.fillRect(40, 380, 160, 45);
            
            // Settings Button
            ctx.strokeRect(220, 380, 160, 45);
            ctx.fillRect(220, 380, 160, 45);

            // Button Labels
            ctx.fillStyle = "#ffffff";
            ctx.font = "20px monospace";
            ctx.fillText("[ TASKS ]", 65, 410);
            ctx.fillText("[ SETTINGS ]", 230, 410);

        } else if (this.currentMenu === "TASKS") {
            // Tasks Header
            ctx.font = "40px monospace";
            ctx.fillText("SYSTEM TASKS", 40, 65);

            ctx.font = "24px monospace";
            ctx.fillText("> No active core diagnostics assigned.", 40, 140);

            // Back Button 
            ctx.strokeStyle = "#00ffff";
            ctx.fillStyle = "rgba(0,255,255,0.15)";
            ctx.strokeRect(40, 380, 160, 45);
            ctx.fillRect(40, 380, 160, 45);

            ctx.fillStyle = "#ffffff";
            ctx.font = "20px monospace";
            ctx.fillText("[ BACK ]", 80, 410);

        } else if (this.currentMenu === "SETTINGS") {
            // Settings Header
            ctx.font = "40px monospace";
            ctx.fillText("SYSTEM SETTINGS", 40, 65);

            ctx.font = "24px monospace";
            ctx.fillText("> Subsystem configuration array empty.", 40, 140);

            // Back Button
            ctx.strokeStyle = "#00ffff";
            ctx.fillStyle = "rgba(0,255,255,0.15)";
            ctx.strokeRect(40, 380, 160, 45);
            ctx.fillRect(40, 380, 160, 45);

            ctx.fillStyle = "#ffffff";
            ctx.font = "20px monospace";
            ctx.fillText("[ BACK ]", 80, 410);
        }

        this.terminalTexture.needsUpdate = true;
    }
}