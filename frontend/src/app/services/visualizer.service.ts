import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Injectable({
  providedIn: 'root'
})
export class VisualizerService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private objects: THREE.Object3D[] = [];
  private labels: Map<string, THREE.Sprite> = new Map();
  private animationId: number | null = null;
  private container!: HTMLElement;

  constructor(private ngZone: NgZone) {}

  initialize(container: HTMLElement): void {
    this.container = container;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    // Camera
    const { clientWidth: width, clientHeight: height } = this.container;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    this.camera.position.set(4000, 3000, 4000);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.addLighting();
    this.addGrid();

    // Start Loop outside Angular zone to prevent change detection overhead
    this.ngZone.runOutsideAngular(() => this.animate());
    
    window.addEventListener('resize', () => this.onResize());
  }

  private addLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 2000, 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.far = 100000;
    dirLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(dirLight);
  }

  private addGrid(): void {
    const grid = new THREE.GridHelper(50000, 50, 0x000000, 0x000000);
    grid.position.y = 0.1;
    (grid.material as THREE.Material).opacity = 0.1;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);
  }

  renderWarehouse(layout: any): void {
    this.clearScene();
    
    // Floor
    const dims = layout.warehouse_dimensions;
    const floorGeo = new THREE.PlaneGeometry(dims.width, dims.length);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.objects.push(floor);

    // Blocks
    if (layout.blocks) {
      layout.blocks.forEach((block: any) => this.createBlock(block));
    }

    this.fitCameraToScene();
  }

  private createBlock(blockData: any): void {
    const group = new THREE.Group();
    const { width, length, height } = blockData.dimensions;
    const color = parseInt(blockData.color.replace('#', ''), 16);

    // Wireframe
    const geo = new THREE.BoxGeometry(width, height, length);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
    group.add(line);

    // Position
    group.position.set(blockData.position.x, blockData.position.y + height/2, blockData.position.z);
    
    // Racks
    blockData.racks.forEach((rack: any) => this.createRack(rack, group));

    this.scene.add(group);
    this.objects.push(group);
  }

  private createRack(rackData: any, parent: THREE.Group): void {
    const { width, height, length } = rackData.dimensions;
    const geo = new THREE.BoxGeometry(width, height, length);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2c5282, opacity: 0.7, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    
    mesh.position.set(rackData.position.x, rackData.position.y - parent.position.y + height/2, rackData.position.z);
    parent.add(mesh);
  }

  clearScene(): void {
    this.objects.forEach(obj => this.scene.remove(obj));
    this.objects = [];
  }

  fitCameraToScene(): void {
    const box = new THREE.Box3().setFromObject(this.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    this.camera.position.set(center.x + maxDim, center.y + maxDim, center.z + maxDim);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  onResize(): void {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', () => this.onResize());
    if (this.renderer) this.renderer.dispose();
  }
}