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
            5000 // Increased far clipping plane
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
        this.controls.minDistance = 1;
        this.controls.maxDistance = 1000;
        
        // Add lighting
        this.addLighting();
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
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
        
        this.onWindowResize();
    }
    
    createDefaultWalls() {
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc,
            transparent: true,
            opacity: 0.1,
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
        const wallThickness = 0.2;
        const size = 100;
        
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 20, wallThickness), wallMaterial);
        backWall.position.set(0, 10, -size);
        backWall.userData = { type: 'wall', name: 'Back Wall' };
        this.wallMeshes.push(backWall);
        
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 20, wallThickness), wallMaterial);
        frontWall.position.set(0, 10, size);
        frontWall.userData = { type: 'wall', name: 'Front Wall' };
        this.wallMeshes.push(frontWall);
        
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 20, size * 2), wallMaterial);
        leftWall.position.set(-size, 10, 0);
        leftWall.userData = { type: 'wall', name: 'Left Wall' };
        this.wallMeshes.push(leftWall);
        
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, 20, size * 2), wallMaterial);
        rightWall.position.set(size, 10, 0);
        rightWall.userData = { type: 'wall', name: 'Right Wall' };
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
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        const shadowSize = 100;
        mainLight.shadow.camera.left = -shadowSize;
        mainLight.shadow.camera.right = shadowSize;
        mainLight.shadow.camera.top = shadowSize;
        mainLight.shadow.camera.bottom = -shadowSize;
        
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-50, 30, -50);
        this.scene.add(fillLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
        backLight.position.set(0, 20, -100);
        this.scene.add(backLight);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        
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
                
                this.selectedObject.position.x += deltaX * 0.01;
                this.selectedObject.position.z -= deltaY * 0.01;
                
                dragStart.x = event.clientX;
                dragStart.y = event.clientY;
                
                this.updateLabels();
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
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
            this.selectedObject.material.emissive.setHex(this.selectedObject.userData.originalEmissive);
        }
        
        let selectableObject = object;
        while (selectableObject && !selectableObject.userData.id) {
            selectableObject = selectableObject.parent;
        }
        
        if (selectableObject && selectableObject.userData.id) {
            this.selectedObject = selectableObject;
            
            if (selectableObject.material) {
                selectableObject.userData.originalEmissive = selectableObject.material.emissive.getHex();
                selectableObject.material.emissive.setHex(0xff5252);
            }
            
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
            
            const label = document.getElementById(`label-${deletableObject.userData.id}`);
            if (label) {
                this.labelContainer.removeChild(label);
            }
            
            if (this.selectedObject === deletableObject) {
                this.deselectObject();
            }
            
            if (window.warehouseApp) {
                window.warehouseApp.showNotification(`${deletableObject.userData.name} deleted`, 'success');
            }
        }
    }
    
    renderWarehouse(layout) {
        this.clearWarehouse();
        
        const dims = layout.warehouse_dimensions;
        this.createWarehouseFloor(dims);
        
        layout.blocks.forEach(block => {
            this.createBlock(block);
        });
        
        this.updateLabels();
        this.onWindowResize();
        this.fitCameraToScene(); 
    }
    
    fitCameraToScene() {
        if (this.objects.size === 0) {
            this.resetView();
            return;
        }

        const box = new THREE.Box3();
        this.objects.forEach(object => {
            box.expandByObject(object);
        });

        const floor = this.scene.children.find(c => c.userData && c.userData.type === 'warehouse-floor');
        if (floor) {
            box.expandByObject(floor);
        }

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.2;

        const direction = new THREE.Vector3(1, 0.8, 1).normalize();
        const position = direction.multiplyScalar(cameraZ).add(center);

        this.camera.position.copy(position);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
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
        
        const gridSize = Math.max(200, Math.max(width, length) * 2);
        const divisions = Math.floor(gridSize / 5);
        
        this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x000000, 0x000000);
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
            dimensions: dimensions,
            position: position,
            color: color,
            rackCount: racks ? racks.length : 0
        };
        
        const colorHex = parseInt(color.replace('#', ''), 16);
        
        const blockGeometry = new THREE.BoxGeometry(
            dimensions.width,
            dimensions.height,
            dimensions.length
        );
        const blockEdges = new THREE.EdgesGeometry(blockGeometry);
        const blockMaterial = new THREE.LineBasicMaterial({ 
            color: colorHex,
            linewidth: 2
        });
        const blockWireframe = new THREE.LineSegments(blockEdges, blockMaterial);
        blockWireframe.userData = blockContainer.userData;
        blockContainer.add(blockWireframe);
        
        const fillMaterial = new THREE.MeshLambertMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.1
        });
        const blockFill = new THREE.Mesh(blockGeometry, fillMaterial);
        blockFill.position.y = dimensions.height / 2;
        blockFill.castShadow = true;
        blockFill.receiveShadow = true;
        blockFill.userData = blockContainer.userData;
        blockContainer.add(blockFill);
        
        this.createLabel(blockId, name, {
            x: position.x,
            y: position.y + dimensions.height + 0.5,
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
        rackContainer.position.set(position.x, position.y, position.z);
        
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
        
        const rackGeometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length);
        const rackMaterial = new THREE.MeshLambertMaterial({ color: 0x2c5282, transparent: true, opacity: 0.7 });
        const rackMesh = new THREE.Mesh(rackGeometry, rackMaterial);
        rackMesh.position.y = dimensions.height / 2;
        rackMesh.castShadow = true;
        rackMesh.receiveShadow = true;
        rackMesh.userData = rackUserData;
        rackContainer.add(rackMesh);
        
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
        
        // Add uprights
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
            rackContainer.add(upright);
        });

        // UPDATED: Render Pallet if it exists in the data
        if (pallet) {
            this.createPallet(pallet, rackContainer);
        }
        
        const labelPosition = {
            x: parentBlock.position.x + position.x,
            y: position.y + dimensions.height + 0.3,
            z: parentBlock.position.z + position.z
        };
        this.createLabel(rackId, rackName, labelPosition);
        
        parentBlock.add(rackContainer);
        this.objects.set(rackId, rackContainer);
        parentBlock.userData.rackCount = (parentBlock.userData.rackCount || 0) + 1;
    }
    
    createPallet(palletData, parentRack) {
        const pDims = palletData.dimensions;
        const color = parseInt(palletData.color.replace('#', ''), 16);
        
        const geo = new THREE.BoxGeometry(pDims.width, pDims.height, pDims.length);
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Calculate rack base height (relative to rack center)
        const rackHeight = parentRack.children[0].geometry.parameters.height;
        // Place on bottom shelf
        mesh.position.y = -rackHeight/2 + pDims.height/2 + 0.05;
        
        // Add User Data for selection
        mesh.userData = {
            id: `pallet_${Math.random().toString(36).substr(2, 9)}`,
            type: 'pallet',
            name: `Pallet (${palletData.type})`,
            palletType: palletData.type,
            weight: palletData.weight,
            originalEmissive: 0x000000
        };
        
        parentRack.add(mesh);
        
        // Stock
        if(palletData.stock) {
            const sDims = palletData.stock.dimensions;
            const sColor = parseInt(palletData.stock.color.replace('#', ''), 16);
            
            const sGeo = new THREE.BoxGeometry(sDims.width, sDims.height, sDims.length);
            const sMat = new THREE.MeshLambertMaterial({ color: sColor });
            const sMesh = new THREE.Mesh(sGeo, sMat);
            sMesh.position.y = mesh.position.y + pDims.height/2 + sDims.height/2;
            
            parentRack.add(sMesh);
        }
    }
    
    createLabel(objectId, text, position) {
        if (!this.labelsVisible) return;
        
        const existingLabel = document.getElementById(`label-${objectId}`);
        if (existingLabel) {
            this.labelContainer.removeChild(existingLabel);
        }
        
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
                
                if (object.userData.type === 'block') {
                    worldPosition.y += object.userData.dimensions.height + 0.5;
                } else if (object.userData.type === 'rack') {
                    worldPosition.y += object.userData.dimensions.height + 0.3;
                }
                
                this.updateLabelPosition(label, worldPosition);
            }
        });
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
        this.objects.forEach((object, id) => {
            this.scene.remove(object);
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
        
        this.labelContainer.innerHTML = '';
        this.resetView();
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
        if (this.controls) {
            this.controls.update();
        }
        if (this.labelsVisible) {
            this.updateLabels();
        }
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ThreeJSVisualizer('3d-container');
});