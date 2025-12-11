class WarehouseApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.currentWarehouse = null;
        this.selectedObject = null;
        this.palletColors = {
            'wooden': '#8B4513',
            'plastic': '#1E90FF',
            'metal': '#708090'
        };
        this.stockColors = {
            'hell_classic': '#FF6B6B',
            'hell_apple': '#4ECDC4',
            'hell_black_cherry': '#7209B7',
            'hell_multi': '#FFD166'
        };
        
        this.initCollapsibleSections();
        this.initializeEventListeners();
        this.initDimensionButtons();
    }
    
    initCollapsibleSections() {
        // Set first section as active
        const sections = document.querySelectorAll('.collapsible-section');
        sections.forEach(section => {
            const header = section.querySelector('.section-header');
            header.addEventListener('click', () => {
                // Close all sections
                sections.forEach(s => s.classList.remove('active'));
                // Open clicked section
                section.classList.add('active');
            });
            
            // Expand on hover
            section.addEventListener('mouseenter', () => {
                if (!section.classList.contains('active')) {
                    section.classList.add('active');
                }
            });
        });
        
        // Keep first section open by default
        if (sections.length > 0) {
            sections[0].classList.add('active');
        }
    }
    
    initDimensionButtons() {
        // Add click effects to dimension buttons
        const dimensionButtons = document.querySelectorAll('.dimension-input-button, .number-input-button, .type-select-button');
        dimensionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Focus the input/select inside
                const input = button.querySelector('input, select');
                if (input) {
                    input.focus();
                }
            });
        });
        
        // Add focus effects
        const inputs = document.querySelectorAll('.dimension-input-button input, .number-input-button input, .type-select-button select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                const parent = input.closest('.dimension-input-button, .number-input-button, .type-select-button');
                if (parent) {
                    parent.style.borderColor = '#d32f2f';
                    parent.style.boxShadow = '0 0 0 3px rgba(255, 82, 82, 0.2)';
                }
            });
            
            input.addEventListener('blur', () => {
                const parent = input.closest('.dimension-input-button, .number-input-button, .type-select-button');
                if (parent) {
                    parent.style.borderColor = '#e0e0e0';
                    parent.style.boxShadow = 'none';
                }
            });
        });
    }
    
    initializeEventListeners() {
        // Generate Layout Button
        document.getElementById('generate-layout-btn').addEventListener('click', () => {
            this.createWarehouse();
        });
        
        // Reset All Button
        document.getElementById('reset-all-btn').addEventListener('click', () => {
            this.resetWarehouse();
        });
        
        // Add Pallet Button
        document.getElementById('add-pallet-btn').addEventListener('click', () => {
            this.addPalletToSelectedRack();
        });
        
        // Export Button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportLayout();
        });
        
        // Visualization Controls
        document.getElementById('toggle-grid').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
            if (window.visualizer) window.visualizer.toggleGrid();
        });
        
        document.getElementById('toggle-labels').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
            if (window.visualizer) window.visualizer.toggleLabels();
        });
        
        document.getElementById('toggle-walls').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
            if (window.visualizer) window.visualizer.toggleWalls();
        });
        
        document.getElementById('zoom-in').addEventListener('click', () => {
            if (window.visualizer) window.visualizer.zoomIn();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            if (window.visualizer) window.visualizer.zoomOut();
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            if (window.visualizer) window.visualizer.resetView();
        });
        
        document.getElementById('top-view').addEventListener('click', () => {
            if (window.visualizer) window.visualizer.setTopView();
        });
        
        document.getElementById('front-view').addEventListener('click', () => {
            if (window.visualizer) window.visualizer.setFrontView();
        });
        
        document.getElementById('side-view').addEventListener('click', () => {
            if (window.visualizer) window.visualizer.setSideView();
        });
        
        document.getElementById('interaction-mode').addEventListener('change', (e) => {
            if (window.visualizer) window.visualizer.setInteractionMode(e.target.value);
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+G to generate layout
            if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                this.createWarehouse();
            }
            
            // Ctrl+R to reset
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.resetWarehouse();
            }
            
            // Ctrl+E to export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportLayout();
            }
        });
    }
    
    async createWarehouse() {
        try {
            this.showLoading(true);
            this.updateStatus('Creating warehouse layout...', 'info');
            
            const warehouseConfig = this.getWarehouseConfig();
            
            // Validate inputs
            if (!this.validateInputs()) {
                this.showLoading(false);
                return;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/warehouse/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(warehouseConfig)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentWarehouse = result.warehouse_id;
                this.updateVisualization(result.layout);
                this.updateStatus('Warehouse layout created successfully!', 'success');
                this.showNotification('3D Warehouse layout generated successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error');
            this.showNotification(`Failed to create warehouse: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    validateInputs() {
        const inputs = [
            { id: 'warehouse-length', name: 'Warehouse Length' },
            { id: 'warehouse-width', name: 'Warehouse Width' },
            { id: 'warehouse-height', name: 'Warehouse Height' },
            { id: 'block-gap-width', name: 'Block Gap Width' },
            { id: 'block-gap-length', name: 'Block Gap Length' },
            { id: 'floor-gap', name: 'Floor Gap' },
            { id: 'rack-gap', name: 'Rack Gap' },
            { id: 'gap-front', name: 'Front Wall Gap' },
            { id: 'gap-back', name: 'Back Wall Gap' },
            { id: 'gap-left', name: 'Left Wall Gap' },
            { id: 'gap-right', name: 'Right Wall Gap' },
            { id: 'pallet-length', name: 'Pallet Length' },
            { id: 'pallet-width', name: 'Pallet Width' },
            { id: 'pallet-height', name: 'Pallet Height' },
            { id: 'stock-length', name: 'Stock Length' },
            { id: 'stock-width', name: 'Stock Width' },
            { id: 'stock-height', name: 'Stock Height' }
        ];
        
        for (const input of inputs) {
            const element = document.getElementById(input.id);
            const value = parseFloat(element.value);
            
            if (isNaN(value) || value <= 0) {
                this.updateStatus(`Invalid ${input.name}. Must be a positive number.`, 'error');
                this.showNotification(`Please enter a valid value for ${input.name}`, 'error');
                
                // Highlight the invalid input
                const parent = element.closest('.dimension-input-button, .number-input-button');
                if (parent) {
                    parent.style.borderColor = '#f44336';
                    parent.style.boxShadow = '0 0 0 3px rgba(244, 67, 54, 0.2)';
                    
                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        parent.style.borderColor = '#e0e0e0';
                        parent.style.boxShadow = 'none';
                    }, 3000);
                }
                
                element.focus();
                return false;
            }
        }
        
        return true;
    }
    
    getWarehouseConfig() {
        // Get unit from the first unit dropdown in each section
        const getUnit = (elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                const unitSelect = element.closest('.dimension-input-button')?.querySelector('.unit-select');
                return unitSelect ? unitSelect.value : 'm';
            }
            return 'm';
        };
        
        return {
            id: `warehouse_${Date.now()}`,
            warehouse_dimensions: {
                length: parseFloat(document.getElementById('warehouse-length').value),
                width: parseFloat(document.getElementById('warehouse-width').value),
                height: parseFloat(document.getElementById('warehouse-height').value),
                unit: getUnit('warehouse-length')
            },
            num_blocks: parseInt(document.getElementById('num-blocks').value),
            block_gaps: {
                width_gap: parseFloat(document.getElementById('block-gap-width').value),
                length_gap: parseFloat(document.getElementById('block-gap-length').value),
                unit: getUnit('block-gap-width')
            },
            rack_config: {
                num_floors: parseInt(document.getElementById('num-floors').value),
                num_racks: parseInt(document.getElementById('num-racks').value),
                num_rows: parseInt(document.getElementById('num-rows').value),
                gap_between_floors: parseFloat(document.getElementById('floor-gap').value),
                gap_between_racks: parseFloat(document.getElementById('rack-gap').value),
                gap_front_wall: parseFloat(document.getElementById('gap-front').value),
                gap_back_wall: parseFloat(document.getElementById('gap-back').value),
                gap_left_wall: parseFloat(document.getElementById('gap-left').value),
                gap_right_wall: parseFloat(document.getElementById('gap-right').value),
                unit: getUnit('floor-gap')
            }
        };
    }
    
    updateVisualization(layout) {
        if (window.visualizer) {
            window.visualizer.renderWarehouse(layout);
            this.updateSelectedInfo(null);
            // Hide no layout message
            document.getElementById('no-layout-message').style.display = 'none';
        }
    }
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        const generateBtn = document.getElementById('generate-layout-btn');
        
        if (show) {
            loadingOverlay.style.display = 'flex';
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GENERATING...';
        } else {
            loadingOverlay.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> GENERATE 3D LAYOUT';
        }
    }
    
    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        
        // Remove previous classes
        statusDiv.className = '';
        
        // Add appropriate class based on type
        switch(type) {
            case 'success':
                statusDiv.classList.add('status-success');
                break;
            case 'error':
                statusDiv.classList.add('status-error');
                break;
            case 'warning':
                statusDiv.classList.add('status-warning');
                break;
            default:
                statusDiv.classList.add('status-info');
        }
    }
    
    async addPalletToSelectedRack() {
        if (!this.selectedObject || !this.selectedObject.rackId) {
            this.updateStatus('Please select a rack first by clicking on it in the 3D view', 'warning');
            this.showNotification('Please select a rack first', 'warning');
            return;
        }
        
        try {
            const palletConfig = this.getPalletConfig();
            
            const response = await fetch(
                `${this.apiBaseUrl}/warehouse/${this.currentWarehouse}/block/${this.selectedObject.blockId}/rack/${this.selectedObject.rackId}/pallet`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(palletConfig)
                }
            );
            
            const result = await response.json();
            
            if (result.success) {
                this.refreshWarehouse();
                this.updateStatus('Pallet added to selected rack', 'success');
                this.showNotification('Pallet added successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.updateStatus(`Error adding pallet: ${error.message}`, 'error');
            this.showNotification(`Failed to add pallet: ${error.message}`, 'error');
        }
    }
    
    getPalletConfig() {
        const palletType = document.getElementById('pallet-type').value;
        const stockType = document.getElementById('stock-type').value;
        
        // Get unit from pallet length dropdown
        const palletUnitSelect = document.getElementById('pallet-length').closest('.dimension-input-button').querySelector('.unit-select');
        const stockUnitSelect = document.getElementById('stock-length').closest('.dimension-input-button').querySelector('.unit-select');
        
        return {
            type: palletType,
            color: this.palletColors[palletType],
            dimensions: {
                length: parseFloat(document.getElementById('pallet-length').value),
                width: parseFloat(document.getElementById('pallet-width').value),
                height: parseFloat(document.getElementById('pallet-height').value),
                unit: palletUnitSelect.value
            },
            stock: {
                type: stockType,
                color: this.stockColors[stockType],
                dimensions: {
                    length: parseFloat(document.getElementById('stock-length').value),
                    width: parseFloat(document.getElementById('stock-width').value),
                    height: parseFloat(document.getElementById('stock-height').value),
                    unit: stockUnitSelect.value
                }
            },
            position: {
                x: 0,
                y: 0,
                z: 0
            }
        };
    }
    
    async refreshWarehouse() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/warehouse/${this.currentWarehouse}`);
            const result = await response.json();
            
            if (result.success) {
                this.updateVisualization(result.warehouse.layout);
            }
        } catch (error) {
            console.error('Error refreshing warehouse:', error);
        }
    }
    
    async deleteSelectedObject() {
        if (!this.selectedObject) {
            this.updateStatus('Select an object to delete', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to delete this object?')) {
            try {
                let url = `${this.apiBaseUrl}/warehouse/${this.currentWarehouse}`;
                
                if (this.selectedObject.blockId) {
                    url += `/block/${this.selectedObject.blockId}`;
                }
                
                const response = await fetch(url, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.refreshWarehouse();
                    this.updateStatus('Object deleted', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                this.updateStatus(`Error deleting object: ${error.message}`, 'error');
            }
        }
    }
    
    resetWarehouse() {
        if (confirm('Are you sure you want to reset everything? All data will be lost.')) {
            if (window.visualizer) {
                window.visualizer.clearScene();
            }
            this.currentWarehouse = null;
            this.selectedObject = null;
            this.updateSelectedInfo(null);
            this.updateStatus('Ready to create new layout', 'info');
            this.showNotification('All data reset successfully', 'info');
            
            // Show no layout message
            document.getElementById('no-layout-message').style.display = 'flex';
        }
    }
    
    exportLayout() {
        if (!this.currentWarehouse) {
            this.updateStatus('No warehouse layout to export', 'warning');
            this.showNotification('Create a layout first before exporting', 'warning');
            return;
        }
        
        // Create a JSON download
        const dataStr = JSON.stringify(this.currentWarehouse, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `warehouse_layout_${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.updateStatus('Layout exported successfully', 'success');
        this.showNotification('Layout exported to JSON file', 'success');
    }
    
    updateSelectedInfo(object) {
        this.selectedObject = object;
        const infoDiv = document.getElementById('selected-info');
        
        if (!object) {
            infoDiv.innerHTML = `
                <p><strong>No object selected</strong></p>
                <p>Click on any block, rack, or pallet in the 3D view to select it</p>
                <p>Selected objects can be edited or deleted</p>
            `;
            return;
        }
        
        let infoHtml = '';
        
        if (object.type === 'block') {
            infoHtml = `
                <p><strong>Selected: ${object.name}</strong></p>
                <p><strong>Type:</strong> Block</p>
                <p><strong>Dimensions:</strong> ${object.dimensions?.width.toFixed(2)}m × 
                ${object.dimensions?.length.toFixed(2)}m × 
                ${object.dimensions?.height.toFixed(2)}m</p>
                <p><strong>Position:</strong> (${object.position?.x.toFixed(2)}m, 
                ${object.position?.y.toFixed(2)}m, 
                ${object.position?.z.toFixed(2)}m)</p>
                <p><em>Contains ${object.rackCount || 0} racks</em></p>
            `;
        } else if (object.type === 'rack') {
            infoHtml = `
                <p><strong>Selected: ${object.name}</strong></p>
                <p><strong>Type:</strong> Rack</p>
                <p><strong>Location:</strong> Floor ${object.floor}, Row ${object.row}, Column ${object.column}</p>
                <p><strong>Dimensions:</strong> ${object.dimensions?.width.toFixed(2)}m × 
                ${object.dimensions?.length.toFixed(2)}m × 
                ${object.dimensions?.height.toFixed(2)}m</p>
                <p><strong>Contains:</strong> ${object.palletCount || 0} pallets</p>
                <button class="btn btn-secondary" onclick="warehouseApp.addPalletToSelectedRack()">
                    <i class="fas fa-plus"></i> Add Pallet Here
                </button>
            `;
        } else if (object.type === 'pallet') {
            infoHtml = `
                <p><strong>Selected: ${object.name}</strong></p>
                <p><strong>Type:</strong> Pallet (${object.palletType})</p>
                <p><strong>Stock:</strong> ${object.stockType || 'None'}</p>
                <p><strong>Position:</strong> Block ${object.blockId?.replace('block_', '')}, 
                Rack ${object.rackId?.replace('rack_', '')}</p>
            `;
        }
        
        infoDiv.innerHTML = infoHtml;
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.warehouseApp = new WarehouseApp();
    
    // Add CSS for status colors
    const style = document.createElement('style');
    style.textContent = `
        .status-success {
            border-left-color: #4caf50 !important;
        }
        .status-error {
            border-left-color: #f44336 !important;
        }
        .status-warning {
            border-left-color: #ff9800 !important;
        }
        .status-info {
            border-left-color: #2196f3 !important;
        }
        
        #status-message {
            border-left: 4px solid #2196f3;
        }
    `;
    document.head.appendChild(style);
});