import { Component, ElementRef, Input, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { VisualizerService } from '../../services/visualizer.service';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css']
})
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef;
  @Input() isLoading = false;
  
  hasLayout = false;
  isGridVisible = true;
  areLabelsVisible = true;
  areWallsVisible = false;

  constructor(private visualizer: VisualizerService) {}

  ngAfterViewInit(): void {
    this.visualizer.initialize(this.rendererContainer.nativeElement);
  }

  ngOnDestroy(): void {
    this.visualizer.destroy();
  }

  updateLayout(layout: any): void {
    this.hasLayout = true;
    this.visualizer.renderWarehouse(layout);
  }

  clear(): void {
    this.hasLayout = false;
    this.visualizer.clearScene();
  }

  // --- View Control Methods ---

  toggleGrid(): void {
    this.isGridVisible = !this.isGridVisible;
    // Note: You might need to expose a toggleGrid method in VisualizerService
    // or access the property directly if you make grid public.
    // Ideally, add this method to VisualizerService:
    // toggleGrid(visible: boolean) { if(this.grid) this.grid.visible = visible; }
    this.visualizer['toggleGrid'](this.isGridVisible); 
  }

  toggleLabels(): void {
    this.areLabelsVisible = !this.areLabelsVisible;
    this.visualizer['toggleLabels'](this.areLabelsVisible);
  }

  toggleWalls(): void {
    this.areWallsVisible = !this.areWallsVisible;
    this.visualizer['toggleWalls'](this.areWallsVisible);
  }

  zoomIn(): void { this.visualizer['zoomIn'](); }
  zoomOut(): void { this.visualizer['zoomOut'](); }
  resetView(): void { this.visualizer['resetView'](); }
  setTopView(): void { this.visualizer['setTopView'](); }
  setFrontView(): void { this.visualizer['setFrontView'](); }
  setSideView(): void { this.visualizer['setSideView'](); }
}