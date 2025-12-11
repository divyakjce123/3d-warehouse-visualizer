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
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(40, 30, 40);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Add orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 200;
        
        // Add lighting
        this.addLighting();
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(100, 20, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.1;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);
        
        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(10);
        this.scene.add(this.axesHelper);
        
        // Raycaster for object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Label container
        this.labelContainer = document.createElement('div');
        this.labelContainer.style.position = 'absolute';
        this.labelContainer.style.top = '0';
        this.labelContainer.style.left = '0';
        this.labelContainer.style.pointerEvents = 'none';
        this.container.appendChild(this.labelContainer);
        
        // Create default warehouse walls
        this.createDefaultWalls();
    }
    
    createDefaultWalls() {
        // Create transparent walls for reference
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floor = new THREE.Mesh(floorGeometry, wallMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        floor.userData = { type: 'floor', name: 'Floor' };
        this.scene.add(floor);
        
        // Reference walls (only visible when enabled)
        this.wallMeshes = [];
        const wallThickness = 0.2;
        
        // Back wall
        const backWallGeometry = new THREE.BoxGeometry(100, 20, wallThickness);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.z = -50;
        backWall.position.y = 10;
        backWall.userData = { type: 'wall', name: 'Back Wall' };
        this.wallMeshes.push(backWall);
        
        // Front wall
        const frontWallGeometry = new THREE.BoxGeometry(100, 20, wallThickness);
        const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
        frontWall.position.z = 50;
        frontWall.position.y = 10;
        frontWall.userData = { type: 'wall', name: 'Front Wall' };
        this.wallMeshes.push(frontWall);
        
        // Left wall
        const leftWallGeometry = new THREE.BoxGeometry(wallThickness, 20, 100);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.x = -50;
        leftWall.position.y = 10;
        leftWall.userData = { type: 'wall', name: 'Left Wall' };
        this.wallMeshes.push(leftWall);
        
        // Right wall
        const rightWallGeometry = new THREE.BoxGeometry(wallThickness, 20, 100);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.x = 50;
        rightWall.position.y = 10;
        rightWall.userData = { type: 'wall', name: 'Right Wall' };
        this.wallMeshes.push(rightWall);
        
        this.wallMeshes.forEach(wall => {
            wall.visible = this.wallsVisible;
            this.scene.add(wall);
        });
    }
    
    addLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (main light)
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        mainLight.shadow.camera.left = -50;
        mainLight.shadow.camera.right = 50;
        mainLight.shadow.camera.top = 50;
        mainLight.shadow.camera.bottom = -50;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-50, 30, -50);
        this.scene.add(fillLight);
        
        // Back light
        const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
        backLight.position.set(0, 20, -100);
        this.scene.add(backLight);
    }
    
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Mouse events for object selection
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        
        // Mouse events for dragging
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            if (this.interactionMode === 'edit') {
                isDragging = true;
                dragStart.x = event.clientX;
                dragStart.y = event.clientY;
            }
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (isDragging && this.selectedObject) {
                const deltaX = event.clientX - dragStart.x;
                const deltaY = event.clientY - dragStart.y;
                
                // Update object position based on mouse movement
                this.selectedObject.position.x += deltaX * 0.01;
                this.selectedObject.position.z -= deltaY * 0.01;
                
                dragStart.x = event.clientX;
                dragStart.y = event.clientY;
                
                // Update label position
                this.updateLabels();
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Prevent context menu on right click
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    onMouseClick(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
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
        // Deselect previous object
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(this.selectedObject.userData.originalEmissive);
        }
        
        // Find parent with userData
        let selectableObject = object;
        while (selectableObject && !selectableObject.userData.id) {
            selectableObject = selectableObject.parent;
        }
        
        if (selectableObject && selectableObject.userData.id) {
            this.selectedObject = selectableObject;
            
            // Highlight selected object
            if (selectableObject.material) {
                selectableObject.userData.originalEmissive = selectableObject.material.emissive.getHex();
                selectableObject.material.emissive.setHex(0xff5252);
            }
            
            // Update app with selected object info
            if (window.warehouseApp) {
                window.warehouseApp.updateSelectedInfo(selectableObject.userData);
            }
        }
    }
    
    deselectObject() {
        if (this.selectedObject) {
            if (this.selectedObject.material) {
                this.selectedObject.material.emissive.setHex(this.selectedObject.userData.originalEmissive);
            }
            this.selectedObject = null;
            
            if (window.warehouseApp) {
                window.warehouseApp.updateSelectedInfo(null);
            }
        }
    }
    
    deleteObject(object) {
        let deletableObject = object;
        while (deletableObject && !deletableObject.userData.id) {
            deletableObject = deletableObject.parent;
        }
        
        if (deletableObject && deletableObject.userData.id) {
            this.scene.remove(deletableObject);
            this.objects.delete(deletableObject.userData.id);
            
            // Remove label if exists
            const label = document.getElementById(`label-${deletableObject.userData.id}`);
            if (label) {
                this.labelContainer.removeChild(label);
            }
            
            // If this was the selected object, deselect it
            if (this.selectedObject === deletableObject) {
                this.deselectObject();
            }
            
            // Show notification
            if (window.warehouseApp) {
                window.warehouseApp.showNotification(`${deletableObject.userData.name} deleted`, 'success');
            }
        }
    }
    
    renderWarehouse(layout) {
        // Clear existing warehouse
        this.clearWarehouse();
        
        // Create warehouse floor based on dimensions
        const dims = layout.warehouse_dimensions;
        this.createWarehouseFloor(dims);
        
        // Create blocks
        layout.blocks.forEach(block => {
            this.createBlock(block);
        });
        
        // Update labels
        this.updateLabels();
    }
    
    createWarehouseFloor(dimensions) {
        const width = this.convertToMeters(dimensions.width, dimensions.unit);
        const length = this.convertToMeters(dimensions.length, dimensions.unit);
        
        const floorGeometry = new THREE.PlaneGeometry(width, length);
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x78909c,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.userData = { type: 'warehouse-floor', name: 'Warehouse Floor' };
        this.scene.add(floor);
    }
    
    createBlock(blockData) {
        const { position, dimensions, color, name, racks } = blockData;
        
        // Create block container
        const blockContainer = new THREE.Group();
        blockContainer.position.set(position.x, position.y, position.z);
        
        const blockId = blockData.id;
        blockContainer.userData = {
            id: blockId,
            type: 'block',
            name: name,
            dimensions: dimensions,
            position: position,
            color: color,
            rackCount: racks ? racks.length : 0
        };
        
        // Create block outline (wireframe)
        const blockGeometry = new THREE.BoxGeometry(
            dimensions.width,
            dimensions.height,
            dimensions.length
        );
        const blockEdges = new THREE.EdgesGeometry(blockGeometry);
        const blockMaterial = new THREE.LineBasicMaterial({ 
            color: parseInt(color.replace('#', '0x'), 16),
            linewidth: 2
        });
        const blockWireframe = new THREE.LineSegments(blockEdges, blockMaterial);
        blockWireframe.userData = blockContainer.userData;
        blockContainer.add(blockWireframe);
        
        // Create transparent fill for better selection
        const fillMaterial = new THREE.MeshLambertMaterial({
            color: parseInt(color.replace('#', '0x'), 16),
            transparent: true,
            opacity: 0.1
        });
        const blockFill = new THREE.Mesh(blockGeometry, fillMaterial);
        blockFill.position.y = dimensions.height / 2;
        blockFill.castShadow = true;
        blockFill.receiveShadow = true;
        blockFill.userData = blockContainer.userData;
        blockContainer.add(blockFill);
        
        // Create block label
        this.createLabel(blockId, name, {
            x: position.x,
            y: position.y + dimensions.height + 0.5,
            z: position.z
        });
        
        // Create racks if they exist
        if (racks && racks.length > 0) {
            racks.forEach(rack => {
                this.createRack(rack, blockContainer);
            });
        }
        
        this.scene.add(blockContainer);
        this.objects.set(blockId, blockContainer);
    }
    
    createRack(rackData, parentBlock) {
        const { position, dimensions, floor, row, column } = rackData;
        
        // Create rack container
        const rackContainer = new THREE.Group();
        rackContainer.position.set(
            position.x,
            position.y,
            position.z
        );
        
        const rackId = rackData.id;
        const rackName = `Rack F${floor}R${row}C${column}`;
        
        const rackUserData = {
            id: rackId,
            type: 'rack',
            name: rackName,
            blockId: parentBlock.userData.id,
            rackId: rackId.split('_floor_')[0],
            floor: floor,
            row: row,
            column: column,
            dimensions: dimensions,
            position: position,
            palletCount: 0
        };
        
        // Create rack frame
        const rackGeometry = new THREE.BoxGeometry(
            dimensions.width,
            dimensions.height,
            dimensions.length
        );
        const rackMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2c5282,
            transparent: true,
            opacity: 0.7
        });
        const rackMesh = new THREE.Mesh(rackGeometry, rackMaterial);
        rackMesh.position.y = dimensions.height / 2;
        rackMesh.castShadow = true;
        rackMesh.receiveShadow = true;
        rackMesh.userData = rackUserData;
        rackContainer.add(rackMesh);
        
        // Create rack shelves
        const shelfThickness = 0.05;
        const shelfCount = Math.max(3, Math.floor(dimensions.height / 0.5));
        
        for (let i = 0; i < shelfCount; i++) {
            const shelfGeometry = new THREE.BoxGeometry(
                dimensions.width - 0.1,
                shelfThickness,
                dimensions.length - 0.1
            );
            const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x718096 });
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.y = (i * dimensions.height / shelfCount) + (shelfThickness / 2);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            rackContainer.add(shelf);
        }
        
        // Create rack uprights
        const uprightGeometry = new THREE.BoxGeometry(0.05, dimensions.height, 0.05);
        const uprightMaterial = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
        
        const positions = [
            { x: -dimensions.width/2 + 0.025, z: -dimensions.length/2 + 0.025 },
            { x: dimensions.width/2 - 0.025, z: -dimensions.length/2 + 0.025 },
            { x: -dimensions.width/2 + 0.025, z: dimensions.length/2 - 0.025 },
            { x: dimensions.width/2 - 0.025, z: dimensions.length/2 - 0.025 }
        ];
        
        positions.forEach(pos => {
            const upright = new THREE.Mesh(uprightGeometry, uprightMaterial);
            upright.position.set(pos.x, dimensions.height/2, pos.z);
            upright.castShadow = true;
            rackContainer.add(upright);
        });
        
        // Create rack label
        const labelPosition = {
            x: parentBlock.position.x + position.x,
            y: position.y + dimensions.height + 0.3,
            z: parentBlock.position.z + position.z
        };
        this.createLabel(rackId, rackName, labelPosition);
        
        parentBlock.add(rackContainer);
        this.objects.set(rackId, rackContainer);
        
        // Update parent block rack count
        parentBlock.userData.rackCount = (parentBlock.userData.rackCount || 0) + 1;
    }
    
    createLabel(objectId, text, position) {
        if (!this.labelsVisible) return;
        
        // Remove existing label if any
        const existingLabel = document.getElementById(`label-${objectId}`);
        if (existingLabel) {
            this.labelContainer.removeChild(existingLabel);
        }
        
        // Create new label
        const label = document.createElement('div');
        label.id = `label-${objectId}`;
        label.className = 'object-label';
        label.textContent = text;
        label.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            color: #333;
            border: 1px solid #d32f2f;
            pointer-events: none;
            white-space: nowrap;
            transform: translate(-50%, -100%);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 10;
        `;
        
        this.labelContainer.appendChild(label);
        this.updateLabelPosition(label, position);
    }
    
    updateLabelPosition(label, position) {
        const vector = new THREE.Vector3(position.x, position.y, position.z);
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-(vector.y * 0.5 + 0.5)) * this.container.clientHeight;
        
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        label.style.display = vector.z < 1 ? 'block' : 'none';
    }
    
    updateLabels() {
        this.objects.forEach((object, id) => {
            const label = document.getElementById(`label-${id}`);
            if (label) {
                const worldPosition = new THREE.Vector3();
                object.getWorldPosition(worldPosition);
                
                // Adjust height for labels
                if (object.userData.type === 'block') {
                    worldPosition.y += object.userData.dimensions.height + 0.5;
                } else if (object.userData.type === 'rack') {
                    worldPosition.y += object.userData.dimensions.height + 0.3;
                }
                
                this.updateLabelPosition(label, worldPosition);
            }
        });
    }
    
    createPallet(palletData, parentRack) {
        const { type, color, dimensions, stock } = palletData;
        
        // Create pallet container
        const palletContainer = new THREE.Group();
        palletContainer.userData = {
            id: palletData.id,
            type: 'pallet',
            name: `Pallet ${palletData.id.replace('pallet_', '')}`,
            palletType: type,
            stockType: stock?.type,
            dimensions: dimensions,
            color: color,
            blockId: parentRack.userData.blockId,
            rackId: parentRack.userData.rackId
        };
        
        // Create pallet base
        const palletGeometry = new THREE.BoxGeometry(
            this.convertToMeters(dimensions.width, dimensions.unit),
            this.convertToMeters(dimensions.height, dimensions.unit),
            this.convertToMeters(dimensions.length, dimensions.unit)
        );
        const palletMaterial = new THREE.MeshLambertMaterial({ 
            color: parseInt(color.replace('#', '0x'), 16)
        });
        const pallet = new THREE.Mesh(palletGeometry, palletMaterial);
        pallet.castShadow = true;
        pallet.receiveShadow = true;
        pallet.userData = palletContainer.userData;
        palletContainer.add(pallet);
        
        // Create stock on pallet
        if (stock && stock.dimensions) {
            const stockGeometry = new THREE.BoxGeometry(
                this.convertToMeters(stock.dimensions.width, stock.dimensions.unit),
                this.convertToMeters(stock.dimensions.height, stock.dimensions.unit),
                this.convertToMeters(stock.dimensions.length, stock.dimensions.unit)
            );
            const stockMaterial = new THREE.MeshLambertMaterial({ 
                color: parseInt(stock.color.replace('#', '0x'), 16)
            });
            const stockMesh = new THREE.Mesh(stockGeometry, stockMaterial);
            stockMesh.position.y = this.convertToMeters(dimensions.height, dimensions.unit) / 2 + 
                                  this.convertToMeters(stock.dimensions.height, stock.dimensions.unit) / 2;
            stockMesh.castShadow = true;
            stockMesh.receiveShadow = true;
            palletContainer.add(stockMesh);
        }
        
        // Position pallet randomly within rack
        const rackDims = parentRack.userData.dimensions;
        const palletWidth = this.convertToMeters(dimensions.width, dimensions.unit);
        const palletLength = this.convertToMeters(dimensions.length, dimensions.unit);
        
        const maxX = (rackDims.width - palletWidth) / 2;
        const maxZ = (rackDims.length - palletLength) / 2;
        
        palletContainer.position.x = (Math.random() - 0.5) * maxX * 0.8;
        palletContainer.position.z = (Math.random() - 0.5) * maxZ * 0.8;
        palletContainer.position.y = this.convertToMeters(dimensions.height, dimensions.unit) / 2;
        
        parentRack.add(palletContainer);
        this.objects.set(palletData.id, palletContainer);
        
        // Update rack pallet count
        parentRack.userData.palletCount = (parentRack.userData.palletCount || 0) + 1;
    }
    
    convertToMeters(value, unit) {
        const conversions = {
            'cm': 0.01,
            'm': 1,
            'km': 1000,
            'in': 0.0254,
            'ft': 0.3048,
            'yd': 0.9144,
            'mi': 1609.34
        };
        return value * (conversions[unit] || 1);
    }
    
    clearWarehouse() {
        // Remove all warehouse objects but keep helpers and walls
        this.objects.forEach((object, id) => {
            this.scene.remove(object);
            
            // Remove label
            const label = document.getElementById(`label-${id}`);
            if (label) {
                this.labelContainer.removeChild(label);
            }
        });
        
        this.objects.clear();
        this.deselectObject();
    }
    
    clearScene() {
        this.clearWarehouse();
        
        // Remove floor but keep other helpers
        const objectsToRemove = [];
        this.scene.children.forEach(child => {
            if (child !== this.gridHelper && child !== this.axesHelper && 
                !(child instanceof THREE.Light) && 
                !this.wallMeshes.includes(child) &&
                child.userData.type !== 'floor') {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
        });
        
        // Clear labels
        this.labelContainer.innerHTML = '';
    }
    
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.gridHelper.visible = this.gridVisible;
    }
    
    toggleLabels() {
        this.labelsVisible = !this.labelsVisible;
        this.labelContainer.style.display = this.labelsVisible ? 'block' : 'none';
    }
    
    toggleWalls() {
        this.wallsVisible = !this.wallsVisible;
        this.wallMeshes.forEach(wall => {
            wall.visible = this.wallsVisible;
        });
    }
    
    zoomIn() {
        this.camera.position.multiplyScalar(0.9);
        this.controls.update();
    }
    
    zoomOut() {
        this.camera.position.multiplyScalar(1.1);
        this.controls.update();
    }
    
    rotateLeft() {
        this.controls.rotateLeft(Math.PI / 8);
    }
    
    rotateRight() {
        this.controls.rotateRight(Math.PI / 8);
    }
    
    resetView() {
        this.camera.position.set(40, 30, 40);
        this.controls.reset();
    }
    
    setTopView() {
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    setFrontView() {
        this.camera.position.set(0, 30, 100);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    setSideView() {
        this.camera.position.set(100, 30, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    setInteractionMode(mode) {
        this.interactionMode = mode;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Update labels
        if (this.labelsVisible) {
            this.updateLabels();
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize visualizer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ThreeJSVisualizer('3d-container');
});