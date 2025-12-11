class ThreeJSVisualizer {
    constructor(containerId) {
        console.log("Visualizer: Initializing...");
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("Visualizer: Container not found!");
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.objects = new Map();
        this.selectedObject = null;
        this.interactionMode = 'view';
        this.gridVisible = true;
        this.labelsVisible = true;
        this.wallsVisible = true;
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // 1. Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0e0e0); // Darker grey to make objects pop

        // 2. Setup Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            5000 
        );
        this.camera.position.set(50, 60, 50); // Moved up and out for better view
        this.camera.lookAt(0, 0, 0);
        
        // 3. Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // 4. Setup Controls (with Error Check)
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
        } else {
            console.error("Visualizer: THREE.OrbitControls is missing. Check script imports.");
        }
        
        // 5. Add Lighting
        this.addLighting();
        
        // 6. Add Helpers (Grid)
        // Made grid darker and less transparent so you can definitely see it
        this.gridHelper = new THREE.GridHelper(200, 40, 0x000000, 0x555555);
        this.scene.add(this.gridHelper);
        
        this.axesHelper = new THREE.AxesHelper(20);
        this.scene.add(this.axesHelper);
        
        // 7. Raycaster for clicking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 8. Labels
        this.labelContainer = document.createElement('div');
        this.labelContainer.style.position = 'absolute';
        this.labelContainer.style.top = '0';
        this.labelContainer.style.left = '0';
        this.labelContainer.style.pointerEvents = 'none';
        this.container.appendChild(this.labelContainer);
        
        // 9. Initial Default Walls
        this.createDefaultWalls();
        this.onWindowResize();
        
        console.log("Visualizer: Initialization Complete");
    }
    
    createDefaultWalls() {
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.5, // INCREASED OPACITY (was 0.1)
            side: THREE.DoubleSide
        });
        
        const floorGeometry = new THREE.PlaneGeometry(200, 200);
        const floor = new THREE.Mesh(floorGeometry, wallMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        floor.userData = { type: 'floor', name: 'Floor' };
        this.scene.add(floor);
        
        this.wallMeshes = [];
        const wallThickness = 1.0; // Thicker walls
        const size = 100;
        
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 20, wallThickness), wallMaterial);
        backWall.position.set(0, 10, -size);
        this.wallMeshes.push(backWall);
        
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 20, wallThickness), wallMaterial);
        frontWall.position.set(0, 10, size);
        this.wallMeshes.push(frontWall);
        
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 20, size * 2), wallMaterial);
        leftWall.position.set(-size, 10, 0);
        this.wallMeshes.push(leftWall);
        
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 20, size * 2), wallMaterial);
        rightWall.position.set(size, 10, 0);
        this.wallMeshes.push(rightWall);
        
        this.wallMeshes.forEach(wall => {
            wall.visible = this.wallsVisible;
            this.scene.add(wall);
        });
    }
    
    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        this.scene.add(mainLight);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        
        // Simple Interaction Mode Handling
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (this.interactionMode === 'delete') {
                this.deleteObject(object);
            } else {
                this.selectObject(object);
            }
        } else {
            this.deselectObject();
        }
    }
    
    selectObject(object) {
        if (this.selectedObject) {
            if(this.selectedObject.material && this.selectedObject.material.emissive) {
                this.selectedObject.material.emissive.setHex(this.selectedObject.userData.originalEmissive);
            }
        }
        
        let selectableObject = object;
        // Find the parent Group if clicked on a child mesh
        while (selectableObject && !selectableObject.userData.id && selectableObject.parent) {
            selectableObject = selectableObject.parent;
        }
        
        if (selectableObject && selectableObject.userData.id) {
            this.selectedObject = selectableObject;
            
            // Highlight logic
            selectableObject.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (child.userData.originalEmissive === undefined) {
                        child.userData.originalEmissive = child.material.emissive ? child.material.emissive.getHex() : 0x000000;
                    }
                    if(child.material.emissive) child.material.emissive.setHex(0xff5252);
                }
            });
            
            if (window.warehouseApp) {
                window.warehouseApp.updateSelectedInfo(selectableObject.userData);
            }
        }
    }
    
    deselectObject() {
        if (this.selectedObject) {
            this.selectedObject.traverse((child) => {
                if (child.isMesh && child.material && child.material.emissive) {
                    child.material.emissive.setHex(child.userData.originalEmissive || 0x000000);
                }
            });
            this.selectedObject = null;
            
            if (window.warehouseApp) {
                window.warehouseApp.updateSelectedInfo(null);
            }
        }
    }
    
    deleteObject(object) {
        let deletableObject = object;
        while (deletableObject && !deletableObject.userData.id && deletableObject.parent) {
            deletableObject = deletableObject.parent;
        }
        
        if (deletableObject && deletableObject.userData.id) {
            this.scene.remove(deletableObject);
            this.objects.delete(deletableObject.userData.id);
            
            const label = document.getElementById(`label-${deletableObject.userData.id}`);
            if (label) label.remove();
            
            if (window.warehouseApp) {
                window.warehouseApp.showNotification(`${deletableObject.userData.name} deleted`, 'success');
            }
        }
    }
    
    renderWarehouse(layout) {
        console.log("Visualizer: Rendering Warehouse Layout...", layout);
        this.clearWarehouse();
        
        // 1. Create Floor
        if(layout.warehouse_dimensions) {
            this.createWarehouseFloor(layout.warehouse_dimensions);
        }
        
        // 2. Create Blocks
        if (layout.blocks) {
            layout.blocks.forEach(block => {
                this.createBlock(block);
            });
        }
        
        this.updateLabels();
        this.fitCameraToScene(); 
    }
    
    fitCameraToScene() {
        // Simple default view reset if no objects
        if (this.objects.size === 0) {
            this.resetView();
            return;
        }
        // Just reset view to a good angle for now to ensure visibility
        this.camera.position.set(50, 60, 80);
        this.camera.lookAt(0,0,0);
        if(this.controls) this.controls.target.set(0,0,0);
    }
    
    createWarehouseFloor(dimensions) {
        const width = this.convertToMeters(dimensions.width, dimensions.unit);
        const length = this.convertToMeters(dimensions.length, dimensions.unit);
        
        console.log(`Visualizer: Creating Floor ${width}m x ${length}m`);

        // Remove old floor/grid
        const oldFloor = this.scene.getObjectByName('Warehouse Floor');
        if(oldFloor) this.scene.remove(oldFloor);

        const floorGeometry = new THREE.PlaneGeometry(width, length);
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x78909c,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.name = 'Warehouse Floor';
        floor.userData = { type: 'warehouse-floor' };
        this.scene.add(floor);
        
        // Update Grid
        const gridSize = Math.max(200, Math.max(width, length) * 2);
        this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(gridSize, 50, 0x000000, 0x555555);
        this.scene.add(this.gridHelper);
    }
    
    createBlock(blockData) {
        const { position, dimensions, color, name, racks } = blockData;
        
        const blockContainer = new THREE.Group();
        // Backend sends Y=0, we want it sitting on floor
        blockContainer.position.set(position.x, dimensions.height/2, position.z);
        
        const blockId = blockData.id;
        blockContainer.userData = {
            id: blockId,
            type: 'block',
            name: name,
            dimensions: dimensions
        };
        
        const colorHex = parseInt(color.replace('#', ''), 16);
        
        // Wireframe
        const blockGeometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length);
        const blockEdges = new THREE.EdgesGeometry(blockGeometry);
        const blockMaterial = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        const blockWireframe = new THREE.LineSegments(blockEdges, blockMaterial);
        blockContainer.add(blockWireframe);
        
        // Transparent Fill
        const fillMaterial = new THREE.MeshLambertMaterial({ color: colorHex, transparent: true, opacity: 0.2 });
        const blockFill = new THREE.Mesh(blockGeometry, fillMaterial);
        blockContainer.add(blockFill);
        
        this.createLabel(blockId, name, {
            x: position.x,
            y: dimensions.height + 2,
            z: position.z
        });
        
        if (racks && racks.length > 0) {
            racks.forEach(rack => {
                this.createRack(rack, blockContainer);
            });
        }
        
        this.scene.add(blockContainer);
        this.objects.set(blockId, blockContainer);
    }
    
    createRack(rackData, parentBlock) {
        // rackData.position is relative to block center in calculation? 
        // Let's assume absolute or relative logic from Python. 
        // Based on Python code: x_pos is offset from center. So it is relative.
        const { position, dimensions, floor, row, column, pallet } = rackData;
        
        const rackContainer = new THREE.Group();
        // Note: Python Y position was calculated for the shelf. 
        // But for container we position at rack center relative to block
        
        // Python position output: {'x': x_pos, 'y': y_pos, 'z': z_pos}
        // y_pos in Python is height of specific floor. 
        // We want the rack mesh to be at specific location.
        
        rackContainer.position.set(position.x, position.y - (parentBlock.userData.dimensions.height/2), position.z);
        
        const rackId = rackData.id;
        const rackName = `Rack F${floor}`;
        
        const rackGeometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length);
        const rackMaterial = new THREE.MeshLambertMaterial({ color: 0x2c5282 });
        const rackMesh = new THREE.Mesh(rackGeometry, rackMaterial);
        
        rackContainer.add(rackMesh);

        if (pallet) {
            this.createPallet(pallet, rackContainer);
        }
        
        parentBlock.add(rackContainer);
    }
    
    createPallet(palletData, parentRack) {
        const pDims = palletData.dimensions;
        const color = parseInt(palletData.color.replace('#', ''), 16);
        const geo = new THREE.BoxGeometry(pDims.width, pDims.height, pDims.length);
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        // Put on top of rack shelf
        mesh.position.y = 0.1; 
        parentRack.add(mesh);
    }
    
    createLabel(objectId, text, position) {
        if (!this.labelsVisible) return;
        
        const existingLabel = document.getElementById(`label-${objectId}`);
        if (existingLabel) existingLabel.remove();
        
        const label = document.createElement('div');
        label.id = `label-${objectId}`;
        label.className = 'object-label';
        label.textContent = text;
        label.style.cssText = `
            position: absolute;
            background: white;
            padding: 2px 5px;
            font-size: 10px;
            border: 1px solid black;
            pointer-events: none;
            display: none; /* Hidden by default until position update */
        `;
        
        this.labelContainer.appendChild(label);
    }
    
    updateLabelPosition(label, position) {
        // Project world position to screen coords
        const vector = new THREE.Vector3(position.x, position.y, position.z);
        
        // Standard projection
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-(vector.y * 0.5 + 0.5)) * this.container.clientHeight;
        
        if (vector.z < 1) { // Only show if in front of camera
            label.style.left = `${x}px`;
            label.style.top = `${y}px`;
            label.style.display = 'block';
        } else {
            label.style.display = 'none';
        }
    }
    
    updateLabels() {
        this.objects.forEach((object, id) => {
            const label = document.getElementById(`label-${id}`);
            if (label) {
                const pos = new THREE.Vector3();
                object.getWorldPosition(pos);
                pos.y += object.userData.dimensions.height / 2 + 1; // Move label above object
                this.updateLabelPosition(label, pos);
            }
        });
    }
    
    convertToMeters(value, unit) {
        const conversions = { 'cm': 0.01, 'm': 1, 'km': 1000, 'in': 0.0254, 'ft': 0.3048 };
        return value * (conversions[unit] || 1);
    }
    
    clearWarehouse() {
        this.objects.forEach((obj, id) => {
            this.scene.remove(obj);
            const label = document.getElementById(`label-${id}`);
            if (label) label.remove();
        });
        this.objects.clear();
        this.deselectObject();
    }
    
    clearScene() {
        this.clearWarehouse();
        this.createDefaultWalls();
    }
    
    toggleGrid() { this.gridHelper.visible = !this.gridHelper.visible; }
    toggleLabels() { 
        this.labelsVisible = !this.labelsVisible; 
        this.labelContainer.style.display = this.labelsVisible ? 'block' : 'none'; 
    }
    toggleWalls() { 
        this.wallsVisible = !this.wallsVisible; 
        this.wallMeshes.forEach(w => w.visible = this.wallsVisible); 
    }
    
    zoomIn() { this.camera.position.multiplyScalar(0.9); if(this.controls) this.controls.update(); }
    zoomOut() { this.camera.position.multiplyScalar(1.1); if(this.controls) this.controls.update(); }
    resetView() { this.camera.position.set(50, 60, 50); this.camera.lookAt(0,0,0); if(this.controls) this.controls.reset(); }
    setTopView() { this.camera.position.set(0, 100, 0); this.camera.lookAt(0,0,0); if(this.controls) this.controls.update(); }
    setFrontView() { this.camera.position.set(0, 20, 100); this.camera.lookAt(0,0,0); if(this.controls) this.controls.update(); }
    setSideView() { this.camera.position.set(100, 20, 0); this.camera.lookAt(0,0,0); if(this.controls) this.controls.update(); }
    setInteractionMode(mode) { this.interactionMode = mode; }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.labelsVisible) this.updateLabels();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure styles are applied
    setTimeout(() => {
        window.visualizer = new ThreeJSVisualizer('3d-container');
    }, 100);
});