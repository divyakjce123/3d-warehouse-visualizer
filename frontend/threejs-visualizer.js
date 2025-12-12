class ThreeJSVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
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
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);
        
        // Increased Far Clipping Plane to 50000 for large cm-scale warehouses
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            50000 
        );
        this.camera.position.set(40, 30, 40);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20000;
        
        this.addLighting();
        
        this.gridHelper = new THREE.GridHelper(500, 50, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.1;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);
        
        this.axesHelper = new THREE.AxesHelper(50);
        this.scene.add(this.axesHelper);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.labelContainer = document.createElement('div');
        this.labelContainer.style.position = 'absolute';
        this.labelContainer.style.top = '0';
        this.labelContainer.style.left = '0';
        this.labelContainer.style.pointerEvents = 'none';
        this.container.appendChild(this.labelContainer);
        
        this.createDefaultWalls();
        this.onWindowResize();
    }
    
    createDefaultWalls() {
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        const floorGeometry = new THREE.PlaneGeometry(500, 500);
        const floor = new THREE.Mesh(floorGeometry, wallMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        floor.userData = { type: 'floor', name: 'Floor' };
        this.scene.add(floor);
        
        this.wallMeshes = [];
        const wallThickness = 0.5;
        const size = 250;
        
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 50, wallThickness), wallMaterial);
        backWall.position.set(0, 25, -size);
        this.wallMeshes.push(backWall);
        
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 50, wallThickness), wallMaterial);
        frontWall.position.set(0, 25, size);
        this.wallMeshes.push(frontWall);
        
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 50, size * 2), wallMaterial);
        leftWall.position.set(-size, 25, 0);
        this.wallMeshes.push(leftWall);
        
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 50, size * 2), wallMaterial);
        rightWall.position.set(size, 25, 0);
        this.wallMeshes.push(rightWall);
        
        this.wallMeshes.forEach(wall => {
            wall.visible = this.wallsVisible;
            this.scene.add(wall);
        });
    }
    
    addLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(100, 200, 100);
        mainLight.castShadow = true;
        
        // Larger shadow map area
        mainLight.shadow.mapSize.width = 4096;
        mainLight.shadow.mapSize.height = 4096;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 1000;
        const d = 500;
        mainLight.shadow.camera.left = -d;
        mainLight.shadow.camera.right = d;
        mainLight.shadow.camera.top = d;
        mainLight.shadow.camera.bottom = -d;
        
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-100, 50, -100);
        this.scene.add(fillLight);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        
        let isDragging = false;
        this.renderer.domElement.addEventListener('mousedown', () => isDragging = true);
        this.renderer.domElement.addEventListener('mouseup', () => isDragging = false);
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (isDragging && this.selectedObject && this.interactionMode === 'edit') {
                const deltaX = event.movementX * 0.1; 
                const deltaY = event.movementY * 0.1;
                this.selectedObject.position.x += deltaX;
                this.selectedObject.position.z += deltaY;
                this.updateLabels();
            }
        });
    }
    
    onWindowResize() {
        if (!this.container) return;
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
            // Ignore helpers
            if(object.type === "LineSegments" || object === this.gridHelper) return;
            
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
        // Find the root group (Rack or Block or Pallet)
        let root = object;
        while(root.parent && root.parent.type !== 'Scene' && !root.userData.id) {
            root = root.parent;
        }
        
        if(root.userData && root.userData.id) {
            if (this.selectedObject && this.selectedObject !== root) {
                // Reset previous selection visuals if we had specific highlight logic
            }
            this.selectedObject = root;
            if (window.warehouseApp) window.warehouseApp.updateSelectedInfo(root.userData);
        }
    }
    
    deselectObject() {
        this.selectedObject = null;
        if (window.warehouseApp) window.warehouseApp.updateSelectedInfo(null);
    }
    
    deleteObject(object) {
        let root = object;
        while(root.parent && root.parent.type !== 'Scene' && !root.userData.id) {
            root = root.parent;
        }
        if(root.userData && root.userData.id) {
            this.scene.remove(root);
            this.objects.delete(root.userData.id);
            const label = document.getElementById(`label-${root.userData.id}`);
            if(label) label.remove();
        }
    }
    
    renderWarehouse(layout) {
        this.clearWarehouse();
        
        const dims = layout.warehouse_dimensions;
        this.createWarehouseFloor(dims);
        
        if(layout.blocks) {
            layout.blocks.forEach(block => {
                this.createBlock(block);
            });
        }
        
        this.updateLabels();
        this.onWindowResize();
        this.fitCameraToScene(); 
    }
    
    fitCameraToScene() {
        const box = new THREE.Box3();
        let hasObjects = false;
        
        this.scene.children.forEach(child => {
            if(child.userData && (child.userData.type === 'block' || child.userData.type === 'warehouse-floor')) {
                box.expandByObject(child);
                hasObjects = true;
            }
        });

        if (!hasObjects) {
            this.resetView();
            return;
        }

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Zoom out multiplier

        const direction = new THREE.Vector3(1, 1, 1).normalize();
        const position = direction.multiplyScalar(cameraZ).add(center);

        this.camera.position.copy(position);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }
    
    createWarehouseFloor(dimensions) {
        // Backend already returned meters, but we used "cm" in input.
        // warehouse_calc.py returns `wh_width` in meters in the `blocks` calculation, 
        // BUT `warehouse_dimensions` in the response is the RAW input config.
        // So dimensions.length is likely 5000 (if unit was cm).
        
        // Convert to meters for visualization
        const width = this.convertToMeters(dimensions.width, dimensions.unit);
        const length = this.convertToMeters(dimensions.length, dimensions.unit);
        
        // Remove old floor/grid
        const oldFloor = this.scene.children.find(c => c.userData.type === 'floor');
        if(oldFloor) this.scene.remove(oldFloor);
        this.scene.remove(this.gridHelper);

        const floorGeometry = new THREE.PlaneGeometry(width, length);
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x90a4ae, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        floor.receiveShadow = true;
        floor.userData = { type: 'warehouse-floor', name: 'Warehouse Floor' };
        this.scene.add(floor);
        
        // Update grid size
        const gridSize = Math.max(100, Math.max(width, length) * 1.5);
        this.gridHelper = new THREE.GridHelper(gridSize, 50, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.1;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);
    }
    
    createBlock(blockData) {
        const { position, dimensions, color, name, racks } = blockData;
        
        const blockContainer = new THREE.Group();
        blockContainer.position.set(position.x, position.y, position.z);
        
        const blockId = blockData.id;
        blockContainer.userData = {
            id: blockId,
            type: 'block',
            name: name,
            dimensions: dimensions
        };
        
        // Parse Color
        const colorHex = parseInt(color.replace('#', ''), 16);
        
        // Wireframe
        const blockGeometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length);
        const blockEdges = new THREE.EdgesGeometry(blockGeometry);
        const blockMaterial = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        const blockWireframe = new THREE.LineSegments(blockEdges, blockMaterial);
        blockContainer.add(blockWireframe);
        
        // Transparent fill
        const fillMaterial = new THREE.MeshLambertMaterial({ color: colorHex, transparent: true, opacity: 0.05 });
        const blockFill = new THREE.Mesh(blockGeometry, fillMaterial);
        blockFill.position.y = dimensions.height / 2;
        blockContainer.add(blockFill);
        
        this.createLabel(blockId, name, {
            x: position.x,
            y: position.y + dimensions.height + 1,
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
        const { position, dimensions, floor, row, column, pallet } = rackData;
        
        const rackContainer = new THREE.Group();
        // Position is relative to Block
        rackContainer.position.set(position.x, position.y, position.z);
        
        const rackId = rackData.id;
        const rackName = `Rack F${floor}R${row}C${column}`;
        
        rackContainer.userData = {
            id: rackId,
            type: 'rack',
            name: rackName,
            blockId: parentBlock.userData.id
        };
        
        // Rack Structure
        const rackColor = 0x2c3e50;
        const rackMat = new THREE.MeshLambertMaterial({ color: rackColor });
        
        // 4 Posts
        const postW = 0.1; 
        const postH = dimensions.height;
        const postD = 0.1;
        const w2 = dimensions.width / 2;
        const l2 = dimensions.length / 2;
        
        const postGeo = new THREE.BoxGeometry(postW, postH, postD);
        
        const p1 = new THREE.Mesh(postGeo, rackMat); p1.position.set(-w2, 0, -l2);
        const p2 = new THREE.Mesh(postGeo, rackMat); p2.position.set(w2, 0, -l2);
        const p3 = new THREE.Mesh(postGeo, rackMat); p3.position.set(-w2, 0, l2);
        const p4 = new THREE.Mesh(postGeo, rackMat); p4.position.set(w2, 0, l2);
        
        rackContainer.add(p1, p2, p3, p4);
        
        // Shelf Platform
        const shelfGeo = new THREE.BoxGeometry(dimensions.width, 0.05, dimensions.length);
        const shelfMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
        const shelf = new THREE.Mesh(shelfGeo, shelfMat);
        // Shelf is at the bottom of this 'floor' unit
        shelf.position.y = -dimensions.height / 2 + 0.025; 
        rackContainer.add(shelf);

        // Render Pallet
        if (pallet) {
            this.createPallet(pallet, rackContainer, shelf.position.y);
        }
        
        parentBlock.add(rackContainer);
        this.objects.set(rackId, rackContainer);
    }
    
    createPallet(palletData, parentRack, baseHeight) {
        const pDims = palletData.dimensions;
        const color = parseInt(palletData.color.replace('#', ''), 16);
        
        const geo = new THREE.BoxGeometry(pDims.width, pDims.height, pDims.length);
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Place on top of shelf
        mesh.position.y = baseHeight + (pDims.height / 2) + 0.025;
        
        mesh.userData = {
            id: `pallet_${Math.random()}`,
            type: 'pallet',
            name: `Pallet (${palletData.type})`
        };
        
        parentRack.add(mesh);
        
        // Stock
        if(palletData.stock) {
            const sDims = palletData.stock.dimensions;
            const sColor = parseInt(palletData.stock.color.replace('#', ''), 16);
            
            const sGeo = new THREE.BoxGeometry(sDims.width, sDims.height, sDims.length);
            const sMat = new THREE.MeshLambertMaterial({ color: sColor });
            const sMesh = new THREE.Mesh(sGeo, sMat);
            // On top of pallet
            sMesh.position.y = mesh.position.y + (pDims.height / 2) + (sDims.height / 2);
            
            parentRack.add(sMesh);
        }
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
            background: rgba(255, 255, 255, 0.8);
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 10px;
            color: #000;
            pointer-events: none;
            display: none; 
        `;
        this.labelContainer.appendChild(label);
        // Only show if needed, managed by updateLabels
    }
    
    updateLabelPosition(label, position) {
        const vector = new THREE.Vector3(position.x, position.y, position.z);
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-(vector.y * 0.5 + 0.5)) * this.container.clientHeight;
        
        if (vector.z < 1) { // Only if in front of camera
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
                const worldPosition = new THREE.Vector3();
                object.getWorldPosition(worldPosition);
                // Offset label slightly up
                worldPosition.y += 2; 
                this.updateLabelPosition(label, worldPosition);
            }
        });
    }
    
    convertToMeters(value, unit) {
        const conversions = { 'cm': 0.01, 'm': 1, 'km': 1000, 'in': 0.0254, 'ft': 0.3048 };
        return value * (conversions[unit] || 1);
    }
    
    clearWarehouse() {
        this.objects.forEach((obj, id) => {
            // Traverse up to remove from scene if needed, or just remove from parent
            if (obj.parent) obj.parent.remove(obj);
            const label = document.getElementById(`label-${id}`);
            if (label) label.remove();
        });
        this.objects.clear();
        this.deselectObject();
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
    
    zoomIn() { this.camera.position.multiplyScalar(0.9); this.controls.update(); }
    zoomOut() { this.camera.position.multiplyScalar(1.1); this.controls.update(); }
    resetView() { this.camera.position.set(40, 30, 40); this.controls.reset(); this.fitCameraToScene(); }
    setTopView() { this.camera.position.set(0, 100, 0); this.camera.lookAt(0,0,0); this.controls.update(); this.fitCameraToScene(); }
    setFrontView() { this.camera.position.set(0, 30, 100); this.camera.lookAt(0,0,0); this.controls.update(); this.fitCameraToScene(); }
    setSideView() { this.camera.position.set(100, 30, 0); this.camera.lookAt(0,0,0); this.controls.update(); this.fitCameraToScene(); }
    setInteractionMode(mode) { this.interactionMode = mode; }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.labelsVisible) this.updateLabels();
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ThreeJSVisualizer('3d-container');
});