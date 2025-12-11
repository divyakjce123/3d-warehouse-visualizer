from flask import Flask, request, jsonify
from flask_cors import CORS
from warehouse_calc import WarehouseCalculator
import json
import os

app = Flask(__name__)
CORS(app)

# Data storage (in production, use a database)
warehouse_data = {}

@app.route('/api/warehouse/create', methods=['POST'])
def create_warehouse():
    try:
        data = request.json
        warehouse_id = data.get('id', 'warehouse_1')
        
        # Calculate warehouse dimensions
        calc = WarehouseCalculator()
        warehouse_layout = calc.create_warehouse_layout(data)
        
        warehouse_data[warehouse_id] = {
            'config': data,
            'layout': warehouse_layout
        }
        
        return jsonify({
            'success': True,
            'warehouse_id': warehouse_id,
            'layout': warehouse_layout
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/warehouse/<warehouse_id>', methods=['GET'])
def get_warehouse(warehouse_id):
    if warehouse_id in warehouse_data:
        return jsonify({
            'success': True,
            'warehouse': warehouse_data[warehouse_id]
        })
    return jsonify({'success': False, 'error': 'Warehouse not found'}), 404

@app.route('/api/warehouse/<warehouse_id>/block/<block_id>/rack', methods=['POST'])
def add_rack(warehouse_id, block_id):
    try:
        data = request.json
        
        if warehouse_id in warehouse_data:
            warehouse = warehouse_data[warehouse_id]
            
            # Find block and add rack
            for block in warehouse['layout']['blocks']:
                if block['id'] == block_id:
                    if 'racks' not in block:
                        block['racks'] = []
                    
                    rack_id = f"rack_{len(block['racks']) + 1}"
                    rack_config = {
                        'id': rack_id,
                        'position': data.get('position', {'x': 0, 'y': 0, 'z': 0}),
                        'dimensions': data.get('dimensions'),
                        'floors': data.get('floors', 1),
                        'rows': data.get('rows', 1),
                        'pallets': []
                    }
                    
                    block['racks'].append(rack_config)
                    
                    warehouse_data[warehouse_id] = warehouse
                    
                    return jsonify({
                        'success': True,
                        'rack_id': rack_id,
                        'block': block
                    })
        
        return jsonify({'success': False, 'error': 'Warehouse or block not found'}), 404
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/warehouse/<warehouse_id>/block/<block_id>/rack/<rack_id>/pallet', methods=['POST'])
def add_pallet(warehouse_id, block_id, rack_id):
    try:
        data = request.json
        
        if warehouse_id in warehouse_data:
            warehouse = warehouse_data[warehouse_id]
            
            for block in warehouse['layout']['blocks']:
                if block['id'] == block_id and 'racks' in block:
                    for rack in block['racks']:
                        if rack['id'] == rack_id:
                            pallet_id = f"pallet_{len(rack.get('pallets', [])) + 1}"
                            pallet_data = {
                                'id': pallet_id,
                                'type': data.get('type', 'wooden'),
                                'dimensions': data.get('dimensions'),
                                'color': data.get('color', '#964B00'),
                                'position': data.get('position'),
                                'stock': data.get('stock')
                            }
                            
                            if 'pallets' not in rack:
                                rack['pallets'] = []
                            rack['pallets'].append(pallet_data)
                            
                            warehouse_data[warehouse_id] = warehouse
                            
                            return jsonify({
                                'success': True,
                                'pallet_id': pallet_id
                            })
        
        return jsonify({'success': False, 'error': 'Not found'}), 404
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/warehouse/<warehouse_id>/delete', methods=['DELETE'])
def delete_warehouse(warehouse_id):
    if warehouse_id in warehouse_data:
        del warehouse_data[warehouse_id]
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Warehouse not found'}), 404

@app.route('/api/warehouse/<warehouse_id>/block/<block_id>/delete', methods=['DELETE'])
def delete_block(warehouse_id, block_id):
    if warehouse_id in warehouse_data:
        warehouse = warehouse_data[warehouse_id]
        warehouse['layout']['blocks'] = [
            b for b in warehouse['layout']['blocks'] if b['id'] != block_id
        ]
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)