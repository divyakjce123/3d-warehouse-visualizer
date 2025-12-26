import math

class WarehouseCalculator:
    def __init__(self):
        self.conversion_factors = {
            'cm': 1.0, 'm': 100.0, 'km': 100000.0,
            'in': 2.54, 'ft': 30.48, 'yd': 91.44, 'mm': 0.1
        }
        # Minimal "sensible" sizes (in cm) used for validation
        self.MIN_RACK_WIDTH_CM = 1.0      # > 0 so aisles are not collapsed
        self.MIN_RACK_LENGTH_CM = 1.0
        self.MIN_FLOOR_HEIGHT_CM = 10.0   # avoid unrealistically thin floors
    
    def to_cm(self, value, unit):
        """Converts a value from a given unit to centimeters."""
        if value is None: return 0.0
        try:
            val = float(value)
        except ValueError:
            return 0.0
        return val * self.conversion_factors.get(unit.lower(), 1.0)
    
    def create_warehouse_layout(self, config):
        """
        Calculates the physical layout of the warehouse based on the configuration.
        Returns a JSON-serializable dictionary representing the 3D layout.
        
        Coordinate System (Z-Up):
        - X axis: Width direction (horizontal)
        - Y axis: Length/Depth direction (into the warehouse)
        - Z axis: Height direction (vertical, up)
        
        All positions use positive coordinates starting from origin (0,0,0).
        """
        wh_dim = config['warehouse_dimensions']
        W = self.to_cm(wh_dim['width'], wh_dim['unit'])   # X dimension
        L = self.to_cm(wh_dim['length'], wh_dim['unit'])  # Y dimension
        H = self.to_cm(wh_dim['height'], wh_dim['unit'])  # Z dimension

        if W <= 0 or L <= 0 or H <= 0:
            raise ValueError("Warehouse dimensions must be greater than zero.")
        
        n_workstations = config['num_workstations']
        bg = self.to_cm(config['workstation_gap'], config['workstation_gap_unit'])
        if n_workstations <= 0:
            raise ValueError("Number of workstations must be at least 1.")
        if bg < 0:
            raise ValueError("Workstation gap cannot be negative.")
        
        # Calculate workstation width - workstations are distributed along X axis
        total_gaps = bg * (n_workstations - 1) if n_workstations > 1 else 0
        if total_gaps >= W:
            raise ValueError(
                "Total workstation gaps are greater than or equal to warehouse width. "
                "Reduce workstation gap or number of workstations, or increase warehouse width."
            )
        workstation_w = (W - total_gaps) / n_workstations if n_workstations > 0 else 0
        if workstation_w <= 0:
            raise ValueError(
                "Computed workstation width is not positive. "
                "Check warehouse width, workstation gap and number of workstations."
            )
        
        workstations_data = []
        
        for i, b_conf in enumerate(config['workstation_configs']):
            # Workstation starting X position (positive coordinates)
            workstation_start_x = i * (workstation_w + bg)
            
            rc = b_conf['aisle_config']
            gf = self.to_cm(rc['gap_front'], rc['wall_gap_unit'])
            gb = self.to_cm(rc['gap_back'], rc['wall_gap_unit'])
            gl = self.to_cm(rc['gap_left'], rc['wall_gap_unit'])
            gr = self.to_cm(rc['gap_right'], rc['wall_gap_unit'])
            
            # Available space within workstation after wall gaps
            avail_w = workstation_w - gl - gr  # Available width for aisles
            avail_l = L - gf - gb        # Available length for rows

            if avail_w <= 0:
                raise ValueError(
                    f"Workstation {i+1}: wall gaps (left/right) consume all width. "
                    "Reduce left/right wall gaps or increase warehouse width."
                )
            if avail_l <= 0:
                raise ValueError(
                    f"Workstation {i+1}: wall gaps (front/back) consume all length. "
                    "Reduce front/back wall gaps or increase warehouse length."
                )
            
            rows = rc['num_rows']
            floors = rc['num_floors']
            num_aisles = rc['num_aisles']

            if rows <= 0:
                raise ValueError(f"Workstation {i+1}: number of rows must be at least 1.")
            if floors <= 0:
                raise ValueError(f"Workstation {i+1}: number of floors must be at least 1.")
            if num_aisles <= 0:
                raise ValueError(f"Workstation {i+1}: number of aisles must be at least 1.")
            
            # Custom gaps between aisles (columns)
            custom_gaps = [self.to_cm(g, rc['wall_gap_unit']) for g in rc.get('custom_gaps', [])]
            total_custom_gaps = sum(custom_gaps[:num_aisles-1]) if custom_gaps and num_aisles > 1 else 0

            if total_custom_gaps >= avail_w:
                raise ValueError(
                    f"Workstation {i+1}: sum of aisle gaps ({total_custom_gaps:.2f} cm) "
                    f"is greater than or equal to available workstation width ({avail_w:.2f} cm). "
                    "Reduce aisle gaps, reduce number of aisles, or increase warehouse width."
                )
            
            # Calculate aisle dimensions
            aisle_w = (avail_w - total_custom_gaps) / num_aisles if num_aisles > 0 else 0
            aisle_l = avail_l / rows if rows > 0 else 0
            floor_h = H / floors if floors > 0 else 0

            # --- Validation for aisle dimensions and height ---
            if aisle_w < self.MIN_RACK_WIDTH_CM:
                raise ValueError(
                    f"Workstation {i+1}: aisle width ({aisle_w:.2f} cm) is too small. "
                    "Decrease number of aisles or aisle gaps, or increase warehouse width."
                )
            if aisle_l < self.MIN_RACK_LENGTH_CM:
                raise ValueError(
                    f"Workstation {i+1}: aisle length ({aisle_l:.2f} cm) is too small. "
                    "Decrease number of rows or increase warehouse length."
                )
            if floor_h < self.MIN_FLOOR_HEIGHT_CM:
                raise ValueError(
                    f"Workstation {i+1}: floor/aisle height ({floor_h:.2f} cm) is too small for "
                    "the given number of floors and warehouse height. "
                    "Reduce number of floors or increase warehouse height."
                )
            
            aisles_data = []
            
            # Iterate through rows (along Y axis)
            for r in range(rows):
                # Y position for this row
                aisle_y = gf + r * aisle_l
                
                # Iterate through columns/aisles (along X axis)
                current_x = workstation_start_x + gl
                
                for c in range(num_aisles):
                    # Add custom gap before this aisle (except for first aisle)
                    if c > 0 and (c-1) < len(custom_gaps):
                        current_x += custom_gaps[c-1]
                    
                    # Iterate through floors (along Z axis)
                    for f in range(floors):
                        aisle_z = f * floor_h
                        
                        aisle_entry = {
                            "id": f"aisle-{i}-{r}-{c}-{f}",
                            "position": {
                                "x": current_x,
                                "y": aisle_y,
                                "z": aisle_z
                            },
                            "dimensions": {
                                "width": aisle_w,
                                "length": aisle_l,
                                "height": floor_h
                            },
                            "indices": {
                                "floor": f + 1,
                                "row": r + 1,
                                "col": c + 1
                            }
                        }
                        
                        # Add pallets that belong to this aisle slot
                        for p in b_conf.get('pallet_configs', []):
                            pos = p['position']
                            if pos['floor'] == f+1 and pos['row'] == r+1 and pos['col'] == c+1:
                                aisle_entry.setdefault('pallets', []).append({
                                    "type": p['type'],
                                    "color": p.get('color', '#8B4513'),
                                    "dims": {
                                        "length": p.get('length_cm', 0),
                                        "width": p.get('width_cm', 0),
                                        "height": p.get('height_cm', 0)
                                    }
                                })
                        
                        aisles_data.append(aisle_entry)
                    
                    # Move X position to next aisle
                    current_x += aisle_w
            
            workstations_data.append({
                "id": f"workstation_{i+1}",
                "workstation_index": i,
                "position": {
                    "x": workstation_start_x,
                    "y": 0,
                    "z": 0
                },
                "dimensions": {
                    "width": workstation_w,
                    "length": L,
                    "height": H
                },
                "aisles": aisles_data
            })
        
        # Return layout with warehouse dimensions for reference
        return {
            "warehouse_dimensions": {
                "width": W,
                "length": L,
                "height": H
            },
            "workstations": workstations_data
        }