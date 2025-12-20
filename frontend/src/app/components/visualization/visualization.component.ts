import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  Input,
  OnChanges,
  OnDestroy,
  HostListener,
  EventEmitter,
  Output,
  SimpleChanges,
} from "@angular/core";
import {
  LayoutData,
  SubwarehouseData,
  RackData,
  PalletData,
  WarehouseConfig,
} from "../../models/warehouse.models";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

@Component({
  selector: "app-visualization",
  templateUrl: "./visualization.component.html",
  styleUrls: ["./visualization.component.css"],
})
export class VisualizationComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild("threeCanvas") threeCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild("twoCanvas") twoCanvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() layoutData!: LayoutData | null;
  @Input() warehouseDimensions: any;

  // External 3D/2D toggle from parent component
  private _is3DView: boolean = true;
  @Input()
  get is3DView(): boolean {
    return this._is3DView;
  }
  set is3DView(value: boolean) {
    this._is3DView = value;
    // Once view is initialized, keep internal mode in sync
    if (this.isViewInitialized) {
      this.switchView(value ? "3d" : "2d");
    }
  }

  @Input() warehouseConfig: WarehouseConfig | null = null;
  @Output() elementClicked = new EventEmitter<any>();
  @Output() palletClicked = new EventEmitter<any>();
  
  viewMode: "3d" | "2d" = "3d";

  // Three.js variables
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationFrameId!: number;
  private labelSprites: THREE.Sprite[] = [];

  // 2D Canvas variables
  private ctx!: CanvasRenderingContext2D;
  private isViewInitialized = false;
  private wireframeMode = false;

  // Warehouse dimensions from layout response
  private whWidth: number = 2000;
  private whLength: number = 3000;
  private whHeight: number = 800;

  // Configuration for "Image 2" Styling
  private readonly COLORS = {
    background: 0xf5f5f5,       // Light gray background
    gridPrimary: 0xaaaaaa,      // Main grid lines
    gridSecondary: 0xd0d0d0,    // Sub grid lines
    
    // Axis Colors
    axisX: 0xff0000, // Red
    axisY: 0x00ff00, // Green (Length)
    axisZ: 0x0000ff, // Blue (Height)
    text: 0x333333,

    // Rack Styling (Blue Transparent look)
    rackFill: 0x4a90d9,         // Steel Blue
    rackEdge: 0x1565c0,         // Darker Blue for edges
    rackShelf: 0x64b5f6,        // Lighter blue for shelves
    
    // Pallets
    palletWood: 0x8b4513,
    palletPlastic: 0x1e90ff,
    palletMetal: 0xa9a9a9,
  };

  ngAfterViewInit() {
    this.initialize3DView();
    this.initialize2DView();
    this.isViewInitialized = true;
    // Make sure initial internal view matches external toggle
    this.switchView(this.is3DView ? "3d" : "2d");
  }

  ngOnChanges(changes: SimpleChanges) {
    // Extract warehouse dimensions from layout data or config
    if (this.layoutData) {
      const layoutAny = this.layoutData as any;
      if (layoutAny.warehouse_dimensions) {
        this.whWidth = layoutAny.warehouse_dimensions.width || this.whWidth;
        this.whLength = layoutAny.warehouse_dimensions.length || this.whLength;
        this.whHeight = layoutAny.warehouse_dimensions.height || this.whHeight;
      }
    }
    
    // Fallback to warehouseConfig if dimensions not in layout
    if (this.warehouseConfig?.warehouse_dimensions) {
      const dim = this.warehouseConfig.warehouse_dimensions;
      const unitFactor = this.getUnitConversionFactor(dim.unit);
      this.whWidth = this.whWidth || dim.width * unitFactor;
      this.whLength = this.whLength || dim.length * unitFactor;
      this.whHeight = this.whHeight || dim.height * unitFactor;
    }

    if (this.isViewInitialized && this.layoutData) {
      if (this.viewMode === "3d") {
        this.update3DVisualization();
      } else {
        this.update2DVisualization();
      }
    }
  }

  private getUnitConversionFactor(unit: string): number {
    const factors: { [key: string]: number } = {
      'cm': 1, 'm': 100, 'mm': 0.1, 'ft': 30.48, 'in': 2.54, 'yd': 91.44
    };
    return factors[unit?.toLowerCase()] || 1;
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    // Clean up labels
    this.labelSprites.forEach(sprite => {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
  }

  @HostListener("window:resize")
  onResize() {
    if (this.threeCanvasRef?.nativeElement) {
      const canvas = this.threeCanvasRef.nativeElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    if (this.twoCanvasRef?.nativeElement) {
      this.update2DVisualization();
    }
  }

  // ============ 3D VISUALIZATION ============

  private initialize3DView() {
    const canvas = this.threeCanvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.COLORS.background);

    // 2. Camera Setup (Z-Up Configuration)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 50000);
    this.camera.up.set(0, 0, 1); // IMPORTANT: Sets Z as the "Up" axis
    this.camera.position.set(2000, -2000, 2000); // Isometric-ish view
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going below ground

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1000, -2000, 3000); // Light from top-front-left
    dirLight.castShadow = true;
    // Optimize shadow map
    dirLight.shadow.camera.left = -5000;
    dirLight.shadow.camera.right = 5000;
    dirLight.shadow.camera.top = 5000;
    dirLight.shadow.camera.bottom = -5000;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // 6. Helpers
    this.setupEnvironment();

    this.animate();
  }

  private setupEnvironment() {
    // Remove existing ground, grid, and axis indicators if they exist
    const existingGround = this.scene.getObjectByName('ground-plane');
    const existingGrid = this.scene.getObjectByName('grid-helper');
    const existingAxisX = this.scene.getObjectByName('axis-x');
    const existingAxisY = this.scene.getObjectByName('axis-y');
    const existingAxisZ = this.scene.getObjectByName('axis-z');
    
    if (existingGround) this.scene.remove(existingGround);
    if (existingGrid) this.scene.remove(existingGrid);
    if (existingAxisX) this.scene.remove(existingAxisX);
    if (existingAxisY) this.scene.remove(existingAxisY);
    if (existingAxisZ) this.scene.remove(existingAxisZ);
    
    // Clean up old label sprites
    this.labelSprites.forEach(sprite => {
      this.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
    this.labelSprites = [];

    // Calculate grid size to be larger than warehouse
    // Grid should extend beyond warehouse in all directions
    const padding = Math.max(500, Math.max(this.whWidth, this.whLength) * 0.2);
    const gridWidth = this.whWidth + padding * 2;
    const gridLength = this.whLength + padding * 2;
    const gridSize = Math.max(gridWidth, gridLength);
    
    // Calculate divisions based on warehouse size (grid lines every 500cm or appropriate spacing)
    const gridSpacing = Math.max(100, Math.min(500, gridSize / 20));
    const gridDivisions = Math.ceil(gridSize / gridSpacing);

    // Create a ground plane at Z=0
    const groundGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMat = new THREE.MeshBasicMaterial({ 
      color: 0xf5f5f5, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2; // Rotate to lie flat on XY plane
    // Center the ground around the warehouse center
    ground.position.set(this.whWidth / 2, this.whLength / 2, -1);
    ground.name = 'ground-plane';
    this.scene.add(ground);

    // Grid Helper - positioned to cover warehouse area and beyond
    const gridHelper = new THREE.GridHelper(
      gridSize, 
      gridDivisions, 
      this.COLORS.gridPrimary, 
      this.COLORS.gridSecondary
    );
    // GridHelper by default is on XZ plane, rotate to XY plane for Z-up
    gridHelper.rotation.x = Math.PI / 2;
    // Center the grid around the warehouse center
    gridHelper.position.set(this.whWidth / 2, this.whLength / 2, 0);
    gridHelper.name = 'grid-helper';
    this.scene.add(gridHelper);

    // Axis Helper
    this.addAxisIndicators();
  }

  private addAxisIndicators() {
    const origin = new THREE.Vector3(0, 0, 0);
    const length = Math.min(this.whWidth, this.whLength, this.whHeight) * 0.3;
    const headLength = length * 0.15;
    const headWidth = length * 0.08;

    // X Axis (Width) - Red
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, length, this.COLORS.axisX, headLength, headWidth);
    arrowX.name = 'axis-x';
    
    // Y Axis (Length) - Green
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, length, this.COLORS.axisY, headLength, headWidth);
    arrowY.name = 'axis-y';
    
    // Z Axis (Height) - Blue
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, length, this.COLORS.axisZ, headLength, headWidth);
    arrowZ.name = 'axis-z';

    this.scene.add(arrowX, arrowY, arrowZ);

    // Labels
    this.addLabel("Width (cm) X", new THREE.Vector3(length + 100, 0, 0));
    this.addLabel("Length (cm) Y", new THREE.Vector3(0, length + 100, 0));
    this.addLabel("Height (cm) Z", new THREE.Vector3(0, 0, length + 100));
  }

  private addLabel(text: string, position: THREE.Vector3, options?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    scale?: number;
    addToScene?: boolean;
  }): THREE.Sprite {
    const opts = {
      color: '#333333',
      backgroundColor: 'transparent',
      fontSize: 32,
      scale: 200,
      addToScene: true,
      ...options
    };

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Background
    if (opts.backgroundColor !== 'transparent') {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.fillStyle = opts.color;
    ctx.font = `bold ${opts.fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(position);
    sprite.scale.set(opts.scale, opts.scale * 0.25, 1);
    
    if (opts.addToScene) {
      this.scene.add(sprite);
      this.labelSprites.push(sprite);
    }
    
    return sprite;
  }

  private createTextSprite(text: string, options?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    borderColor?: string;
    padding?: number;
  }): THREE.Sprite {
    const opts = {
      color: '#ffffff',
      backgroundColor: '#1565c0',
      fontSize: 24,
      borderColor: '#0d47a1',
      padding: 8,
      ...options
    };

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw rounded rectangle background
    const radius = 8;
    ctx.fillStyle = opts.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, radius);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = opts.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Text
    ctx.fillStyle = opts.color;
    ctx.font = `bold ${opts.fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    return new THREE.Sprite(material);
  }

  private update3DVisualization() {
    if (!this.layoutData || !this.scene) return;

    // Clear previous warehouse objects
    const objToRemove = this.scene.getObjectByName("warehouse-objects");
    if (objToRemove) {
      this.scene.remove(objToRemove);
      // Dispose of geometries and materials
      objToRemove.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }

    // Update ground and grid to match new warehouse dimensions
    this.setupEnvironment();

    const mainGroup = new THREE.Group();
    mainGroup.name = "warehouse-objects";

    // 1. Draw Warehouse Floor Outline
    this.drawFloorBoundary(mainGroup);

    // 2. Draw Subwarehouses and Racks
    if (this.layoutData.subwarehouses) {
      this.layoutData.subwarehouses.forEach((subwarehouse) => {
        this.drawSubwarehouse(mainGroup, subwarehouse);
      });
    }

    this.scene.add(mainGroup);
    this.fitCameraToScene(mainGroup);
  }

  private drawFloorBoundary(group: THREE.Group) {
    const width = this.whWidth;   // X dimension
    const length = this.whLength; // Y dimension

    // Create warehouse floor outline as a dashed rectangle
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(width, 0, 0),
      new THREE.Vector3(width, length, 0),
      new THREE.Vector3(0, length, 0),
      new THREE.Vector3(0, 0, 0)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x333333,
      dashSize: 50,
      gapSize: 25,
      linewidth: 2
    });

    const boundaryLine = new THREE.Line(geometry, material);
    boundaryLine.computeLineDistances(); // Required for dashed lines
    boundaryLine.name = 'warehouse-boundary';
    group.add(boundaryLine);

    // Add corner markers
    const markerSize = Math.min(width, length) * 0.02;
    const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const cornerGeometry = new THREE.SphereGeometry(markerSize, 8, 8);
    
    [[0, 0], [width, 0], [width, length], [0, length]].forEach(([x, y]) => {
      const marker = new THREE.Mesh(cornerGeometry, cornerMaterial);
      marker.position.set(x, y, 0);
      group.add(marker);
    });
  }

  private drawSubwarehouse(group: THREE.Group, subwarehouse: SubwarehouseData) {
    // In Z-up coordinate system:
    // X = Width direction, Y = Length/Depth direction, Z = Height direction
    // Rack positions are already absolute (calculated by backend)
    
    const subwarehouseGroup = new THREE.Group();
    subwarehouseGroup.name = `subwarehouse-${subwarehouse.id}`;
    
    // Track unique floors, rows, and columns for labeling
    const uniqueFloors = new Set<number>();
    const uniqueRows = new Set<number>();
    const uniqueCols = new Set<number>();
    const racksByPosition: Map<string, RackData> = new Map();
    
    // Collect info about all racks
    subwarehouse.racks.forEach((rack) => {
      uniqueFloors.add(rack.indices.floor);
      uniqueRows.add(rack.indices.row);
      uniqueCols.add(rack.indices.col);
      racksByPosition.set(`${rack.indices.floor}-${rack.indices.row}-${rack.indices.col}`, rack);
    });
    
    // Draw each rack in the subwarehouse
    subwarehouse.racks.forEach((rack) => {
      this.drawRack(subwarehouseGroup, rack);
    });
    
    // Add Subwarehouse Label at the front-center-top
    if (subwarehouse.racks.length > 0) {
      const subwarehouseIndex = (subwarehouse as any).subwarehouse_index !== undefined ? (subwarehouse as any).subwarehouse_index + 1 : 
                         parseInt(subwarehouse.id.replace('subwarehouse_', '')) || 1;
      
      // Calculate subwarehouse bounds
      const subwarehouseBounds = this.calculateSubwarehouseBounds(subwarehouse.racks);
      
      // Subwarehouse label position - front center, above the subwarehouse
      const subwarehouseLabelPos = new THREE.Vector3(
        subwarehouseBounds.centerX,
        subwarehouseBounds.minY - 80,
        subwarehouseBounds.maxZ + 100
      );
      
      const subwarehouseLabel = this.createTextSprite(`Subwarehouse ${subwarehouseIndex}`, {
        backgroundColor: '#2196f3',
        borderColor: '#1565c0',
        color: '#ffffff',
        fontSize: 28
      });
      subwarehouseLabel.position.copy(subwarehouseLabelPos);
      subwarehouseLabel.scale.set(180, 45, 1);
      subwarehouseGroup.add(subwarehouseLabel);
      
      // Add Floor Labels (on the left side)
      this.addFloorLabels(subwarehouseGroup, subwarehouse.racks, subwarehouseBounds, uniqueFloors);
      
      // Add Row Labels (at the front)
      this.addRowLabels(subwarehouseGroup, subwarehouse.racks, subwarehouseBounds, uniqueRows);
      
      // Add Rack/Column Labels (at the top)
      this.addRackLabels(subwarehouseGroup, subwarehouse.racks, subwarehouseBounds, uniqueCols);
    }
    
    group.add(subwarehouseGroup);
  }

  private calculateSubwarehouseBounds(racks: RackData[]): {
    minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
    centerX: number; centerY: number; centerZ: number;
  } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    racks.forEach(rack => {
      const { x, y, z } = rack.position;
      const { width, length, height } = rack.dimensions;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + length);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z + height);
    });
    
    return {
      minX, maxX, minY, maxY, minZ, maxZ,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      centerZ: (minZ + maxZ) / 2
    };
  }

  private addFloorLabels(
    group: THREE.Group, 
    racks: RackData[], 
    bounds: any, 
    uniqueFloors: Set<number>
  ) {
    // Get floor heights by finding racks at each floor level
    const floorHeights: Map<number, number> = new Map();
    
    racks.forEach(rack => {
      const floor = rack.indices.floor;
      if (!floorHeights.has(floor)) {
        floorHeights.set(floor, rack.position.z + rack.dimensions.height / 2);
      }
    });
    
    // Create labels for each floor
    Array.from(uniqueFloors).sort((a, b) => a - b).forEach(floor => {
      const zPos = floorHeights.get(floor) || 0;
      
      const label = this.createTextSprite(`Floor ${floor}`, {
        backgroundColor: '#4caf50',
        borderColor: '#388e3c',
        color: '#ffffff',
        fontSize: 20
      });
      
      label.position.set(bounds.minX - 120, bounds.centerY, zPos);
      label.scale.set(140, 35, 1);
      group.add(label);
    });
  }

  private addRowLabels(
    group: THREE.Group, 
    racks: RackData[], 
    bounds: any, 
    uniqueRows: Set<number>
  ) {
    // Get row Y positions
    const rowPositions: Map<number, number> = new Map();
    
    racks.forEach(rack => {
      const row = rack.indices.row;
      if (!rowPositions.has(row)) {
        rowPositions.set(row, rack.position.y + rack.dimensions.length / 2);
      }
    });
    
    // Create labels for each row
    Array.from(uniqueRows).sort((a, b) => a - b).forEach(row => {
      const yPos = rowPositions.get(row) || 0;
      
      const label = this.createTextSprite(`Row ${row}`, {
        backgroundColor: '#ff9800',
        borderColor: '#f57c00',
        color: '#ffffff',
        fontSize: 20
      });
      
      label.position.set(bounds.minX - 120, yPos, bounds.minZ - 30);
      label.scale.set(120, 30, 1);
      group.add(label);
    });
  }

  private addRackLabels(
    group: THREE.Group, 
    racks: RackData[], 
    bounds: any, 
    uniqueCols: Set<number>
  ) {
    // Get rack/column X positions (only for ground floor to avoid clutter)
    const colPositions: Map<number, number> = new Map();
    
    racks.forEach(rack => {
      if (rack.indices.floor === 1) { // Only get positions from floor 1
        const col = rack.indices.col;
        if (!colPositions.has(col)) {
          colPositions.set(col, rack.position.x + rack.dimensions.width / 2);
        }
      }
    });
    
    // Create labels for each rack/column
    Array.from(uniqueCols).sort((a, b) => a - b).forEach(col => {
      const xPos = colPositions.get(col);
      if (xPos === undefined) return;
      
      const label = this.createTextSprite(`Rack ${col}`, {
        backgroundColor: '#9c27b0',
        borderColor: '#7b1fa2',
        color: '#ffffff',
        fontSize: 20
      });
      
      label.position.set(xPos, bounds.minY - 60, bounds.maxZ + 50);
      label.scale.set(120, 30, 1);
      group.add(label);
    });
  }

  private drawRack(group: THREE.Group, rack: RackData) {
    const { width, length, height } = rack.dimensions;
    const { x, y, z } = rack.position;

    // Create Rack Group
    const rackGroup = new THREE.Group();
    rackGroup.name = `rack-${rack.id}`;
    
    // Position at the corner (x, y, z), then offset by half dimensions
    // because BoxGeometry is centered at origin
    rackGroup.position.set(
      x + width / 2,
      y + length / 2,
      z + height / 2
    );

    // 1. Transparent Blue Body (Glass-like appearance)
    const geometry = new THREE.BoxGeometry(width, length, height);
    const material = new THREE.MeshPhysicalMaterial({
      color: this.COLORS.rackFill,
      transparent: true,
      opacity: 0.25,
      metalness: 0.0,
      roughness: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    rackGroup.add(cube);

    // 2. Solid Edges (Structural frame outline)
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: this.COLORS.rackEdge,
      linewidth: 1.5 
    });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    rackGroup.add(wireframe);

    // 3. Draw Pallets if present
    if (rack.pallets && rack.pallets.length > 0) {
      rack.pallets.forEach((pallet, index) => {
        this.drawPallet(rackGroup, pallet, width, length, height);
      });
    }

    group.add(rackGroup);
  }

  private drawPallet(
    rackGroup: THREE.Group, 
    pallet: PalletData, 
    rackWidth: number, 
    rackLength: number, 
    rackHeight: number
  ) {
    // Calculate pallet size - use actual dims or scale to fit rack
    const pw = pallet.dims?.width || rackWidth * 0.8;
    const pl = pallet.dims?.length || rackLength * 0.8;
    const ph = pallet.dims?.height || rackHeight * 0.6;
    
    const palletGeo = new THREE.BoxGeometry(
      Math.min(pw, rackWidth * 0.9),
      Math.min(pl, rackLength * 0.9),
      Math.min(ph, rackHeight * 0.8)
    );
    
    const palletMat = new THREE.MeshStandardMaterial({ 
      color: this.getPalletColor(pallet.color),
      roughness: 0.7,
      metalness: 0.1
    });
    
    const palletMesh = new THREE.Mesh(palletGeo, palletMat);
    // Position pallet at bottom-center of rack
    palletMesh.position.set(0, 0, -rackHeight/2 + ph/2 + 5);
    palletMesh.castShadow = true;
    palletMesh.receiveShadow = true;
    
    rackGroup.add(palletMesh);
  }

  private getPalletColor(colorName: string): number {
    // Handle hex color strings
    if (colorName?.startsWith('#')) {
      return parseInt(colorName.slice(1), 16);
    }
    
    const map: { [key: string]: number } = {
      wood: this.COLORS.palletWood,
      wooden: this.COLORS.palletWood,
      plastic: this.COLORS.palletPlastic,
      metal: this.COLORS.palletMetal,
      blue: 0x1e90ff,
      red: 0xff4444,
      green: 0x4caf50
    };
    return map[colorName?.toLowerCase()] || this.COLORS.palletWood;
  }

  private fitCameraToScene(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      // Use warehouse dimensions if no objects
      box.setFromCenterAndSize(
        new THREE.Vector3(this.whWidth/2, this.whLength/2, this.whHeight/2),
        new THREE.Vector3(this.whWidth, this.whLength, this.whHeight)
      );
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calculate camera distance based on FOV
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.tan(fov / 2)) * 1.2;

    // Position camera for isometric-like view (looking at center from corner)
    this.camera.position.set(
      center.x + cameraDistance * 0.7,
      center.y - cameraDistance * 0.7,
      center.z + cameraDistance * 0.6
    );
    
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    // Update labels to look at camera (billboarding)
    // Note: Sprites do this automatically, but if we used Mesh text we'd need this.
    this.renderer.render(this.scene, this.camera);
  }

  // ============ 2D VISUALIZATION ============
  
  private initialize2DView() {
    const canvas = this.twoCanvasRef?.nativeElement;
    if (!canvas) return;
    
    this.ctx = canvas.getContext("2d")!;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }

  private update2DVisualization() {
    if (!this.layoutData || !this.ctx || !this.twoCanvasRef) return;

    const canvas = this.twoCanvasRef.nativeElement;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Use stored warehouse dimensions
    const whWidth = this.whWidth;   // X dimension
    const whLength = this.whLength; // Y dimension

    const padding = 60;
    const scaleX = (canvasWidth - padding * 2) / whWidth;
    const scaleY = (canvasHeight - padding * 2) / whLength;
    const scale = Math.min(scaleX, scaleY);

    // Calculate offset to center the drawing
    const drawWidth = whWidth * scale;
    const drawHeight = whLength * scale;
    const offsetX = (canvasWidth - drawWidth) / 2;
    const offsetY = (canvasHeight - drawHeight) / 2;

    // 1. Draw Background Grid
    this.draw2DGrid(offsetX, offsetY, drawWidth, drawHeight, scale);

    // 2. Draw Warehouse Boundary
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([15, 8]);
    this.ctx.strokeRect(offsetX, offsetY, drawWidth, drawHeight);
    this.ctx.setLineDash([]);

    // 3. Draw Axis Labels
    this.draw2DAxisLabels(offsetX, offsetY, drawWidth, drawHeight, whWidth, whLength);

    // 4. Draw Subwarehouses & Racks with Labels
    if (this.layoutData.subwarehouses) {
      this.layoutData.subwarehouses.forEach((subwarehouse, subwarehouseIdx) => {
        // Track unique rows and columns for this subwarehouse
        const rowPositions: Map<number, number> = new Map();
        const colPositions: Map<number, number> = new Map();
        let subwarehouseMinX = Infinity, subwarehouseMaxX = -Infinity;
        let subwarehouseMinY = Infinity, subwarehouseMaxY = -Infinity;
        
        // First pass: collect positions and draw racks
        subwarehouse.racks.forEach(rack => {
          // Only consider floor 1 racks for 2D top-down view labels
          if (rack.indices.floor === 1) {
            const rX = offsetX + rack.position.x * scale;
            const rY = offsetY + rack.position.y * scale;
            const rW = rack.dimensions.width * scale;
            const rL = rack.dimensions.length * scale;

            // Track positions
            if (!rowPositions.has(rack.indices.row)) {
              rowPositions.set(rack.indices.row, rY + rL / 2);
            }
            if (!colPositions.has(rack.indices.col)) {
              colPositions.set(rack.indices.col, rX + rW / 2);
            }
            
            // Track subwarehouse bounds
            subwarehouseMinX = Math.min(subwarehouseMinX, rX);
            subwarehouseMaxX = Math.max(subwarehouseMaxX, rX + rW);
            subwarehouseMinY = Math.min(subwarehouseMinY, rY);
            subwarehouseMaxY = Math.max(subwarehouseMaxY, rY + rL);

            // Fill with semi-transparent blue
            this.ctx.fillStyle = "#4a90d9";
            this.ctx.globalAlpha = 0.35;
            this.ctx.fillRect(rX, rY, rW, rL);
            
            // Draw border
            this.ctx.globalAlpha = 1.0;
            this.ctx.strokeStyle = "#1565c0";
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(rX, rY, rW, rL);

            // Draw rack cell label (small)
            this.ctx.fillStyle = "#1565c0";
            this.ctx.font = "9px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(
              `R${rack.indices.row}C${rack.indices.col}`,
              rX + rW / 2,
              rY + rL / 2 + 3
            );

            // Draw pallets if present
            if (rack.pallets && rack.pallets.length > 0) {
              rack.pallets.forEach(pallet => {
                const palletMargin = Math.min(rW, rL) * 0.15;
                this.ctx.fillStyle = pallet.color || "#8B4513";
                this.ctx.globalAlpha = 0.7;
                this.ctx.fillRect(
                  rX + palletMargin,
                  rY + palletMargin,
                  rW - palletMargin * 2,
                  rL - palletMargin * 2
                );
                this.ctx.globalAlpha = 1.0;
              });
            }
          }
        });

        // Draw Subwarehouse Label (top)
        if (subwarehouseMinX !== Infinity) {
          const subwarehouseCenterX = (subwarehouseMinX + subwarehouseMaxX) / 2;
          
          // Subwarehouse label
          this.draw2DLabel(
            `Subwarehouse ${subwarehouseIdx + 1}`,
            subwarehouseCenterX,
            subwarehouseMinY - 25,
            { backgroundColor: '#2196f3', color: '#ffffff', fontSize: 12, padding: 6 }
          );
          
          // Row labels (left side)
          Array.from(rowPositions.entries()).sort((a, b) => a[0] - b[0]).forEach(([row, yPos]) => {
            this.draw2DLabel(
              `Row ${row}`,
              subwarehouseMinX - 35,
              yPos,
              { backgroundColor: '#ff9800', color: '#ffffff', fontSize: 10, padding: 4 }
            );
          });
          
          // Rack/Column labels (top)
          Array.from(colPositions.entries()).sort((a, b) => a[0] - b[0]).forEach(([col, xPos]) => {
            this.draw2DLabel(
              `Rack ${col}`,
              xPos,
              subwarehouseMinY - 8,
              { backgroundColor: '#9c27b0', color: '#ffffff', fontSize: 9, padding: 3 }
            );
          });
        }
      });
    }
  }

  private draw2DLabel(
    text: string,
    x: number,
    y: number,
    options: { backgroundColor: string; color: string; fontSize: number; padding: number }
  ) {
    this.ctx.font = `bold ${options.fontSize}px Arial`;
    const textWidth = this.ctx.measureText(text).width;
    const labelWidth = textWidth + options.padding * 2;
    const labelHeight = options.fontSize + options.padding * 2;
    
    // Draw background (fallback if roundRect is not supported)
    this.ctx.fillStyle = options.backgroundColor;
    this.ctx.beginPath();
    const rectX = x - labelWidth / 2;
    const rectY = y - labelHeight / 2;
    const radius = 4;
    const anyCtx: any = this.ctx as any;
    if (typeof anyCtx.roundRect === "function") {
      anyCtx.roundRect(rectX, rectY, labelWidth, labelHeight, radius);
    } else {
      // Simple manually-rounded rectangle
      this.ctx.moveTo(rectX + radius, rectY);
      this.ctx.lineTo(rectX + labelWidth - radius, rectY);
      this.ctx.quadraticCurveTo(
        rectX + labelWidth,
        rectY,
        rectX + labelWidth,
        rectY + radius
      );
      this.ctx.lineTo(rectX + labelWidth, rectY + labelHeight - radius);
      this.ctx.quadraticCurveTo(
        rectX + labelWidth,
        rectY + labelHeight,
        rectX + labelWidth - radius,
        rectY + labelHeight
      );
      this.ctx.lineTo(rectX + radius, rectY + labelHeight);
      this.ctx.quadraticCurveTo(
        rectX,
        rectY + labelHeight,
        rectX,
        rectY + labelHeight - radius
      );
      this.ctx.lineTo(rectX, rectY + radius);
      this.ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
    }
    this.ctx.fill();
    
    // Draw text
    this.ctx.fillStyle = options.color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  private draw2DGrid(offsetX: number, offsetY: number, width: number, height: number, scale: number) {
    const gridSpacing = 500; // Grid every 500cm
    const gridSpacingScaled = gridSpacing * scale;
    
    // Extend grid beyond warehouse boundaries
    const gridPadding = gridSpacingScaled * 2;
    const gridStartX = offsetX - gridPadding;
    const gridEndX = offsetX + width + gridPadding;
    const gridStartY = offsetY - gridPadding;
    const gridEndY = offsetY + height + gridPadding;
    
    this.ctx.strokeStyle = "#e0e0e0";
    this.ctx.lineWidth = 0.5;
    
    // Vertical grid lines - extend beyond warehouse
    const startXGrid = Math.floor(gridStartX / gridSpacingScaled) * gridSpacingScaled;
    for (let x = startXGrid; x <= gridEndX; x += gridSpacingScaled) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, gridStartY);
      this.ctx.lineTo(x, gridEndY);
      this.ctx.stroke();
    }
    
    // Horizontal grid lines - extend beyond warehouse
    const startYGrid = Math.floor(gridStartY / gridSpacingScaled) * gridSpacingScaled;
    for (let y = startYGrid; y <= gridEndY; y += gridSpacingScaled) {
      this.ctx.beginPath();
      this.ctx.moveTo(gridStartX, y);
      this.ctx.lineTo(gridEndX, y);
      this.ctx.stroke();
    }
  }

  private draw2DAxisLabels(
    offsetX: number, offsetY: number, 
    width: number, height: number,
    whWidth: number, whLength: number
  ) {
    this.ctx.fillStyle = "#333";
    this.ctx.font = "12px Arial";
    
    // X-axis label (Width)
    this.ctx.textAlign = "center";
    this.ctx.fillText(`Width: ${whWidth.toFixed(0)} cm`, offsetX + width / 2, offsetY + height + 30);
    
    // Y-axis label (Length) - rotated
    this.ctx.save();
    this.ctx.translate(offsetX - 30, offsetY + height / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.textAlign = "center";
    this.ctx.fillText(`Length: ${whLength.toFixed(0)} cm`, 0, 0);
    this.ctx.restore();

    // Scale indicators at corners
    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#666";
    this.ctx.textAlign = "left";
    this.ctx.fillText("0", offsetX - 15, offsetY + height + 15);
    this.ctx.textAlign = "right";
    this.ctx.fillText(`${whWidth.toFixed(0)}`, offsetX + width + 5, offsetY + height + 15);
  }

  // ============ PUBLIC METHODS ============

  switchView(mode: "3d" | "2d") {
    this.viewMode = mode;
    setTimeout(() => {
      if (mode === "3d" && this.layoutData) {
        this.update3DVisualization();
      } else if (mode === "2d" && this.layoutData) {
        this.update2DVisualization();
      }
      this.onResize();
    }, 0);
  }

  resetCamera() {
    if (this.camera && this.controls) {
      // Reset to default Isometric view
      this.fitCameraToScene(this.scene.getObjectByName("warehouse-objects") || this.scene);
    }
  }

  toggleWireframe() {
    this.wireframeMode = !this.wireframeMode;
    if (this.layoutData) {
      this.update3DVisualization();
    }
  }

  onCanvasClick(event: MouseEvent) {
    // Keep existing click logic for 2D...
    if (this.viewMode === "2d") {
        // Implementation similar to previous logic
    }
  }
}