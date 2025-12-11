import math

class WarehouseCalculator:
    def __init__(self):
        self.conversion_factors = {
            'cm': 0.01, 'm': 1.0, 'km': 1000.0,
            'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.34
        }
    
    def convert_to_meters(self, value, unit):
        """Convert any unit to meters"""
        if unit not in self.conversion_factors:
            raise ValueError(f"Unsupported unit: {unit}")
        return value * self.conversion_factors[unit]
    
    def calculate_block_dimensions(self, warehouse_dim, num_blocks, gaps):
        """Calculate block dimensions considering gaps"""
        # Convert everything to meters
        warehouse_length = self.convert_to_meters(warehouse_dim['length'], warehouse_dim['unit'])
        warehouse_width = self.convert_to_meters(warehouse_dim['width'], warehouse_dim['unit'])
        warehouse_height = self.convert_to_meters(warehouse_dim['height'], warehouse_dim['unit'])
        
        gap_width = self.convert_to_meters(gaps['width_gap'], gaps['unit'])
        gap_length = self.convert_to_meters(gaps['length_gap'], gaps['unit'])
        
        # Calculate available space after subtracting gaps
        total_gaps_width = gap_width * (num_blocks - 1) if num_blocks > 1 else 0
        available_width = warehouse_width - total_gaps_width
        
        total_gaps_length = gap_length * (num_blocks - 1) if num_blocks > 1 else 0
        available_length = warehouse_length - total_gaps_length
        
        # Each block dimensions
        block_width = available_width / num_blocks
        block_length = available_length / num_blocks
        block_height = warehouse_height
        
        return {
            'block_width': block_width,
            'block_length': block_length,
            'block_height': block_height,
            'gaps': {
                'width_gap': gap_width,
                'length_gap': gap_length
            }
        }
    
    def calculate_rack_positions(self, block_dim, rack_config):
        """Calculate positions for racks within a block"""
        # Convert all measurements to meters
        block_width = block_dim['block_width']
        block_length = block_dim['block_length']
        block_height = block_dim['block_height']
        
        num_racks = rack_config['num_racks']
        num_rows = rack_config.get('num_rows', 1)
        num_floors = rack_config['num_floors']
        
        gaps = {
            'front_wall': self.convert_to_meters(rack_config['gap_front_wall'], rack_config['unit']),
            'back_wall': self.convert_to_meters(rack_config['gap_back_wall'], rack_config['unit']),
            'left_wall': self.convert_to_meters(rack_config['gap_left_wall'], rack_config['unit']),
            'right_wall': self.convert_to_meters(rack_config['gap_right_wall'], rack_config['unit']),
            'between_racks': self.convert_to_meters(rack_config['gap_between_racks'], rack_config['unit']),
            'between_floors': self.convert_to_meters(rack_config['gap_between_floors'], rack_config['unit'])
        }
        
        racks_per_row = num_racks // num_rows if num_rows > 0 else num_racks
        
        # Calculate rack dimensions
        available_width = block_width - gaps['left_wall'] - gaps['right_wall']
        available_length = block_length - gaps['front_wall'] - gaps['back_wall']
        available_height = block_height
        
        if racks_per_row > 1:
            available_width -= gaps['between_racks'] * (racks_per_row - 1)
        
        if num_rows > 1:
            available_length -= gaps['between_racks'] * (num_rows - 1)
        
        if num_floors > 1:
            available_height -= gaps['between_floors'] * (num_floors - 1)
        
        rack_width = available_width / racks_per_row
        rack_length = available_length / num_rows
        rack_height = available_height / num_floors
        
        racks = []
        for row in range(num_rows):
            for col in range(racks_per_row):
                rack_id = f"rack_{len(racks) + 1}"
                
                x = gaps['left_wall'] + col * (rack_width + gaps['between_racks'])
                z = gaps['front_wall'] + row * (rack_length + gaps['between_racks'])
                
                for floor in range(num_floors):
                    y = floor * (rack_height + gaps['between_floors'])
                    
                    rack_data = {
                        'id': f"{rack_id}_floor_{floor + 1}",
                        'position': {'x': x, 'y': y, 'z': z},
                        'dimensions': {
                            'width': rack_width,
                            'length': rack_length,
                            'height': rack_height
                        },
                        'floor': floor + 1,
                        'row': row + 1,
                        'column': col + 1
                    }
                    racks.append(rack_data)
        
        return racks
    
    def create_warehouse_layout(self, config):
        """Create complete warehouse layout"""
        # Calculate block dimensions
        block_dims = self.calculate_block_dimensions(
            config['warehouse_dimensions'],
            config['num_blocks'],
            config['block_gaps']
        )
        
        blocks = []
        for i in range(config['num_blocks']):
            block_id = f"block_{i + 1}"
            
            # Calculate block position considering gaps
            x_offset = i * (block_dims['block_width'] + block_dims['gaps']['width_gap'])
            
            block_data = {
                'id': block_id,
                'name': f"Block {i + 1}",
                'position': {'x': x_offset, 'y': 0, 'z': 0},
                'dimensions': {
                    'width': block_dims['block_width'],
                    'length': block_dims['block_length'],
                    'height': block_dims['block_height']
                },
                'color': self.get_block_color(i)
            }
            
            # Add rack configuration if provided
            if 'rack_config' in config:
                block_data['racks'] = self.calculate_rack_positions(
                    block_dims,
                    config['rack_config']
                )
            
            blocks.append(block_data)
        
        return {
            'warehouse_dimensions': config['warehouse_dimensions'],
            'blocks': blocks,
            'gaps': block_dims['gaps']
        }
    
    def get_block_color(self, index):
        """Get distinct color for each block"""
        colors = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
            '#118AB2', '#073B4C', '#7209B7', '#F72585'
        ]
        return colors[index % len(colors)]