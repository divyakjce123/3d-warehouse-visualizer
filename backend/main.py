from fastapi import FastAPI, HTTPException, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import uvicorn
from warehouse_calc import WarehouseCalculator

app = FastAPI()

# CORS Configuration
origins = ["*"]  # Update this with specific origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
warehouse_data = {}

# --- Pydantic Models for Input Validation ---
class RackInput(BaseModel):
    position: Optional[Dict[str, float]] = {'x': 0, 'y': 0, 'z': 0}
    dimensions: Optional[Dict[str, float]] = None
    floors: int = 1
    rows: int = 1

class PalletInput(BaseModel):
    type: str = 'wooden'
    dimensions: Optional[Dict[str, float]] = None
    color: str = '#964B00'
    position: Optional[Dict[str, float]] = None
    stock: Optional[Dict[str, Any]] = None

# --- Routes ---

@app.post("/api/warehouse/create")
async def create_warehouse(data: Dict[str, Any] = Body(...)):
    try:
        warehouse_id = data.get('id', 'warehouse_1')
        
        calc = WarehouseCalculator()
        # Ensure your WarehouseCalculator is adapted to not rely on Flask contexts if it did
        warehouse_layout = calc.create_warehouse_layout(data)
        
        warehouse_data[warehouse_id] = {
            'config': data,
            'layout': warehouse_layout
        }
        
        return {
            'success': True,
            'warehouse_id': warehouse_id,
            'layout': warehouse_layout
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/warehouse/{warehouse_id}")
async def get_warehouse(warehouse_id: str):
    if warehouse_id in warehouse_data:
        return {
            'success': True,
            'warehouse': warehouse_data[warehouse_id]
        }
    raise HTTPException(status_code=404, detail='Warehouse not found')

@app.post("/api/warehouse/{warehouse_id}/block/{block_id}/rack")
async def add_rack(
    warehouse_id: str, 
    block_id: str, 
    data: RackInput
):
    try:
        if warehouse_id in warehouse_data:
            warehouse = warehouse_data[warehouse_id]
            for block in warehouse['layout']['blocks']:
                if block['id'] == block_id:
                    if 'racks' not in block: block['racks'] = []
                    
                    rack_id = f"rack_{len(block['racks']) + 1}"
                    
                    # Convert Pydantic model to dict
                    rack_config = {
                        'id': rack_id,
                        'position': data.position,
                        'dimensions': data.dimensions,
                        'floors': data.floors,
                        'rows': data.rows,
                        'pallets': []
                    }
                    block['racks'].append(rack_config)
                    return {'success': True, 'rack_id': rack_id}
            
            # If loop finishes without finding block
            raise HTTPException(status_code=404, detail='Block not found')
        
        raise HTTPException(status_code=404, detail='Warehouse not found')
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/warehouse/{warehouse_id}/block/{block_id}/rack/{rack_id}/pallet")
async def add_pallet(
    warehouse_id: str, 
    block_id: str, 
    rack_id: str, 
    data: PalletInput
):
    try:
        if warehouse_id in warehouse_data:
            warehouse = warehouse_data[warehouse_id]
            for block in warehouse['layout']['blocks']:
                if block['id'] == block_id and 'racks' in block:
                    for rack in block['racks']:
                        if rack['id'] == rack_id:
                            pallet_id = f"pallet_{len(rack.get('pallets', [])) + 1}"
                            
                            pallet_data = {
                                'id': pallet_id,
                                'type': data.type,
                                'dimensions': data.dimensions,
                                'color': data.color,
                                'position': data.position,
                                'stock': data.stock
                            }
                            
                            if 'pallets' not in rack: rack['pallets'] = []
                            rack['pallets'].append(pallet_data)
                            return {'success': True, 'pallet_id': pallet_id}
            
            raise HTTPException(status_code=404, detail='Rack, Block, or Warehouse not found')
            
        raise HTTPException(status_code=404, detail='Warehouse not found')

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/warehouse/{warehouse_id}/delete")
async def delete_warehouse(warehouse_id: str):
    if warehouse_id in warehouse_data:
        del warehouse_data[warehouse_id]
        return {'success': True}
    raise HTTPException(status_code=404, detail='Warehouse not found')

@app.delete("/api/warehouse/{warehouse_id}/block/{block_id}/delete")
async def delete_block(warehouse_id: str, block_id: str):
    if warehouse_id in warehouse_data:
        warehouse = warehouse_data[warehouse_id]
        original_count = len(warehouse['layout']['blocks'])
        
        warehouse['layout']['blocks'] = [
            b for b in warehouse['layout']['blocks'] if b['id'] != block_id
        ]
        
        if len(warehouse['layout']['blocks']) < original_count:
            return {'success': True}
        else:
            raise HTTPException(status_code=404, detail='Block not found')
            
    raise HTTPException(status_code=404, detail='Warehouse not found')

if __name__ == '__main__':
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)