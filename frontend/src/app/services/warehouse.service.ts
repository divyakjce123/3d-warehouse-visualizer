import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WarehouseConfig } from '../models/warehouse.models';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = 'http://localhost:5000/api/warehouse';

  constructor(private http: HttpClient) { }

  createWarehouse(config: WarehouseConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, config);
  }

  // Helper to generate a default block configuration
  getDefaultBlockConfig(index: number): BlockConfig {
    return {
      block_index: index,
      collapsed: false,
      rack_config: {
        num_floors: 3, num_rows: 2, num_racks: 6, custom_gaps: [], gap_unit: 'cm',
        gap_front: 100, gap_back: 100, gap_left: 50, gap_right: 50, wall_gap_unit: 'cm'
      },
      pallet_config: {
        type: 'wooden', weight: 20, length: 120, width: 100, height: 15, unit: 'cm', color: '#8B4513'
      },
      stock_config: {
        type: 'hell_classic', length: 40, width: 30, height: 20, unit: 'cm', color: '#FF6B6B',
        position: { floor: 1, row: 1, col: 1 }
      }
    };
  }
}