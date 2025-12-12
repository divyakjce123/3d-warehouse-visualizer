class WarehouseApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.currentWarehouse = null;
        this.selectedObject = null;
        this.palletColors = { 'wooden': '#8B4513', 'plastic': '#1E90FF', 'metal': '#708090' };
        this.stockColors = { 'hell_classic': '#FF6B6B', 'hell_apple': '#4ECDC4', 'hell_black_cherry': '#7209B7', 'hell_multi': '#FFD166' };
        
        this.renderBlockConfigs(2);
        this.initCollapsibleSections();
        this.initializeEventListeners();
        this.initDimensionButtons();
    }
    
    renderBlockConfigs(numBlocks) {
        const container = document.getElementById('dynamic-blocks-container');
        container.innerHTML = ''; 

        for (let i = 1; i <= numBlocks; i++) {
            const blockHtml = `
                <div class="collapsible-section">
                    <div class="section-header"><h3><i class="fas fa-cubes"></i> ${i + 2}. Block ${i} Information</h3><i class="fas fa-chevron-down"></i></div>
                    <div class="section-content" data-block-index="${i}">
                        <div class="sub-section">
                            <h4><i class="fas fa-sitemap"></i> Racks Configuration</h4>
                            <div class="dimension-buttons">
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Number of Floors</span></div><div class="number-input-button"><input type="number" class="b-floors" value="3" min="1"></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Number of Rows</span></div><div class="number-input-button"><input type="number" class="b-rows" value="2" min="1"></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Number of Racks</span></div><div class="number-input-button"><input type="number" class="b-racks" value="6" min="1" data-block="${i}"></div></div>
                                </div>
                                <div class="rack-gaps-container" id="rack-gaps-block-${i}"></div>
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Front Wall Gap</span></div><div class="dimension-input-button"><input type="number" class="b-gap-front" value="100"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Back Wall Gap</span></div><div class="dimension-input-button"><input type="number" class="b-gap-back" value="100"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                </div>
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Left Wall Gap</span></div><div class="dimension-input-button"><input type="number" class="b-gap-left" value="50"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Right Wall Gap</span></div><div class="dimension-input-button"><input type="number" class="b-gap-right" value="50"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                </div>
                            </div>
                        </div>
                        <div class="sub-section">
                            <h4><i class="fas fa-pallet"></i> Pallet Configuration</h4>
                            <div class="dimension-buttons">
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Pallet Type</span></div><div class="type-select-button"><select class="b-pallet-type"><option value="wooden">Wooden</option><option value="plastic">Plastic</option><option value="metal">Metal</option></select></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Weight (kg)</span></div><div class="number-input-button"><input type="number" class="b-pallet-weight" value="20"></div></div>
                                </div>
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Length</span></div><div class="dimension-input-button"><input type="number" class="b-pallet-l" value="120"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Width</span></div><div class="dimension-input-button"><input type="number" class="b-pallet-w" value="100"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Height</span></div><div class="dimension-input-button"><input type="number" class="b-pallet-h" value="15"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                </div>
                            </div>
                        </div>
                        <div class="sub-section">
                            <h4><i class="fas fa-boxes"></i> Stock Configuration</h4>
                            <div class="dimension-buttons">
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Stock Type</span></div><div class="type-select-button"><select class="b-stock-type"><option value="hell_classic">Hell Classic</option><option value="hell_apple">Hell Apple</option><option value="hell_multi">Hell Multi</option></select></div></div>
                                </div>
                                <div class="dimension-row">
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Length</span></div><div class="dimension-input-button"><input type="number" class="b-stock-l" value="40"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Width</span></div><div class="dimension-input-button"><input type="number" class="b-stock-w" value="30"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                    <div class="dimension-button-group"><div class="dimension-label"><span>Height</span></div><div class="dimension-input-button"><input type="number" class="b-stock-h" value="20"><div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div></div></div>
                                </div>
                                <div class="dimension-row">
                                    <div class="dimension-button-group">
                                        <div class="dimension-label"><span>Position (Floor-Row-Col)</span></div>
                                        <div class="dimension-row" style="gap:5px">
                                            <div class="number-input-button"><input type="number" class="b-pos-f" placeholder="F" value="1"></div>
                                            <div class="number-input-button"><input type="number" class="b-pos-r" placeholder="R" value="1"></div>
                                            <div class="number-input-button"><input type="number" class="b-pos-c" placeholder="C" value="1"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', blockHtml);
            this.renderRackGaps(i, 6);
        }
        
        this.initCollapsibleSections();
        this.initDimensionButtons();
        this.attachRackListeners();
    }
    
    renderRackGaps(blockIndex, numRacks) {
        const container = document.getElementById(`rack-gaps-block-${blockIndex}`);
        if (!container) return;
        container.innerHTML = '';
        if (numRacks <= 1) return;

        let html = '<div class="dimension-label" style="margin-top:10px; margin-bottom:5px;"><span>Gaps Between Specific Racks (cm)</span></div><div class="dimension-row" style="flex-direction: column; flex-wrap: nowrap; gap: 10px;">';
        for (let i = 1; i < numRacks; i++) {
            html += `
                <div class="dimension-button-group" style="flex: 0 0 45%; min-width: 120px;">
                    <div class="dimension-label" style="font-size: 11px;"><span>Gap Rack ${i}-${i+1}</span></div>
                    <div class="dimension-input-button">
                        <input type="number" class="b-custom-gap" data-gap-index="${i-1}" value="50">
                        <div class="unit-dropdown"><select class="unit-select"><option value="cm">cm</option><option value="m">m</option><option value="km">km</option><option value="in">in</option><option value="ft">ft</option><option value="yd">yd</option><option value="mi">mi</option></select></div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        this.initDimensionButtons();
    }

    attachRackListeners() {
        const rackInputs = document.querySelectorAll('.b-racks');
        rackInputs.forEach(input => {
            const newElement = input.cloneNode(true);
            input.parentNode.replaceChild(newElement, input);
            newElement.addEventListener('change', (e) => {
                const blockIndex = e.target.getAttribute('data-block');
                const val = parseInt(e.target.value);
                if (val > 0 && val <= 50) this.renderRackGaps(blockIndex, val);
            });
        });
    }
    
    initCollapsibleSections() {
        const sections = document.querySelectorAll('.collapsible-section');
        sections.forEach(section => {
            const header = section.querySelector('.section-header');
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
            newHeader.addEventListener('click', () => {
                sections.forEach(s => s.classList.remove('active'));
                section.classList.add('active');
            });
        });
        if (sections.length > 0 && !document.querySelector('.collapsible-section.active')) {
            sections[0].classList.add('active');
        }
    }
    
    initDimensionButtons() {
        const inputs = document.querySelectorAll('.dimension-input-button input, .number-input-button input, .type-select-button select');
        inputs.forEach(input => {
            if (input.dataset.hasEffects === "true") return;
            input.dataset.hasEffects = "true";
            
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
        document.getElementById('generate-layout-btn').addEventListener('click', () => this.createWarehouse());
        document.getElementById('reset-all-btn').addEventListener('click', () => this.resetWarehouse());
        document.getElementById('export-btn').addEventListener('click', () => this.exportLayout());
        
        const numBlocksInput = document.getElementById('num-blocks');
        numBlocksInput.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            if(val > 0 && val <= 20) this.renderBlockConfigs(val);
        });
        
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
        document.getElementById('zoom-in').addEventListener('click', () => { if (window.visualizer) window.visualizer.zoomIn(); });
        document.getElementById('zoom-out').addEventListener('click', () => { if (window.visualizer) window.visualizer.zoomOut(); });
        document.getElementById('reset-view').addEventListener('click', () => { if (window.visualizer) window.visualizer.resetView(); });
        document.getElementById('top-view').addEventListener('click', () => { if (window.visualizer) window.visualizer.setTopView(); });
        document.getElementById('front-view').addEventListener('click', () => { if (window.visualizer) window.visualizer.setFrontView(); });
        document.getElementById('side-view').addEventListener('click', () => { if (window.visualizer) window.visualizer.setSideView(); });
        document.getElementById('interaction-mode').addEventListener('change', (e) => { if (window.visualizer) window.visualizer.setInteractionMode(e.target.value); });
    }
    
    async createWarehouse() {
        try {
            this.showLoading(true);
            this.updateStatus('Creating warehouse layout...', 'info');
            const warehouseConfig = this.getWarehouseConfig();
            
            const response = await fetch(`${this.apiBaseUrl}/warehouse/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(warehouseConfig)
            });
            
            const result = await response.json();
            if (result.success) {
                this.currentWarehouse = result.warehouse_id;
                this.updateVisualization(result.layout);
                this.updateStatus('Warehouse layout created successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error(error);
            this.updateStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    getWarehouseConfig() {
        const getUnit = (elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                const unitSelect = element.closest('.dimension-input-button')?.querySelector('.unit-select');
                return unitSelect ? unitSelect.value : 'cm';
            }
            return 'cm';
        };
        
        const blockConfigs = [];
        const blockSections = document.querySelectorAll('#dynamic-blocks-container .section-content');
        
        blockSections.forEach((section, index) => {
            const getVal = (cls) => parseFloat(section.querySelector(`.${cls}`).value) || 0;
            const getStr = (cls) => section.querySelector(`.${cls}`).value;
            const getLocalUnit = (cls) => section.querySelector(`.${cls}`).parentNode.querySelector('.unit-select')?.value || 'cm';

            const customGaps = [];
            const gapInputs = section.querySelectorAll('.b-custom-gap');
            gapInputs.forEach(input => {
                customGaps.push(parseFloat(input.value) || 0);
            });

            blockConfigs.push({
                block_index: index + 1,
                rack_config: {
                    num_floors: parseInt(section.querySelector('.b-floors').value),
                    num_rows: parseInt(section.querySelector('.b-rows').value),
                    num_racks: parseInt(section.querySelector('.b-racks').value),
                    custom_gaps: customGaps,
                    gap_unit: 'cm',
                    gap_front: getVal('b-gap-front'),
                    gap_back: getVal('b-gap-back'),
                    gap_left: getVal('b-gap-left'),
                    gap_right: getVal('b-gap-right'),
                    wall_gap_unit: getLocalUnit('b-gap-front')
                },
                pallet_config: {
                    type: getStr('b-pallet-type'),
                    weight: getVal('b-pallet-weight'),
                    length: getVal('b-pallet-l'),
                    width: getVal('b-pallet-w'),
                    height: getVal('b-pallet-h'),
                    unit: getLocalUnit('b-pallet-l'),
                    color: this.palletColors[getStr('b-pallet-type')]
                },
                stock_config: {
                    type: getStr('b-stock-type'),
                    length: getVal('b-stock-l'),
                    width: getVal('b-stock-w'),
                    height: getVal('b-stock-h'),
                    unit: getLocalUnit('b-stock-l'),
                    color: this.stockColors[getStr('b-stock-type')],
                    position: {
                        floor: parseInt(section.querySelector('.b-pos-f').value),
                        row: parseInt(section.querySelector('.b-pos-r').value),
                        col: parseInt(section.querySelector('.b-pos-c').value)
                    }
                }
            });
        });

        return {
            id: `warehouse_${Date.now()}`,
            warehouse_dimensions: {
                length: parseFloat(document.getElementById('warehouse-length').value),
                width: parseFloat(document.getElementById('warehouse-width').value),
                height: parseFloat(document.getElementById('warehouse-height').value),
                unit: getUnit('warehouse-length')
            },
            num_blocks: parseInt(document.getElementById('num-blocks').value),
            block_gap: parseFloat(document.getElementById('block-gap').value),
            block_gap_unit: getUnit('block-gap'),
            block_configs: blockConfigs
        };
    }
    
    updateVisualization(layout) {
        if (window.visualizer) {
            window.visualizer.renderWarehouse(layout);
            this.updateSelectedInfo(null);
            document.getElementById('no-layout-message').style.display = 'none';
        }
    }
    
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) loadingOverlay.style.display = 'flex';
        else loadingOverlay.style.display = 'none';
    }
    
    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = '';
        switch(type) {
            case 'success': statusDiv.classList.add('status-success'); break;
            case 'error': statusDiv.classList.add('status-error'); break;
            default: statusDiv.classList.add('status-info');
        }
    }
    
    updateSelectedInfo(object) {
        const infoDiv = document.getElementById('selected-info');
        if (!object) {
            infoDiv.innerHTML = `<p><strong>No object selected</strong></p><p>Click objects to see details</p>`;
            return;
        }
        let html = `<p><strong>${object.name}</strong></p>`;
        if (object.type === 'rack') html += `<p>Block: ${object.blockId}</p><p>Row: ${object.row}, Col: ${object.column}</p>`;
        else if (object.type === 'pallet') html += `<p>Type: ${object.type}</p>`;
        infoDiv.innerHTML = html;
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    resetWarehouse() {
        if(confirm('Reset all data?')) {
            if(window.visualizer) window.visualizer.clearScene();
            this.currentWarehouse = null;
            document.getElementById('no-layout-message').style.display = 'flex';
        }
    }
    
    exportLayout() {
        if(!this.currentWarehouse) return;
        const dataStr = JSON.stringify(this.currentWarehouse);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'warehouse.json');
        linkElement.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.warehouseApp = new WarehouseApp();
});