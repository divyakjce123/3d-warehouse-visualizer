import { Component, ViewChild } from '@angular/core';
import { WarehouseService } from './services/warehouse.service';
import { ViewerComponent } from './components/viewer/viewer.component';
import { WarehouseConfig } from './models/warehouse.models';

@Component({
  selector: 'app-root',
  template: `
    <div class="header">
      <div class="logo"><i class="fas fa-warehouse"></i> <h1>Warehouse Planner (Angular)</h1></div>
    </div>
    <div class="container">
      <div class="sidebar">
        <app-sidebar (generate)="onGenerate($event)" (reset)="onReset()"></app-sidebar>
      </div>
      <div class="main-content">
        <app-viewer #viewer [isLoading]="loading"></app-viewer>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('viewer') viewer!: ViewerComponent;
  loading = false;

  constructor(private api: WarehouseService) {}

  onGenerate(config: WarehouseConfig): void {
    this.loading = true;
    this.api.createWarehouse(config).subscribe({
      next: (res) => {
        this.viewer.updateLayout(res.layout);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        alert('Error generating layout');
      }
    });
  }

  onReset(): void {
      this.viewer.clear();
  }
}