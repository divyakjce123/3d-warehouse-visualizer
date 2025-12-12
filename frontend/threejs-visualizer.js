// // frontend/threejs-visualizer.js
// class ThreeJSVisualizer {
//   constructor(containerId) {
//     this.container = document.getElementById(containerId);
//     this.scene = null;
//     this.camera = null;
//     this.renderer = null;
//     this.controls = null;
//     this.objects = new Map();
//     this.selectedObject = null;
//     this.interactionMode = "view";
//     this.gridVisible = true;
//     this.labelsVisible = true;
//     this.wallsVisible = true;

//     this.init();
//     this.setupEventListeners();
//     this.animate();
//   }

//   init() {
//     this.scene = new THREE.Scene();
//     this.scene.background = new THREE.Color(0xf8f9fa);

//     // Far plane 100000 to see large warehouses (1km in cm)
//     this.camera = new THREE.PerspectiveCamera(
//       45,
//       this.container.clientWidth / this.container.clientHeight,
//       0.1,
//       100000
//     );
//     this.camera.position.set(4000, 3000, 4000);

//     this.renderer = new THREE.WebGLRenderer({ antialias: true });
//     this.renderer.setSize(
//       this.container.clientWidth,
//       this.container.clientHeight
//     );
//     this.renderer.shadowMap.enabled = true;
//     this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//     this.container.appendChild(this.renderer.domElement);

//     this.controls = new THREE.OrbitControls(
//       this.camera,
//       this.renderer.domElement
//     );
//     this.controls.enableDamping = true;
//     this.controls.dampingFactor = 0.05;
//     this.controls.minDistance = 10;
//     this.controls.maxDistance = 200000;

//     this.addLighting();

//     // Large Grid for CM scale
//     this.gridHelper = new THREE.GridHelper(50000, 50, 0x000000, 0x000000);
//     this.gridHelper.material.opacity = 0.1;
//     this.gridHelper.material.transparent = true;
//     this.scene.add(this.gridHelper);

//     this.axesHelper = new THREE.AxesHelper(1000);
//     this.scene.add(this.axesHelper);

//     this.raycaster = new THREE.Raycaster();
//     this.mouse = new THREE.Vector2();

//     this.labelContainer = document.createElement("div");
//     this.labelContainer.style.position = "absolute";
//     this.labelContainer.style.top = "0";
//     this.labelContainer.style.left = "0";
//     this.labelContainer.style.pointerEvents = "none";
//     this.container.appendChild(this.labelContainer);

//     this.createDefaultWalls();
//     this.onWindowResize();
//   }

//   createDefaultWalls() {
//     const wallMaterial = new THREE.MeshLambertMaterial({
//       color: 0xcccccc,
//       transparent: true,
//       opacity: 0.1,
//       side: THREE.DoubleSide,
//     });

//     // Floor 500m x 500m
//     const floorGeometry = new THREE.PlaneGeometry(50000, 50000);
//     const floor = new THREE.Mesh(floorGeometry, wallMaterial);
//     floor.rotation.x = -Math.PI / 2;
//     floor.position.y = -0.5;
//     floor.receiveShadow = true;
//     floor.userData = { type: "floor", name: "Floor" };
//     this.scene.add(floor);

//     this.wallMeshes = [];
//     const wallThickness = 20; // 20cm
//     const size = 25000; // 250m
//     const wallHeight = 1000; // 10m high
//     const wallY = wallHeight / 2;

//     const backWall = new THREE.Mesh(
//       new THREE.BoxGeometry(size * 2, wallHeight, wallThickness),
//       wallMaterial
//     );
//     backWall.position.set(0, wallY, -size);
//     this.wallMeshes.push(backWall);

//     const frontWall = new THREE.Mesh(
//       new THREE.BoxGeometry(size * 2, wallHeight, wallThickness),
//       wallMaterial
//     );
//     frontWall.position.set(0, wallY, size);
//     this.wallMeshes.push(frontWall);

//     const leftWall = new THREE.Mesh(
//       new THREE.BoxGeometry(wallThickness, wallHeight, size * 2),
//       wallMaterial
//     );
//     leftWall.position.set(-size, wallY, 0);
//     this.wallMeshes.push(leftWall);

//     const rightWall = new THREE.Mesh(
//       new THREE.BoxGeometry(wallThickness, wallHeight, size * 2),
//       wallMaterial
//     );
//     rightWall.position.set(size, wallY, 0);
//     this.wallMeshes.push(rightWall);

//     this.wallMeshes.forEach((wall) => {
//       wall.visible = this.wallsVisible;
//       this.scene.add(wall);
//     });
//   }

//   addLighting() {
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
//     this.scene.add(ambientLight);

//     const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
//     mainLight.position.set(10000, 20000, 10000);
//     mainLight.castShadow = true;

//     mainLight.shadow.mapSize.width = 4096;
//     mainLight.shadow.mapSize.height = 4096;
//     mainLight.shadow.camera.near = 10;
//     mainLight.shadow.camera.far = 100000;
//     const d = 50000;
//     mainLight.shadow.camera.left = -d;
//     mainLight.shadow.camera.right = d;
//     mainLight.shadow.camera.top = d;
//     mainLight.shadow.camera.bottom = -d;

//     this.scene.add(mainLight);

//     const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
//     fillLight.position.set(-10000, 5000, -10000);
//     this.scene.add(fillLight);
//   }

//   setupEventListeners() {
//     window.addEventListener("resize", () => this.onWindowResize());
//     this.renderer.domElement.addEventListener("click", (event) =>
//       this.onMouseClick(event)
//     );

//     let isDragging = false;
//     this.renderer.domElement.addEventListener(
//       "mousedown",
//       () => (isDragging = true)
//     );
//     this.renderer.domElement.addEventListener(
//       "mouseup",
//       () => (isDragging = false)
//     );
//     this.renderer.domElement.addEventListener("mousemove", (event) => {
//       if (
//         isDragging &&
//         this.selectedObject &&
//         this.interactionMode === "edit"
//       ) {
//         const deltaX = event.movementX * 10;
//         const deltaY = event.movementY * 10;
//         this.selectedObject.position.x += deltaX;
//         this.selectedObject.position.z += deltaY;
//         this.updateLabels();
//       }
//     });
//   }

//   onWindowResize() {
//     if (!this.container) return;
//     this.camera.aspect =
//       this.container.clientWidth / this.container.clientHeight;
//     this.camera.updateProjectionMatrix();
//     this.renderer.setSize(
//       this.container.clientWidth,
//       this.container.clientHeight
//     );
//   }

//   onMouseClick(event) {
//     const rect = this.renderer.domElement.getBoundingClientRect();
//     this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
//     this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

//     this.raycaster.setFromCamera(this.mouse, this.camera);
//     const intersects = this.raycaster.intersectObjects(
//       this.scene.children,
//       true
//     );

//     if (intersects.length > 0) {
//       const object = intersects[0].object;
//       if (object.type === "LineSegments" || object === this.gridHelper) return;

//       if (this.interactionMode === "delete") {
//         this.deleteObject(object);
//       } else {
//         this.selectObject(object);
//       }
//     } else {
//       this.deselectObject();
//     }
//   }

//   selectObject(object) {
//     let root = object;
//     while (root.parent && root.parent.type !== "Scene" && !root.userData.id) {
//       root = root.parent;
//     }
//     if (root.userData && root.userData.id) {
//       this.selectedObject = root;
//       if (window.warehouseApp)
//         window.warehouseApp.updateSelectedInfo(root.userData);
//     }
//   }

//   deselectObject() {
//     this.selectedObject = null;
//     if (window.warehouseApp) window.warehouseApp.updateSelectedInfo(null);
//   }

//   deleteObject(object) {
//     let root = object;
//     while (root.parent && root.parent.type !== "Scene" && !root.userData.id) {
//       root = root.parent;
//     }
//     if (root.userData && root.userData.id) {
//       this.scene.remove(root);
//       this.objects.delete(root.userData.id);
//       const label = document.getElementById(`label-${root.userData.id}`);
//       if (label) label.remove();
//     }
//   }

//   //   renderWarehouse(layout) {
//   //     console.debug("ThreeJSVisualizer.renderWarehouse called", layout);
//   //     try {
//   //       this.clearWarehouse();
//   //     } catch (err) {
//   //       console.error("Error clearing warehouse:", err);
//   //     }
//   //     const dims = layout.warehouse_dimensions;
//   //     this.createWarehouseFloor(dims);
//   //     if (layout.blocks) {
//   //       layout.blocks.forEach((block) => {
//   //         try {
//   //           this.createBlock(block);
//   //         } catch (err) {
//   //           console.error("Error creating block:", block, err);
//   //         }
//   //       });
//   //       console.debug("Rendered blocks:", layout.blocks.length);
//   //     }
//   //     this.updateLabels();
//   //     this.onWindowResize();
//   //     this.fitCameraToScene();
//   //   }

//   renderWarehouse(layout) {
//     debugger;
//     console.log("ThreeJSVisualizer.renderWarehouse called", layout);
//     try {
//       this.clearWarehouse();
//       const dims = layout.warehouse_dimensions;
//       this.createWarehouseFloor(dims);

//       if (layout.blocks) {
//         layout.blocks.forEach((block, i) => {
//           console.log("creating block", i, block);
//           this.createBlock(block);
//         });
//       }
//       this.updateLabels();
//       this.fitCameraToScene();
//     } catch (err) {
//       console.error("RENDER FAILED", err);
//     }
//   }

//   fitCameraToScene() {
//     const box = new THREE.Box3();
//     let hasObjects = false;
//     this.scene.children.forEach((child) => {
//       if (
//         child.userData &&
//         (child.userData.type === "block" ||
//           child.userData.type === "warehouse-floor")
//       ) {
//         box.expandByObject(child);
//         hasObjects = true;
//       }
//     });

//     if (!hasObjects) {
//       this.resetView();
//       return;
//     }

//     const size = box.getSize(new THREE.Vector3());
//     const center = box.getCenter(new THREE.Vector3());
//     const maxDim = Math.max(size.x, size.y, size.z);
//     const fov = this.camera.fov * (Math.PI / 180);
//     let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
//     cameraZ *= 1.5;

//     const direction = new THREE.Vector3(1, 1, 1).normalize();
//     const position = direction.multiplyScalar(cameraZ).add(center);

//     this.camera.position.copy(position);
//     this.camera.lookAt(center);
//     this.controls.target.copy(center);
//     this.controls.update();
//   }

//   //   createWarehouseFloor(dimensions) {
//   //     // Dimensions are already in CM from backend
//   //     const width = this.convertToCentimeters(dimensions.width, dimensions.unit);
//   //     const length = this.convertToCentimeters(
//   //       dimensions.length,
//   //       dimensions.unit
//   //     );

//   //     const oldFloor = this.scene.children.find(
//   //       (c) => c.userData.type === "floor"
//   //     );
//   //     if (oldFloor) this.scene.remove(oldFloor);
//   //     this.scene.remove(this.gridHelper);

//   //     const floorGeometry = new THREE.PlaneGeometry(width, length);
//   //     const floorMaterial = new THREE.MeshLambertMaterial({
//   //       color: 0x90a4ae,
//   //       side: THREE.DoubleSide,
//   //     });
//   //     const floor = new THREE.Mesh(floorGeometry, floorMaterial);
//   //     floor.rotation.x = -Math.PI / 2;
//   //     floor.position.y = -0.5;
//   //     floor.receiveShadow = true;
//   //     floor.userData = { type: "warehouse-floor", name: "Warehouse Floor" };
//   //     this.scene.add(floor);

//   //     const gridSize = Math.max(1000, Math.max(width, length) * 1.5);
//   //     this.gridHelper = new THREE.GridHelper(gridSize, 50, 0x000000, 0x000000);
//   //     this.gridHelper.material.opacity = 0.1;
//   //     this.gridHelper.material.transparent = true;
//   //     this.scene.add(this.gridHelper);
//   //   }

//   createWarehouseFloor(dimensions) {
//     // dimensions already in cm – just rename to avoid undefined
//     const width = dimensions.width || 0;
//     const length = dimensions.length || 0;

//     const oldFloor = this.scene.children.find(
//       (c) => c.userData.type === "warehouse-floor"
//     );
//     if (oldFloor) this.scene.remove(oldFloor);
//     this.scene.remove(this.gridHelper);

//     const floorGeometry = new THREE.PlaneGeometry(width, length);
//     const floorMaterial = new THREE.MeshLambertMaterial({
//       color: 0x90a4ae,
//       side: THREE.DoubleSide,
//     });
//     const floor = new THREE.Mesh(floorGeometry, floorMaterial);
//     floor.rotation.x = -Math.PI / 2;
//     floor.position.y = -0.5;
//     floor.receiveShadow = true;
//     floor.userData = { type: "warehouse-floor", name: "Warehouse Floor" };
//     this.scene.add(floor);

//     const gridSize = Math.max(1000, Math.max(width, length) * 1.5);
//     this.gridHelper = new THREE.GridHelper(gridSize, 50, 0x000000, 0x000000);
//     this.gridHelper.material.opacity = 0.1;
//     this.gridHelper.material.transparent = true;
//     this.scene.add(this.gridHelper);
//   }

//   //   createBlock(blockData) {
//   //     const { position, dimensions, color, name, racks } = blockData;
//   //     const blockContainer = new THREE.Group();
//   //     blockContainer.position.set(position.x, position.y, position.z);
//   //     const blockId = blockData.id;

//   //     blockContainer.userData = {
//   //       id: blockId,
//   //       type: "block",
//   //       name: name,
//   //       dimensions: dimensions,
//   //     };

//   //     const colorHex = parseInt(color.replace("#", ""), 16);

//   //     const blockGeometry = new THREE.BoxGeometry(
//   //       dimensions.width,
//   //       dimensions.height,
//   //       dimensions.length
//   //     );
//   //     const blockEdges = new THREE.EdgesGeometry(blockGeometry);
//   //     const blockMaterial = new THREE.LineBasicMaterial({
//   //       color: colorHex,
//   //       linewidth: 2,
//   //     });
//   //     const blockWireframe = new THREE.LineSegments(blockEdges, blockMaterial);
//   //     blockContainer.add(blockWireframe);

//   //     const fillMaterial = new THREE.MeshLambertMaterial({
//   //       color: colorHex,
//   //       transparent: true,
//   //       opacity: 0.05,
//   //     });
//   //     const blockFill = new THREE.Mesh(blockGeometry, fillMaterial);
//   //     blockFill.position.y = dimensions.height / 2;
//   //     blockContainer.add(blockFill);

//   //     this.createLabel(blockId, name, {
//   //       x: position.x,
//   //       y: position.y + dimensions.height + 100,
//   //       z: position.z,
//   //     });

//   //     if (racks && racks.length > 0) {
//   //       racks.forEach((rack) => {
//   //         this.createRack(rack, blockContainer);
//   //       });
//   //     }
//   //     this.scene.add(blockContainer);
//   //     this.objects.set(blockId, blockContainer);
//   //   }

//   createBlock(blockData) {
//     const { position, dimensions, color, name, racks } = blockData;
//     const blockContainer = new THREE.Group();
//     blockContainer.position.set(position.x, position.y, position.z);
//     const blockId = blockData.id;

//     blockContainer.userData = {
//       id: blockId,
//       type: "block",
//       name: name,
//       dimensions: dimensions,
//     };

//     const colorHex = parseInt(color.replace("#", ""), 16);

//     const blockGeometry = new THREE.BoxGeometry(
//       dimensions.width,
//       dimensions.height,
//       dimensions.length
//     );
//     const blockEdges = new THREE.EdgesGeometry(blockGeometry);
//     const blockMaterial = new THREE.LineBasicMaterial({
//       color: colorHex,
//       linewidth: 2,
//     });
//     const blockWireframe = new THREE.LineSegments(blockEdges, blockMaterial);
//     blockContainer.add(blockWireframe);

//     const fillMaterial = new THREE.MeshLambertMaterial({
//       color: colorHex,
//       transparent: true,
//       opacity: 0.05,
//     });
//     const blockFill = new THREE.Mesh(blockGeometry, fillMaterial);
//     blockFill.position.y = dimensions.height / 2;
//     blockContainer.add(blockFill);

//     this.createLabel(blockId, name, {
//       x: position.x,
//       y: position.y + dimensions.height + 100,
//       z: position.z,
//     });

//     if (racks && racks.length > 0) {
//       racks.forEach((rack) => {
//         this.createRack(rack, blockContainer);
//       });
//     }
//     this.scene.add(blockContainer);
//     this.objects.set(blockId, blockContainer);
//   }

//   //   createRack(rackData, parentBlock) {
//   //     const { position, dimensions, floor, row, column, pallet } = rackData;
//   //     const rackContainer = new THREE.Group();
//   //     rackContainer.position.set(position.x, position.y, position.z);
//   //     const rackId = rackData.id;
//   //     const rackName = `Rack F${floor}R${row}C${column}`;

//   //     rackContainer.userData = {
//   //       id: rackId,
//   //       type: "rack",
//   //       name: rackName,
//   //       blockId: parentBlock.userData.id,
//   //       floor: floor,
//   //       row: row,
//   //       column: column,
//   //       dimensions: dimensions,
//   //     };

//   //     const rackGeometry = new THREE.BoxGeometry(
//   //       dimensions.width,
//   //       dimensions.height,
//   //       dimensions.length
//   //     );
//   //     const rackMaterial = new THREE.MeshLambertMaterial({
//   //       color: 0x2c5282,
//   //       transparent: true,
//   //       opacity: 0.7,
//   //     });
//   //     const rackMesh = new THREE.Mesh(rackGeometry, rackMaterial);
//   //     rackMesh.position.y = dimensions.height / 2;
//   //     rackMesh.castShadow = true;
//   //     rackMesh.receiveShadow = true;
//   //     rackContainer.add(rackMesh);

//   //     const shelfCount = Math.max(3, Math.floor(dimensions.height / 200)); // shelf every ~2m
//   //     for (let i = 0; i < shelfCount; i++) {
//   //       const shelfGeometry = new THREE.BoxGeometry(
//   //         dimensions.width - 5,
//   //         5,
//   //         dimensions.length - 5
//   //       );
//   //       const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x718096 });
//   //       const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
//   //       shelf.position.y = (i * dimensions.height) / shelfCount + 5;
//   //       rackContainer.add(shelf);
//   //     }

//   //     if (pallet) {
//   //       this.createPallet(pallet, rackContainer);
//   //     }

//   //     const labelPosition = {
//   //       x: parentBlock.position.x + position.x,
//   //       y: position.y + dimensions.height + 50,
//   //       z: parentBlock.position.z + position.z,
//   //     };
//   //     this.createLabel(rackId, rackName, labelPosition);

//   //     parentBlock.add(rackContainer);
//   //     this.objects.set(rackId, rackContainer);
//   //   }

//   createRack(rackData, parentBlock) {
//     const { position, dimensions, floor, row, column, pallet } = rackData;
//     const rackContainer = new THREE.Group();
//     rackContainer.position.set(position.x, position.y, position.z);
//     const rackId = rackData.id;
//     const rackName = `Rack F${floor}R${row}C${column}`;

//     rackContainer.userData = {
//       id: rackId,
//       type: "rack",
//       name: rackName,
//       blockId: parentBlock.userData.id,
//       floor: floor,
//       row: row,
//       column: column,
//       dimensions: dimensions,
//     };

//     const rackGeometry = new THREE.BoxGeometry(
//       dimensions.width,
//       dimensions.height,
//       dimensions.length
//     );
//     const rackMaterial = new THREE.MeshLambertMaterial({
//       color: 0x2c5282,
//       transparent: true,
//       opacity: 0.7,
//     });
//     const rackMesh = new THREE.Mesh(rackGeometry, rackMaterial);
//     rackMesh.position.y = dimensions.height / 2;
//     rackMesh.castShadow = true;
//     rackMesh.receiveShadow = true;
//     rackContainer.add(rackMesh);

//     const shelfCount = Math.max(3, Math.floor(dimensions.height / 200));
//     for (let i = 0; i < shelfCount; i++) {
//       const shelfGeometry = new THREE.BoxGeometry(
//         dimensions.width - 5,
//         5,
//         dimensions.length - 5
//       );
//       const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x718096 });
//       const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
//       shelf.position.y = (i * dimensions.height) / shelfCount + 5;
//       rackContainer.add(shelf);
//     }

//     if (pallet) {
//       this.createPallet(pallet, rackContainer);
//     }

//     const labelPosition = {
//       x: parentBlock.position.x + position.x,
//       y: position.y + dimensions.height + 50,
//       z: parentBlock.position.z + position.z,
//     };
//     this.createLabel(rackId, rackName, labelPosition);

//     parentBlock.add(rackContainer);
//     this.objects.set(rackId, rackContainer);
//   }
//   createPallet(palletData, parentRack) {
//     const pDims = palletData.dimensions;
//     const color = parseInt(palletData.color.replace("#", ""), 16);
//     const geo = new THREE.BoxGeometry(pDims.width, pDims.height, pDims.length);
//     const mat = new THREE.MeshLambertMaterial({ color: color });
//     const mesh = new THREE.Mesh(geo, mat);

//     const rackHeight = parentRack.children[0].geometry.parameters.height;
//     mesh.position.y = -rackHeight / 2 + pDims.height / 2 + 5;

//     mesh.userData = {
//       id: `pallet_${Math.random()}`,
//       type: "pallet",
//       name: `Pallet (${palletData.type})`,
//     };
//     parentRack.add(mesh);

//     if (palletData.stock) {
//       const sDims = palletData.stock.dimensions;
//       const sColor = parseInt(palletData.stock.color.replace("#", ""), 16);
//       const sGeo = new THREE.BoxGeometry(
//         sDims.width,
//         sDims.height,
//         sDims.length
//       );
//       const sMat = new THREE.MeshLambertMaterial({ color: sColor });
//       const sMesh = new THREE.Mesh(sGeo, sMat);
//       sMesh.position.y = mesh.position.y + pDims.height / 2 + sDims.height / 2;
//       parentRack.add(sMesh);
//     }
//   }

//   createLabel(objectId, text, position) {
//     if (!this.labelsVisible) return;
//     const existingLabel = document.getElementById(`label-${objectId}`);
//     if (existingLabel) existingLabel.remove();

//     const label = document.createElement("div");
//     label.id = `label-${objectId}`;
//     label.className = "object-label";
//     label.textContent = text;
//     label.style.cssText = `
//             position: absolute; background: rgba(255, 255, 255, 0.8); padding: 2px 5px; border-radius: 4px; font-size: 10px; color: #000; pointer-events: none; display: none; 
//         `;
//     this.labelContainer.appendChild(label);
//     this.updateLabelPosition(label, position);
//   }

//   updateLabelPosition(label, position) {
//     const vector = new THREE.Vector3(position.x, position.y, position.z);
//     vector.project(this.camera);
//     const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
//     const y = -(vector.y * 0.5 + 0.5) * this.container.clientHeight;
//     if (vector.z < 1) {
//       label.style.left = `${x}px`;
//       label.style.top = `${y}px`;
//       label.style.display = "block";
//     } else {
//       label.style.display = "none";
//     }
//   }

//   updateLabels() {
//     this.objects.forEach((object, id) => {
//       const label = document.getElementById(`label-${id}`);
//       if (label) {
//         const worldPosition = new THREE.Vector3();
//         object.getWorldPosition(worldPosition);
//         if (object.userData.type === "block")
//           worldPosition.y += object.userData.dimensions.height + 50;
//         else if (object.userData.type === "rack")
//           worldPosition.y += object.userData.dimensions.height + 20;
//         this.updateLabelPosition(label, worldPosition);
//       }
//     });
//   }

//   convertToCentimeters(value, unit) {
//     const conversions = {
//       cm: 1.0,
//       m: 100.0,
//       km: 100000.0,
//       in: 2.54,
//       ft: 30.48,
//       yd: 91.44,
//       mi: 160934.4,
//     };
//     return value * (conversions[unit] || 1);
//   }

//   clearWarehouse() {
//     this.objects.forEach((obj, id) => {
//       if (obj.parent) obj.parent.remove(obj);
//       const label = document.getElementById(`label-${id}`);
//       if (label) label.remove();
//     });
//     this.objects.clear();
//     this.deselectObject();
//   }

//   toggleGrid() {
//     this.gridHelper.visible = !this.gridHelper.visible;
//   }
//   toggleLabels() {
//     this.labelsVisible = !this.labelsVisible;
//     this.labelContainer.style.display = this.labelsVisible ? "block" : "none";
//   }
//   toggleWalls() {
//     this.wallsVisible = !this.wallsVisible;
//     this.wallMeshes.forEach((w) => (w.visible = this.wallsVisible));
//   }

//   zoomIn() {
//     this.camera.position.multiplyScalar(0.9);
//     this.controls.update();
//   }
//   zoomOut() {
//     this.camera.position.multiplyScalar(1.1);
//     this.controls.update();
//   }
//   resetView() {
//     this.camera.position.set(4000, 3000, 4000);
//     this.controls.reset();
//     this.fitCameraToScene();
//   }
//   setTopView() {
//     this.camera.position.set(0, 10000, 0);
//     this.camera.lookAt(0, 0, 0);
//     this.controls.update();
//     this.fitCameraToScene();
//   }
//   setFrontView() {
//     this.camera.position.set(0, 3000, 10000);
//     this.camera.lookAt(0, 0, 0);
//     this.controls.update();
//     this.fitCameraToScene();
//   }
//   setSideView() {
//     this.camera.position.set(10000, 3000, 0);
//     this.camera.lookAt(0, 0, 0);
//     this.controls.update();
//     this.fitCameraToScene();
//   }
//   setInteractionMode(mode) {
//     this.interactionMode = mode;
//   }

//   animate() {
//     requestAnimationFrame(() => this.animate());
//     if (this.controls) this.controls.update();
//     if (this.labelsVisible) this.updateLabels();
//     if (this.renderer && this.scene && this.camera)
//       this.renderer.render(this.scene, this.camera);
//   }
//   // ... inside ThreeJSVisualizer class ...
//   clearWarehouse() {
//     // <--- Defined here
//     this.objects.forEach((obj, id) => {
//       if (obj.parent) obj.parent.remove(obj);
//       const label = document.getElementById(`label-${id}`);
//       if (label) label.remove();
//     });
//     this.objects.clear();
//     this.deselectObject();
//   }
//   // ...
// }

// document.addEventListener("DOMContentLoaded", () => {
//   // Small delay to ensure CSS layout settles before three.js init
//   setTimeout(() => {
//     window.visualizer = new ThreeJSVisualizer("3d-container");
//     // Notify app that visualizer is ready to receive layouts
//     try {
//       window.dispatchEvent(new Event("visualizer-ready"));
//     } catch (err) {
//       console.debug("Could not dispatch visualizer-ready event", err);
//     }
//   }, 100);
// });



// frontend/threejs-visualizer.js
class ThreeJSVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.objects = [];
        this.grid = null;
        this.axesHelper = null;
        this.labels = new Map();
        
        this.isGridVisible = true;
        this.areLabelsVisible = true;
        this.areWallsVisible = false;
        
        this.interactionMode = 'view';
        
        this.init();
    }
    
    init() {
        // Create Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);
        
        // Create Camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
        this.camera.position.set(2000, 1500, 2000);
        
        // Create Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Add Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 5000;
        
        // Add Lighting
        this.addLighting();
        
        // Add Grid and Axes
        this.addGrid();
        this.addAxes();
        
        // Add Event Listeners
        this.addEventListeners();
        
        // Start Animation Loop
        this.animate();
        
        // Trigger ready event
        window.dispatchEvent(new Event('visualizer-ready'));
    }
    
    addLighting() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional Light (like sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1000, 2000, 500);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Hemisphere Light for natural outdoor lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x98FB98, 0.3);
        this.scene.add(hemisphereLight);
    }
    
    addGrid() {
        const size = 10000;
        const divisions = 100;
        this.grid = new THREE.GridHelper(size, divisions, 0x000000, 0x888888);
        this.grid.position.y = 0.1; // Slightly above ground to prevent z-fighting
        this.scene.add(this.grid);
    }
    
    addAxes() {
        this.axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(this.axesHelper);
    }
    
    addEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Click event for object selection
        this.renderer.domElement.addEventListener('click', (event) => this.onObjectClick(event));
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    onObjectClick(event) {
        if (this.interactionMode !== 'view') return;
        
        const mouse = new THREE.Vector2();
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const intersects = raycaster.intersectObjects(this.objects, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const userData = this.findObjectUserData(object);
            
            if (userData) {
                this.selectObject(userData);
                if (window.warehouseApp) {
                    window.warehouseApp.updateSelectedInfo(userData);
                }
            }
        } else {
            this.selectObject(null);
            if (window.warehouseApp) {
                window.warehouseApp.updateSelectedInfo(null);
            }
        }
    }
    
    findObjectUserData(object) {
        while (object && !object.userData.type) {
            object = object.parent;
        }
        return object ? object.userData : null;
    }
    
    selectObject(object) {
        // Remove previous selection highlight
        this.objects.forEach(obj => {
            if (obj.userData && obj.userData.isSelected) {
                obj.userData.isSelected = false;
                if (obj.material && Array.isArray(obj.material)) {
                    obj.material.forEach(mat => {
                        if (mat.emissive) mat.emissive.setHex(0x000000);
                    });
                } else if (obj.material && obj.material.emissive) {
                    obj.material.emissive.setHex(0x000000);
                }
            }
        });
        
        // Highlight selected object
        if (object && object.object3D) {
            object.isSelected = true;
            const mesh = object.object3D;
            if (mesh.material && Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => {
                    if (mat.emissive) mat.emissive.setHex(0xffff00);
                });
            } else if (mesh.material && mesh.material.emissive) {
                mesh.material.emissive.setHex(0xffff00);
            }
        }
    }
    
    // ========== PALLET RENDERING METHOD ==========
    createPallet(palletData, rackPosition, rackDimensions) {
        if (!palletData) return null;
        
        const palletGroup = new THREE.Group();
        palletGroup.name = `pallet_${Math.random().toString(36).substr(2, 9)}`;
        
        // Pallet dimensions from data
        const palletLength = palletData.dimensions.length || 120;
        const palletWidth = palletData.dimensions.width || 100;
        const palletHeight = palletData.dimensions.height || 15;
        
        // Create pallet base
        const palletGeometry = new THREE.BoxGeometry(palletWidth, palletHeight, palletLength);
        const palletMaterial = new THREE.MeshPhongMaterial({ 
            color: palletData.color || "#8B4513",
            shininess: 30
        });
        const palletMesh = new THREE.Mesh(palletGeometry, palletMaterial);
        palletMesh.castShadow = true;
        palletMesh.receiveShadow = true;
        
        // Position pallet inside the rack (centered)
        // The pallet should sit on the rack floor
        palletMesh.position.set(
            0, // Center in rack width
            rackPosition.y + palletHeight/2, // On rack floor
            0  // Center in rack length
        );
        
        palletGroup.add(palletMesh);
        
        // Add stock on pallet if exists
        if (palletData.stock) {
            const stockLength = palletData.stock.dimensions.length || 40;
            const stockWidth = palletData.stock.dimensions.width || 30;
            const stockHeight = palletData.stock.dimensions.height || 20;
            
            const stockGeometry = new THREE.BoxGeometry(stockWidth, stockHeight, stockLength);
            const stockMaterial = new THREE.MeshPhongMaterial({ 
                color: palletData.stock.color || "#FF0000",
                shininess: 50
            });
            const stockMesh = new THREE.Mesh(stockGeometry, stockMaterial);
            stockMesh.castShadow = true;
            stockMesh.receiveShadow = true;
            
            // Position stock on top of pallet
            stockMesh.position.set(
                0,
                palletHeight/2 + stockHeight/2,
                0
            );
            
            palletGroup.add(stockMesh);
        }
        
        // Add pallet legs (optional visual detail)
        const legHeight = palletHeight * 0.7;
        const legGeometry = new THREE.BoxGeometry(palletWidth * 0.1, legHeight, palletLength * 0.1);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4a3428 });
        
        const legPositions = [
            { x: -palletWidth * 0.35, z: -palletLength * 0.35 },
            { x: palletWidth * 0.35, z: -palletLength * 0.35 },
            { x: -palletWidth * 0.35, z: palletLength * 0.35 },
            { x: palletWidth * 0.35, z: palletLength * 0.35 }
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos.x, -palletHeight/2 - legHeight/2, pos.z);
            leg.castShadow = true;
            palletGroup.add(leg);
        });
        
        // Position the entire pallet group at rack position
        palletGroup.position.copy(rackPosition);
        
        // Store user data for interaction
        palletGroup.userData = {
            type: 'pallet',
            palletType: palletData.type,
            weight: palletData.weight,
            dimensions: palletData.dimensions,
            hasStock: !!palletData.stock,
            object3D: palletGroup
        };
        
        return palletGroup;
    }
    
    createRack(rackData, blockIndex, blockColor) {
        const rackGroup = new THREE.Group();
        rackGroup.name = rackData.id;
        
        const rackWidth = rackData.dimensions.width || 400;
        const rackLength = rackData.dimensions.length || 2325;
        const rackHeight = rackData.dimensions.height || 267;
        
        // Rack frame color
        const frameColor = blockColor || 0x666666;
        const shelfColor = 0x888888;
        
        // Create vertical columns
        const columnWidth = rackWidth * 0.05;
        const columnDepth = rackLength * 0.05;
        
        // Front left column
        const column1 = new THREE.Mesh(
            new THREE.BoxGeometry(columnWidth, rackHeight, columnDepth),
            new THREE.MeshPhongMaterial({ color: frameColor })
        );
        column1.position.set(-rackWidth/2 + columnWidth/2, rackHeight/2, -rackLength/2 + columnDepth/2);
        column1.castShadow = true;
        column1.receiveShadow = true;
        rackGroup.add(column1);
        
        // Front right column
        const column2 = column1.clone();
        column2.position.set(rackWidth/2 - columnWidth/2, rackHeight/2, -rackLength/2 + columnDepth/2);
        rackGroup.add(column2);
        
        // Back left column
        const column3 = column1.clone();
        column3.position.set(-rackWidth/2 + columnWidth/2, rackHeight/2, rackLength/2 - columnDepth/2);
        rackGroup.add(column3);
        
        // Back right column
        const column4 = column1.clone();
        column4.position.set(rackWidth/2 - columnWidth/2, rackHeight/2, rackLength/2 - columnDepth/2);
        rackGroup.add(column4);
        
        // Create shelves (horizontal beams)
        const shelfThickness = 5;
        const shelfGeometry = new THREE.BoxGeometry(rackWidth, shelfThickness, rackLength);
        const shelfMaterial = new THREE.MeshPhongMaterial({ color: shelfColor });
        
        // Create shelves at each floor level
        const floorHeight = rackHeight / (rackData.floor || 3);
        for (let i = 0; i <= (rackData.floor || 3); i++) {
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.set(0, i * floorHeight, 0);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            rackGroup.add(shelf);
        }
        
        // Create back and side panels
        const panelThickness = 2;
        const backPanel = new THREE.Mesh(
            new THREE.BoxGeometry(rackWidth, rackHeight, panelThickness),
            new THREE.MeshPhongMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
        );
        backPanel.position.set(0, rackHeight/2, rackLength/2 - panelThickness/2);
        backPanel.castShadow = true;
        rackGroup.add(backPanel);
        
        // Position the entire rack
        rackGroup.position.set(
            rackData.position.x,
            rackData.position.y,
            rackData.position.z
        );
        
        // Create pallet if exists
        if (rackData.pallet) {
            const palletGroup = this.createPallet(rackData.pallet, rackData.position, rackData.dimensions);
            if (palletGroup) {
                rackGroup.add(palletGroup);
                
                // Store reference to pallet in rack's user data
                rackGroup.userData.pallet = palletGroup.userData;
            }
        }
        
        // Store user data for interaction
        rackGroup.userData = {
            type: 'rack',
            id: rackData.id,
            floor: rackData.floor,
            row: rackData.row,
            column: rackData.column,
            blockId: blockIndex,
            dimensions: rackData.dimensions,
            hasPallet: !!rackData.pallet,
            object3D: rackGroup
        };
        
        return rackGroup;
    }
    
    createBlock(blockData) {
        const blockGroup = new THREE.Group();
        blockGroup.name = blockData.id;
        
        const blockWidth = blockData.dimensions.width;
        const blockLength = blockData.dimensions.length;
        const blockHeight = blockData.dimensions.height;
        
        // Create block floor (transparent)
        const floorGeometry = new THREE.BoxGeometry(blockWidth, 5, blockLength);
        const floorMaterial = new THREE.MeshPhongMaterial({ 
            color: blockData.color,
            transparent: true,
            opacity: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(0, 2.5, 0);
        floor.receiveShadow = true;
        blockGroup.add(floor);
        
        // Create block boundary (optional wireframe)
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(blockWidth, blockHeight, blockLength));
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
            color: blockData.color,
            linewidth: 1,
            transparent: true,
            opacity: 0.3
        }));
        blockGroup.add(line);
        
        // Create racks
        blockData.racks.forEach(rackData => {
            const rackGroup = this.createRack(rackData, blockData.id, blockData.color);
            if (rackGroup) {
                blockGroup.add(rackGroup);
                this.objects.push(rackGroup);
            }
        });
        
        // Position the block
        blockGroup.position.set(
            blockData.position.x,
            blockData.position.y,
            blockData.position.z
        );
        
        // Store user data
        blockGroup.userData = {
            type: 'block',
            id: blockData.id,
            name: blockData.name,
            dimensions: blockData.dimensions,
            color: blockData.color,
            object3D: blockGroup
        };
        
        return blockGroup;
    }
    
    renderWarehouse(layout) {
        console.log("Rendering warehouse layout...", layout);
        
        // Clear existing objects
        this.clearWarehouse();
        
        // Hide "no layout" message
        document.getElementById("no-layout-message").style.display = "none";
        
        // Create warehouse blocks
        layout.blocks.forEach(blockData => {
            const blockGroup = this.createBlock(blockData);
            if (blockGroup) {
                this.scene.add(blockGroup);
                this.objects.push(blockGroup);
                
                // Log pallet information for debugging
                blockData.racks.forEach(rack => {
                    if (rack.pallet) {
                        console.log(`Created pallet for ${rack.id}:`, rack.pallet);
                    }
                });
            }
        });
        
        // Add labels
        if (this.areLabelsVisible) {
            this.addLabels(layout);
        }
        
        // Fit camera to scene
        this.fitCameraToScene();
        
        console.log(`Rendering complete. Total objects: ${this.objects.length}`);
    }
    
    addLabels(layout) {
        // Clear existing labels
        this.labels.forEach(label => this.scene.remove(label));
        this.labels.clear();
        
        // Add block labels
        layout.blocks.forEach((block, index) => {
            // Create label at top of block
            const labelPosition = new THREE.Vector3(
                block.position.x,
                block.dimensions.height + 100,
                block.position.z
            );
            
            this.createTextLabel(block.name, labelPosition, block.color);
        });
    }
    
    createTextLabel(text, position, color = '#ffffff') {
        // Simple implementation - you might want to use Sprite or CSS2DRenderer for better text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'bold 24px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(200, 100, 1);
        
        this.scene.add(sprite);
        this.labels.set(text, sprite);
    }
    
    fitCameraToScene() {
        const box = new THREE.Box3().setFromObject(this.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
        
        cameraZ *= 1.5; // Add some padding
        
        this.camera.position.set(center.x, center.y + cameraZ * 0.5, center.z + cameraZ);
        this.camera.lookAt(center);
        
        this.controls.target.copy(center);
        this.controls.update();
    }
    
    clearWarehouse() {
        // Remove all warehouse objects
        this.objects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.objects = [];
        
        // Remove labels
        this.labels.forEach(label => {
            this.scene.remove(label);
        });
        this.labels.clear();
        
        // Show "no layout" message
        document.getElementById("no-layout-message").style.display = "flex";
    }
    
    toggleGrid() {
        this.isGridVisible = !this.isGridVisible;
        this.grid.visible = this.isGridVisible;
    }
    
    toggleLabels() {
        this.areLabelsVisible = !this.areLabelsVisible;
        this.labels.forEach(label => {
            label.visible = this.areLabelsVisible;
        });
    }
    
    toggleWalls() {
        this.areWallsVisible = !this.areWallsVisible;
        // Toggle wall visibility for all blocks
        this.objects.forEach(obj => {
            if (obj.userData && obj.userData.type === 'block') {
                obj.children.forEach(child => {
                    if (child.type === 'LineSegments') {
                        child.visible = this.areWallsVisible;
                    }
                });
            }
        });
    }
    
    setInteractionMode(mode) {
        this.interactionMode = mode;
    }
    
    zoomIn() {
        this.camera.position.multiplyScalar(0.9);
        this.controls.update();
    }
    
    zoomOut() {
        this.camera.position.multiplyScalar(1.1);
        this.controls.update();
    }
    
    resetView() {
        this.camera.position.set(2000, 1500, 2000);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    setTopView() {
        const box = new THREE.Box3().setFromObject(this.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        this.camera.position.set(center.x, center.y + Math.max(size.x, size.z) * 1.5, center.z);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }
    
    setFrontView() {
        const box = new THREE.Box3().setFromObject(this.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        this.camera.position.set(center.x, center.y + size.y * 0.5, center.z - Math.max(size.x, size.y) * 1.5);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }
    
    setSideView() {
        const box = new THREE.Box3().setFromObject(this.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        this.camera.position.set(center.x + Math.max(size.y, size.z) * 1.5, center.y + size.y * 0.5, center.z);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize visualizer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ThreeJSVisualizer('3d-container');
});
