// State Management
const state = {
  currentScenario: 'realistic',
  currentTab: 'property',
  partnerView: 'combined',
  constructionMode: 'simple',
  partnerSplit: { a: 50, b: 50 },
  revenueSplit: { a: 50, b: 50, followsCostSplit: true },
  scenarios: {
    realistic: {
      name: 'Realistic Case',
      data: {
        grundstueck: 2200000,
        makler: 3.57,
        abriss: 150000,
        wohnflaeche: 800,
        baukosten_qm: 3500,
        baunebenkosten: 15,
        unvorhergesehen: 10,
        eigenkapital: 1000000,
        beleihung: 640000,
        beteiligung: 50,
        zinssatz: 3.7,
        zinssatz_a: 3.7,
        zinssatz_b: 3.7,
        bauzeit: 18,
        bauzeit_a: 18,
        bauzeit_b: 18,
        verkaufspreis_qm: 8750,
        vertriebskosten: 3,
        eigenkapital_a: 500000,
        eigenkapital_b: 500000,
        beleihung_a: 320000,
        beleihung_b: 320000
      },
      constructionItems: [
        { id: 'tiefbau', name: 'Tiefbau', cost: 300000 },
        { id: 'rohbau', name: 'Rohbau', cost: 1200000 },
        { id: 'innenausbau', name: 'Innenausbau', cost: 800000 },
        { id: 'haustechnik', name: 'Haustechnik', cost: 400000 },
        { id: 'garten', name: 'Außenanlagen/Garten', cost: 100000 }
      ]
    },
    best: {
      name: 'Best Case',
      data: {
        makler: 3.57
      },
      constructionItems: []
    },
    worst: {
      name: 'Worst Case',
      data: {
        makler: 3.57
      },
      constructionItems: []
    }
  }
};

// Generate Best and Worst Case scenarios
function generateScenarios() {
  const baseData = { ...state.scenarios.realistic.data };
  const baseItems = state.scenarios.realistic.constructionItems.map(item => ({ ...item }));
  
  // Best Case: -10% demolition, -15% construction costs, -10% contingency, +10% sales
  state.scenarios.best.data = {
    ...baseData,
    makler: baseData.makler,
    abriss: Math.round(baseData.abriss * 0.9),
    baukosten_qm: Math.round(baseData.baukosten_qm * 0.85),
    unvorhergesehen: Math.max(5, baseData.unvorhergesehen - 10),
    verkaufspreis_qm: Math.round(baseData.verkaufspreis_qm * 1.1)
  };
  
  // Best case construction items - 15% less
  state.scenarios.best.constructionItems = baseItems.map(item => ({
    ...item,
    cost: Math.round(item.cost * 0.85)
  }));
  
  // Worst Case: +10% demolition, +15% construction costs, +10% contingency, -10% sales
  state.scenarios.worst.data = {
    ...baseData,
    makler: baseData.makler,
    abriss: Math.round(baseData.abriss * 1.1),
    baukosten_qm: Math.round(baseData.baukosten_qm * 1.15),
    unvorhergesehen: baseData.unvorhergesehen + 10,
    verkaufspreis_qm: Math.round(baseData.verkaufspreis_qm * 0.9)
  };
  
  // Worst case construction items - 15% more
  state.scenarios.worst.constructionItems = baseItems.map(item => ({
    ...item,
    cost: Math.round(item.cost * 1.15)
  }));
}

// Initialize app
function init() {
  generateScenarios();
  setupEventListeners();
  loadScenario(state.currentScenario);
  setupCharts();
  setupLocationAutocomplete();
  calculate();
}

// Setup Event Listeners
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      switchTab(tab);
    });
  });
  
  // Scenario tabs
  document.querySelectorAll('.scenario-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scenario = e.currentTarget.getAttribute('data-scenario');
      if (scenario) {
        switchScenario(scenario);
      }
    });
  });
  
  // Partner view toggle
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.getAttribute('data-view');
      togglePartnerView(view);
    });
  });
  
  // Step buttons
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const input = e.currentTarget.getAttribute('data-input');
      const step = parseFloat(e.currentTarget.getAttribute('data-step')); // Changed from parseInt to parseFloat for decimal steps
      stepInput(input, step);
    });
  });
  
  // Input changes with formatting
  document.querySelectorAll('input[type="number"]').forEach(input => {
    // Store the actual numeric value as a data attribute
    const initialValue = input.value || '0';
    input.dataset.rawValue = initialValue.toString();
    
    // Identify currency inputs (those with step >= 1 or specific IDs)
    const isCurrencyInput = (parseFloat(input.step) >= 1) || 
                           ['grundstueck', 'eigenkapital', 'eigenkapital-a', 'eigenkapital-b', 
                            'beleihung', 'beleihung-a', 'beleihung-b', 'abriss'].includes(input.id);
    
    // Format on blur - FIXED: Never format number inputs to prevent browser rejection
    input.addEventListener('blur', (e) => {
      // Get the current value, prioritizing rawValue for large numbers
      let rawValue;
      
      // First, try to get the value from rawValue data attribute
      if (e.target.dataset.rawValue && !isNaN(parseFloat(e.target.dataset.rawValue))) {
        rawValue = parseFloat(e.target.dataset.rawValue);
      } else {
        // Fall back to parsing the current input value
        const currentInputValue = e.target.value.replace(/\s/g, ''); // Remove any spaces
        rawValue = parseFormattedNumber(currentInputValue);
      }
      
      // CRITICAL FIX: HTML5 number inputs reject formatted values with dots/commas
      // Never format values in number inputs - they only accept raw numeric values
      if (!isNaN(rawValue) && rawValue >= 0) {
        // Always update the dataset.rawValue to preserve the actual numeric value
        e.target.dataset.rawValue = rawValue.toString();
        // For number inputs, always show raw numeric value without formatting
        e.target.value = rawValue.toString();
      }
    });
    
    // Parse on focus
    input.addEventListener('focus', (e) => {
      // Prioritize the stored rawValue, fall back to parsing the displayed value
      let rawValue;
      
      if (e.target.dataset.rawValue && !isNaN(parseFloat(e.target.dataset.rawValue))) {
        rawValue = parseFloat(e.target.dataset.rawValue);
      } else {
        rawValue = parseFormattedNumber(e.target.value);
      }
      
      if (!isNaN(rawValue) && rawValue >= 0) {
        e.target.value = rawValue.toString(); // Show unformatted value for editing
      }
    });
    
    // Handle input to store raw value
    input.addEventListener('input', (e) => {
      // Store the raw numeric value, removing any formatting
      const cleanValue = e.target.value.replace(/\s/g, ''); // Remove spaces
      const numericValue = parseFloat(cleanValue);
      if (!isNaN(numericValue)) {
        e.target.dataset.rawValue = numericValue.toString();
      } else {
        // For non-numeric values, store as-is but don't break the system
        e.target.dataset.rawValue = e.target.value || '0';
      }
    });
    
    // Handle change
    input.addEventListener('change', (e) => {
      // Store the raw numeric value on change, ensuring large numbers are preserved
      const cleanValue = e.target.value.replace(/\s/g, ''); // Remove spaces
      const numericValue = parseFloat(cleanValue);
      if (!isNaN(numericValue)) {
        e.target.dataset.rawValue = numericValue.toString();
      } else {
        // For non-numeric values, store as-is but don't break the system
        e.target.dataset.rawValue = e.target.value || '0';
      }
      handleInputChange();
    });
  });
  
  // Range slider
  const slider = document.getElementById('beteiligung-slider');
  const numberInput = document.getElementById('beteiligung');
  if (slider) {
    slider.addEventListener('input', (e) => {
      numberInput.value = e.target.value;
      handleInputChange();
    });
  }
  if (numberInput) {
    numberInput.addEventListener('input', (e) => {
      slider.value = e.target.value;
      handleInputChange();
    });
  }
  
  // Partner split controls
  const partnerSlider = document.getElementById('partner-split-slider');
  const partnerAInput = document.getElementById('partner-a-percent');
  const partnerBInput = document.getElementById('partner-b-percent');
  
  if (partnerSlider) {
    partnerSlider.addEventListener('input', (e) => {
      const valueA = parseInt(e.target.value);
      const valueB = 100 - valueA;
      state.partnerSplit.a = valueA;
      state.partnerSplit.b = valueB;
      partnerAInput.value = valueA;
      partnerBInput.value = valueB;
      updatePartnerSplitDisplay();
      calculate();
    });
  }
  
  // FIXED: Added null-safety for partner percentage inputs (they may not exist in current HTML)
  if (partnerAInput) {
    partnerAInput.addEventListener('input', (e) => {
      const valueA = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
      const valueB = 100 - valueA;
      state.partnerSplit.a = valueA;
      state.partnerSplit.b = valueB;
      if (partnerBInput) partnerBInput.value = valueB;
      if (partnerSlider) partnerSlider.value = valueA;
      updatePartnerSplitDisplay();
      calculate();
    });
  }
  
  if (partnerBInput) {
    partnerBInput.addEventListener('input', (e) => {
      const valueB = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
      const valueA = 100 - valueB;
      state.partnerSplit.a = valueA;
      state.partnerSplit.b = valueB;
      if (partnerAInput) partnerAInput.value = valueA;
      if (partnerSlider) partnerSlider.value = valueA;
      updatePartnerSplitDisplay();
      calculate();
    });
  } else {
    // NOTE: Partner percentage input fields don't exist in current HTML but slider functionality works
    console.log('Partner percentage input fields not found - slider-only mode');
  }
  
  // Partner-specific Zeit bis Verkauf inputs
  const bauzeitAInput = document.getElementById('bauzeit-a');
  const bauzeitBInput = document.getElementById('bauzeit-b');
  
  if (bauzeitAInput) {
    bauzeitAInput.addEventListener('change', handleInputChange);
  }
  
  if (bauzeitBInput) {
    bauzeitBInput.addEventListener('change', handleInputChange);
  }
  
  // Construction mode toggle
  document.querySelectorAll('input[name="construction-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.constructionMode = e.target.value;
      const simpleConstruction = document.getElementById('simple-construction');
      const detailedConstruction = document.getElementById('detailed-construction');
      
      if (state.constructionMode === 'simple') {
        simpleConstruction.style.display = 'block';
        detailedConstruction.style.display = 'none';
        // Show all input groups in simple mode
        document.querySelectorAll('#simple-construction .input-group').forEach(group => {
          group.style.display = 'block';
        });
      } else {
        simpleConstruction.style.display = 'block';
        detailedConstruction.style.display = 'block';
        // In detailed mode, hide only the "Baukosten pro m²" field
        document.querySelectorAll('#simple-construction .input-group').forEach(group => {
          const input = group.querySelector('input');
          if (input) {
            group.style.display = input.id === 'baukosten_qm' ? 'none' : 'block';
          }
        });
      }
      loadConstructionItems();
      calculate();
    });
  });
  
  // Property type select
  const propertyTypeSelect = document.getElementById('property-type-select');
  if (propertyTypeSelect) {
    propertyTypeSelect.addEventListener('change', updateMarketAnalysis);
  }
  
  // Scenario management
  document.getElementById('addScenarioBtn').addEventListener('click', addScenario);
  document.getElementById('copyScenarioBtn').addEventListener('click', copyScenario);
  document.getElementById('renameScenarioBtn').addEventListener('click', renameScenario);
  document.getElementById('deleteScenarioBtn').addEventListener('click', deleteScenario);
  
  // Save/Load
  document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
  document.getElementById('loadProjectBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', loadProject);
  
  // Export
  document.getElementById('exportBtn').addEventListener('click', exportData);
  
  // Revenue split controls
  const revenueFollowsCost = document.getElementById('revenue-follows-cost');
  const revenueSliderContainer = document.getElementById('revenue-split-slider-container');
  const revenueSlider = document.getElementById('revenue-split-slider');
  const revenueSplitADisplay = document.getElementById('revenue-split-a');
  const revenueSplitBDisplay = document.getElementById('revenue-split-b');
  
  if (revenueFollowsCost) {
    revenueFollowsCost.addEventListener('change', (e) => {
      state.revenueSplit.followsCostSplit = e.target.checked;
      revenueSliderContainer.style.display = e.target.checked ? 'none' : 'flex';
      
      if (e.target.checked) {
        // Sync revenue split with cost split
        state.revenueSplit.a = state.partnerSplit.a;
        state.revenueSplit.b = state.partnerSplit.b;
        revenuePartnerAInput.value = state.partnerSplit.a;
        revenuePartnerBInput.value = state.partnerSplit.b;
        revenueSlider.value = state.partnerSplit.a;
      }
      calculate();
    });
  }
  
  if (revenueSlider) {
    revenueSlider.addEventListener('input', (e) => {
      const valueA = parseInt(e.target.value);
      const valueB = 100 - valueA;
      state.revenueSplit.a = valueA;
      state.revenueSplit.b = valueB;
      if (revenueSplitADisplay) revenueSplitADisplay.textContent = valueA;
      if (revenueSplitBDisplay) revenueSplitBDisplay.textContent = valueB;
      calculate();
    });
  }
  
}

// Tab Switching
function switchTab(tab) {
  state.currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  
  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tab}-tab`);
  });
  
  // Update charts if analysis tab
  if (tab === 'analysis') {
    updateMarketAnalysis();
    // Reinitialize map when switching to analysis tab
    setTimeout(() => {
      initializeMap();
    }, 150);
  }
}

// Scenario Switching
function switchScenario(scenario) {
  state.currentScenario = scenario;
  
  // Update scenario tabs
  document.querySelectorAll('.scenario-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-scenario') === scenario);
  });
  
  loadScenario(scenario);
  loadConstructionItems();
  calculate();
}

// Load Scenario Data
function loadScenario(scenario) {
  const data = state.scenarios[scenario].data;
  
  Object.keys(data).forEach(key => {
    const input = document.getElementById(key);
    if (input) {
      const value = data[key];
      input.value = value;
      // Store the raw value for proper handling of large numbers
      input.dataset.rawValue = value.toString();
    }
  });
  
  // Update project name if it's a custom scenario
  if (!['realistic', 'best', 'worst'].includes(scenario)) {
    document.querySelector('.project-name').value = state.scenarios[scenario].name;
  }
}

// Load Construction Items
function loadConstructionItems() {
  if (state.constructionMode !== 'detailed') return;
  
  const container = document.getElementById('construction-items-list');
  const items = state.scenarios[state.currentScenario].constructionItems || [];
  
  container.innerHTML = '';
  
  items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'construction-item';
    itemDiv.setAttribute('data-id', item.id);
    itemDiv.innerHTML = `
      <input type="text" class="item-name" value="${item.name}" placeholder="Bezeichnung">
      <div class="currency-input">
        <input type="number" id="cost-${item.id}" value="${item.cost}" step="5000" min="0">
        <span class="currency">€</span>
      </div>
      <button class="remove-btn" onclick="removeConstructionItem('${item.id}')">Entfernen</button>
    `;
    
    container.appendChild(itemDiv);
    
    // Add event listeners
    itemDiv.querySelector('input[type="number"]').addEventListener('change', handleConstructionItemChange);
    itemDiv.querySelector('.item-name').addEventListener('change', (e) => {
      const itemObj = state.scenarios[state.currentScenario].constructionItems.find(i => i.id === item.id);
      if (itemObj) itemObj.name = e.target.value;
    });
  });
}

// Handle construction item change
function handleConstructionItemChange(e) {
  const itemId = e.target.id.replace('cost-', '');
  const value = parseFloat(e.target.value) || 0;
  const item = state.scenarios[state.currentScenario].constructionItems.find(i => i.id === itemId);
  if (item) {
    item.cost = value;
    calculate();
  }
}

// Save Current Values
function saveCurrentValues() {
  const inputs = document.querySelectorAll('input[type="number"]');
  const data = {};
  
  inputs.forEach(input => {
    if (input.id && !input.id.startsWith('cost-')) {
      // Use raw value if available, otherwise parse formatted value
      const rawValue = input.dataset.rawValue;
      const value = rawValue ? parseFloat(rawValue) : parseFormattedNumber(input.value);
      data[input.id] = isNaN(value) ? 0 : value;
    }
  });
  
  state.scenarios[state.currentScenario].data = data;
}

// Handle Input Changes
function handleInputChange() {
  saveCurrentValues();
  calculate();
}

// Helper function to format inputs properly, including zero values
function formatInputValue(value) {
  if (value === 0 || value === '0') {
    return '0';
  }
  return value;
}

// Step Input Values
function stepInput(inputId, step) {
  const input = document.getElementById(inputId);
  if (input) {
    // Use raw value if available, otherwise parse formatted value
    const rawValue = input.dataset.rawValue;
    const currentValue = rawValue ? parseFloat(rawValue) : parseFormattedNumber(input.value) || 0;
    let newValue = currentValue + step;
    
    // Apply min/max constraints
    const minValue = parseFloat(input.getAttribute('min')) || 0;
    const maxValue = parseFloat(input.getAttribute('max'));
    
    newValue = Math.max(minValue, newValue);
    if (maxValue !== null && !isNaN(maxValue)) {
      newValue = Math.min(maxValue, newValue);
    }
    
    // For percentage inputs, round to one decimal place
    if (input.type === 'number' && input.step && parseFloat(input.step) === 0.1) {
      newValue = Math.round(newValue * 10) / 10;
    }
    
    input.value = newValue;
    input.dataset.rawValue = newValue;
    handleInputChange();
  }
}

// Toggle Partner View
function togglePartnerView(view) {
  state.partnerView = view;
  
  // Update toggle buttons
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === view);
  });
  
  // Update financing view
  const combinedView = document.querySelector('.combined-view');
  const splitView = document.querySelector('.split-view');
  const partnerPropertyCosts = document.getElementById('partner-property-costs');
  const partnerMetrics = document.getElementById('partner-metrics');
  const partnerAllocationBars = document.querySelector('.partner-allocation-bars');
  
  // Toggle combined/split only elements
  document.querySelectorAll('.combined-only').forEach(el => {
    el.style.display = view === 'combined' ? 'block' : 'none';
  });
  document.querySelectorAll('.split-only').forEach(el => {
    el.style.display = view === 'split' ? 'block' : 'none';
  });
  
  if (view === 'combined') {
    combinedView.style.display = 'block';
    splitView.style.display = 'none';
    document.getElementById('partnerSummary').style.display = 'none';
    document.getElementById('revenue-split').style.display = 'none';
    if (partnerPropertyCosts) partnerPropertyCosts.style.display = 'none';
    if (partnerMetrics) partnerMetrics.style.display = 'none';
  } else {
    combinedView.style.display = 'none';
    splitView.style.display = 'grid';
    document.getElementById('partnerSummary').style.display = 'block';
    document.getElementById('revenue-split').style.display = 'block';
    if (partnerPropertyCosts) partnerPropertyCosts.style.display = 'grid';
    if (partnerMetrics) partnerMetrics.style.display = 'block';
  }
  
  calculate();
}

// Update partner split display
function updatePartnerSplitDisplay() {
  document.getElementById('partner-a-split').textContent = state.partnerSplit.a;
  document.getElementById('partner-b-split').textContent = state.partnerSplit.b;
  document.querySelectorAll('.partner-a-percent').forEach(el => {
    el.textContent = state.partnerSplit.a;
  });
  document.querySelectorAll('.partner-b-percent').forEach(el => {
    el.textContent = state.partnerSplit.b;
  });
  const partnerAPercentage = document.querySelector('.partner-a-percentage');
  const partnerBPercentage = document.querySelector('.partner-b-percentage');
  if (partnerAPercentage) partnerAPercentage.textContent = `${state.partnerSplit.a}%`;
  if (partnerBPercentage) partnerBPercentage.textContent = `${state.partnerSplit.b}%`;
  
  // Update summary headers
  const partnerASummaryHeader = document.getElementById('partner-a-summary-header');
  const partnerBSummaryHeader = document.getElementById('partner-b-summary-header');
  if (partnerASummaryHeader) partnerASummaryHeader.textContent = `Klaus (${state.partnerSplit.a}%)`;
  if (partnerBSummaryHeader) partnerBSummaryHeader.textContent = `Kevin (${state.partnerSplit.b}%)`;
  
  // Update revenue split if it follows cost split
  if (state.revenueSplit.followsCostSplit) {
    state.revenueSplit.a = state.partnerSplit.a;
    state.revenueSplit.b = state.partnerSplit.b;
    const revenueSplitADisplay = document.getElementById('revenue-split-a');
    const revenueSplitBDisplay = document.getElementById('revenue-split-b');
    const revenueSlider = document.getElementById('revenue-split-slider');
    if (revenueSplitADisplay) revenueSplitADisplay.textContent = state.partnerSplit.a;
    if (revenueSplitBDisplay) revenueSplitBDisplay.textContent = state.partnerSplit.b;
    if (revenueSlider) revenueSlider.value = state.partnerSplit.a;
  }
}

// Format Currency
function formatCurrency(value) {
  if (isNaN(value) || value === null || value === undefined) {
    value = 0;
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format Percentage
function formatPercent(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}

// Format number for display (with thousand separators)
function formatNumber(value) {
  if (value === 0 || value === '0' || value === null || value === undefined) {
    return '0';
  }
  
  // FIXED: Handle large numbers properly and prevent formatting errors
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return '0';
  }
  
  // FIXED: Use proper options for large number formatting
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(numValue);
}

// Parse formatted number back to float
function parseFormattedNumber(value) {
  if (typeof value === 'string') {
    // Handle German number format (dots as thousand separators, comma as decimal)
    let cleanValue = value.trim().replace(/\s/g, ''); // Remove spaces
    
    // Check if this looks like a German formatted number (contains dots but no comma, or dots before comma)
    const dotCount = (cleanValue.match(/\./g) || []).length;
    const commaCount = (cleanValue.match(/,/g) || []).length;
    
    if (dotCount > 0 && commaCount === 0) {
      // Likely German thousand separators only (e.g., "2.200.000")
      cleanValue = cleanValue.replace(/\./g, '');
    } else if (dotCount > 0 && commaCount === 1) {
      // German format with decimals (e.g., "2.200.000,50")
      const lastCommaIndex = cleanValue.lastIndexOf(',');
      const beforeComma = cleanValue.substring(0, lastCommaIndex);
      const afterComma = cleanValue.substring(lastCommaIndex + 1);
      cleanValue = beforeComma.replace(/\./g, '') + '.' + afterComma;
    } else if (dotCount === 0 && commaCount === 1) {
      // Just decimal comma (e.g., "1000,50")
      cleanValue = cleanValue.replace(',', '.');
    } else if (dotCount > 0 && commaCount === 0) {
      // Could be English decimal format or German thousands - assume German thousands if multiple dots
      if (dotCount > 1) {
        cleanValue = cleanValue.replace(/\./g, '');
      }
      // If single dot, keep as decimal point (English format)
    }
    
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Calculate All Values
function calculate() {
  const data = state.scenarios[state.currentScenario].data;
  
  // Property costs
  // FIXED: Add proper rounding to prevent floating point precision issues
  const maklergebuehr = Math.round(data.grundstueck * (data.makler / 100));
  const grunderwerbsteuer = Math.round(data.grundstueck * 0.035);
  const notarkosten = Math.round(data.grundstueck * 0.015);
  const propertyTotal = data.grundstueck + maklergebuehr + grunderwerbsteuer + notarkosten + data.abriss;
  
  // Update property UI
  document.getElementById('maklergebuehr').textContent = formatCurrency(maklergebuehr);
  document.getElementById('grunderwerbsteuer').textContent = formatCurrency(grunderwerbsteuer);
  document.getElementById('notarkosten').textContent = formatCurrency(notarkosten);
  document.getElementById('property-total').textContent = formatCurrency(propertyTotal);
  
  // Construction costs
  let reineBaukosten;
  if (state.constructionMode === 'simple') {
    reineBaukosten = data.wohnflaeche * data.baukosten_qm;
  } else {
    // Sum up detailed construction items
    reineBaukosten = state.scenarios[state.currentScenario].constructionItems.reduce((sum, item) => {
      return sum + item.cost;
    }, 0);
  }
  
  // FIXED: Add proper rounding to prevent floating point precision issues  
  const baunebenkosten = Math.round(reineBaukosten * (data.baunebenkosten / 100));
  const zwischensumme = reineBaukosten + baunebenkosten;
  const unvorhergesehen = Math.round(reineBaukosten * (data.unvorhergesehen / 100));
  const constructionTotal = reineBaukosten + baunebenkosten + unvorhergesehen;
  
  // Update construction UI
  document.getElementById('reine-baukosten').textContent = formatCurrency(reineBaukosten);
  document.getElementById('calc-baunebenkosten').textContent = formatCurrency(baunebenkosten);
  document.getElementById('calc-unvorhergesehen').textContent = formatCurrency(unvorhergesehen);
  document.getElementById('construction-total').textContent = formatCurrency(constructionTotal);
  
  // Update calculated cost per m² in detailed mode
  if (state.constructionMode === 'detailed') {
    const costPerSqm = data.wohnflaeche > 0 ? reineBaukosten / data.wohnflaeche : 0;
    const detailedCostDisplay = document.getElementById('detailed-cost-per-sqm');
    if (!detailedCostDisplay) {
      // Create the display element if it doesn't exist
      const detailedConstruction = document.getElementById('detailed-construction');
      const displayDiv = document.createElement('div');
      displayDiv.className = 'calculated-cost-display';
      displayDiv.innerHTML = `
        <h4>Berechnete Baukosten pro m²</h4>
        <div class="calculated-value" id="detailed-cost-per-sqm">${formatCurrency(costPerSqm)} /m²</div>
      `;
      detailedConstruction.appendChild(displayDiv);
    } else {
      detailedCostDisplay.textContent = formatCurrency(costPerSqm) + ' /m²';
    }
  }
  
  // Total investment
  const totalInvestment = propertyTotal + constructionTotal;
  
  // Update combined property + construction summary
  document.getElementById('total-property-construction').textContent = formatCurrency(totalInvestment);
  
  // Update financing tab displays - use total investment (property + construction)
  const totalProjectCost = propertyTotal + constructionTotal;
  document.getElementById('financing-property-cost').textContent = formatCurrency(totalProjectCost);
  if (state.partnerView === 'split') {
    document.getElementById('partner-a-property-cost').textContent = formatCurrency(totalProjectCost * (state.partnerSplit.a / 100));
    document.getElementById('partner-b-property-cost').textContent = formatCurrency(totalProjectCost * (state.partnerSplit.b / 100));
  }
  
  // Financing
  // UNIFIED: Use consistent calculation for both modes - always account for both eigenkapital and beleihung
  const yourShare = state.partnerView === 'combined' ? totalInvestment : totalInvestment * (data.beteiligung / 100);
  const creditNeeded = Math.max(0, yourShare - data.eigenkapital);
  
  // Calculate financing costs based on partner view
  let financingCosts;
  let creditA = 0, creditB = 0; // Define these in outer scope
  let financingCostsA = 0, financingCostsB = 0; // FIXED: Move variable declarations to outer scope
  
  if (state.partnerView === 'split') {
    // Calculate separate financing costs for each partner
    const shareA = totalInvestment * (state.partnerSplit.a / 100);
    const shareB = totalInvestment * (state.partnerSplit.b / 100);
    creditA = Math.max(0, shareA - (data.eigenkapital_a || 0));
    creditB = Math.max(0, shareB - (data.eigenkapital_b || 0));
    const bauzeitA = data.bauzeit_a || data.bauzeit || 18;
    const bauzeitB = data.bauzeit_b || data.bauzeit || 18;
    // FIXED: Add proper rounding to prevent floating point precision issues
    financingCostsA = Math.round(creditA * ((data.zinssatz_a || data.zinssatz) / 100) * (bauzeitA / 12));
    financingCostsB = Math.round(creditB * ((data.zinssatz_b || data.zinssatz) / 100) * (bauzeitB / 12));
    financingCosts = financingCostsA + financingCostsB;
  } else {
    // FIXED: Add proper rounding to prevent floating point precision issues
    financingCosts = Math.round(creditNeeded * (data.zinssatz / 100) * (data.bauzeit / 12));
  }
  
  // Update financing summary section
  document.getElementById('summary-eigenkapital').textContent = formatCurrency(data.eigenkapital);
  document.getElementById('summary-beleihung').textContent = formatCurrency(data.beleihung);
  document.getElementById('financing-need').textContent = formatCurrency(creditNeeded);
  document.getElementById('interest-rate-display').textContent = data.zinssatz;
  document.getElementById('bauzeit-display').textContent = data.bauzeit;
  document.getElementById('interest-costs').textContent = formatCurrency(financingCosts);
  
  const totalWithFinancing = totalInvestment + financingCosts;
  
  // Update financing allocation bars
  updateAllocationBars(data, totalInvestment, creditNeeded);
  
  // Partner split calculations - update credit display
  if (state.partnerView === 'split') {
    document.getElementById('kredit-a').textContent = formatCurrency(creditA);
    document.getElementById('kredit-b').textContent = formatCurrency(creditB);
    
    // Update Zinskosten displays for partners
    document.getElementById('zinskosten-a').textContent = formatCurrency(financingCostsA);
    document.getElementById('zinskosten-b').textContent = formatCurrency(financingCostsB);
    
    // Update rate and time displays
    document.getElementById('zinssatz-a-display').textContent = data.zinssatz_a || data.zinssatz;
    document.getElementById('zinssatz-b-display').textContent = data.zinssatz_b || data.zinssatz;
    document.getElementById('bauzeit-a-display').textContent = bauzeitA;
    document.getElementById('bauzeit-b-display').textContent = bauzeitB;
  }
  
  // Sale calculations
  // FIXED: Add proper rounding to prevent floating point precision issues
  const bruttoVerkauf = Math.round(data.wohnflaeche * data.verkaufspreis_qm);
  const vertriebskosten = Math.round(bruttoVerkauf * (data.vertriebskosten / 100));
  const sonstigeKostenProzent = data.sonstige_kosten_prozent || 5;
  const sonstigeKosten = Math.round(bruttoVerkauf * (sonstigeKostenProzent / 100));
  const nettoVerkauf = bruttoVerkauf - vertriebskosten - sonstigeKosten;
  
  // Update sale UI
  document.getElementById('brutto-verkauf').textContent = formatCurrency(bruttoVerkauf);
  document.getElementById('calc-vertriebskosten').textContent = formatCurrency(-vertriebskosten);
  document.getElementById('sales-costs-percent').textContent = `(${data.vertriebskosten}%)`;
  document.getElementById('sale-other-costs-value').textContent = formatCurrency(-sonstigeKosten);
  document.getElementById('sale-other-costs-percent').textContent = `(${sonstigeKostenProzent}%)`;
  document.getElementById('netto-verkauf').textContent = formatCurrency(nettoVerkauf);
  
  // Update neubau m² info in sale tab
  const sqmInfo = document.getElementById('neubau-sqm-info');
  if (sqmInfo) {
    sqmInfo.textContent = `${data.wohnflaeche} m²`;
  }
  
  // Update market comparison displays
  const yourPriceDisplay = document.getElementById('your-price-display');
  if (yourPriceDisplay) {
    yourPriceDisplay.textContent = formatCurrency(data.verkaufspreis_qm) + '/m²';
  }
  
  // Update partner sales calculations if in split mode
  if (state.partnerView === 'split') {
    const revenueSplitA = state.revenueSplit.followsCostSplit ? state.partnerSplit.a : state.revenueSplit.a;
    const revenueSplitB = state.revenueSplit.followsCostSplit ? state.partnerSplit.b : state.revenueSplit.b;
    
    const bruttoVerkaufA = Math.round(bruttoVerkauf * (revenueSplitA / 100));
    const bruttoVerkaufB = Math.round(bruttoVerkauf * (revenueSplitB / 100));
    
    const vertriebskostenA = Math.round(bruttoVerkaufA * (data.vertriebskosten / 100));
    const vertriebskostenB = Math.round(bruttoVerkaufB * (data.vertriebskosten / 100));
    
    const sonstigeKostenA = Math.round(bruttoVerkaufA * (sonstigeKostenProzent / 100));
    const sonstigeKostenB = Math.round(bruttoVerkaufB * (sonstigeKostenProzent / 100));
    
    const nettoVerkaufA = bruttoVerkaufA - vertriebskostenA - sonstigeKostenA;
    const nettoVerkaufB = bruttoVerkaufB - vertriebskostenB - sonstigeKostenB;
    
    // Update Klaus values
    document.getElementById('brutto-verkauf-a').textContent = formatCurrency(bruttoVerkaufA);
    document.getElementById('calc-vertriebskosten-a').textContent = formatCurrency(-vertriebskostenA);
    document.getElementById('sale-other-costs-a').textContent = formatCurrency(-sonstigeKostenA);
    document.getElementById('netto-verkauf-a').textContent = formatCurrency(nettoVerkaufA);
    
    // Update Kevin values
    document.getElementById('brutto-verkauf-b').textContent = formatCurrency(bruttoVerkaufB);
    document.getElementById('calc-vertriebskosten-b').textContent = formatCurrency(-vertriebskostenB);
    document.getElementById('sale-other-costs-b').textContent = formatCurrency(-sonstigeKostenB);
    document.getElementById('netto-verkauf-b').textContent = formatCurrency(nettoVerkaufB);
  }
  
  // Update partner revenue split display
  if (state.partnerView === 'split') {
    const revenueSplitA = state.revenueSplit.followsCostSplit ? state.partnerSplit.a : state.revenueSplit.a;
    const revenueSplitB = state.revenueSplit.followsCostSplit ? state.partnerSplit.b : state.revenueSplit.b;
    
    document.getElementById('revenue-split-a-display').textContent = revenueSplitA;
    document.getElementById('revenue-split-b-display').textContent = revenueSplitB;
    document.getElementById('partner-a-revenue').textContent = formatCurrency(nettoVerkauf * (revenueSplitA / 100));
    document.getElementById('partner-b-revenue').textContent = formatCurrency(nettoVerkauf * (revenueSplitB / 100));
  }
  
  // Profit calculations
  const projectProfit = nettoVerkauf - totalWithFinancing;
  
  // Calculate profit based on revenue split (if enabled) or cost split
  let yourProfit;
  if (state.partnerView === 'split') {
    // In partner view, use the revenue split for profit distribution
    const revenueSplitA = state.revenueSplit.followsCostSplit ? state.partnerSplit.a : state.revenueSplit.a;
    const revenueSplitB = state.revenueSplit.followsCostSplit ? state.partnerSplit.b : state.revenueSplit.b;
    
    // For display purposes, show partner A's profit as "your profit"
    yourProfit = projectProfit * (revenueSplitA / 100);
  } else {
    // In combined view, use the beteiligung percentage
    yourProfit = projectProfit * (data.beteiligung / 100);
  }
  
  const returnOnEquity = (yourProfit / yourFunds) * 100;
  const annualReturn = (Math.pow(1 + (yourProfit / yourFunds), 12 / data.bauzeit) - 1) * 100;
  
  // Update summary UI
  document.getElementById('total-investment').textContent = formatCurrency(totalWithFinancing);
  document.getElementById('project-profit').textContent = formatCurrency(projectProfit);
  const returnElement = document.getElementById('annual-return');
  returnElement.textContent = formatPercent(annualReturn);
  
  // Add arrow indicator based on return value
  const existingArrow = returnElement.parentElement.querySelector('.trend-indicator');
  if (existingArrow) existingArrow.remove();
  
  const arrow = document.createElement('span');
  arrow.className = 'trend-indicator';
  if (annualReturn < 0) {
    arrow.textContent = '↘';
    arrow.style.color = '#dc3545';
  } else if (annualReturn < 10) {
    arrow.textContent = '→';
    arrow.style.color = '#ffc107';
  } else {
    arrow.textContent = '↗';
    arrow.style.color = '#28a745';
  }
  arrow.style.marginLeft = '8px';
  arrow.style.fontWeight = 'bold';
  returnElement.parentElement.appendChild(arrow);
  
  // Do the same for project profit
  const profitElement = document.getElementById('project-profit');
  const existingProfitArrow = profitElement.parentElement.querySelector('.trend-indicator');
  if (existingProfitArrow) existingProfitArrow.remove();
  
  const profitArrow = document.createElement('span');
  profitArrow.className = 'trend-indicator';
  if (projectProfit < 0) {
    profitArrow.textContent = '↘';
    profitArrow.style.color = '#dc3545';
  } else {
    profitArrow.textContent = '↗';
    profitArrow.style.color = '#28a745';
  }
  profitArrow.style.marginLeft = '8px';
  profitArrow.style.fontWeight = 'bold';
  profitElement.parentElement.appendChild(profitArrow);
  
  // Update detailed breakdown with actual values
  updateDetailedBreakdown(data, maklergebuehr, grunderwerbsteuer, notarkosten, reineBaukosten, baunebenkosten, unvorhergesehen, totalInvestment);
  
  // Update partner metrics in split mode
  if (state.partnerView === 'split') {
    const revenueSplitA = state.revenueSplit.followsCostSplit ? state.partnerSplit.a : state.revenueSplit.a;
    const revenueSplitB = state.revenueSplit.followsCostSplit ? state.partnerSplit.b : state.revenueSplit.b;
    
    const shareA = totalInvestment * (state.partnerSplit.a / 100);
    const shareB = totalInvestment * (state.partnerSplit.b / 100);
    const profitA = projectProfit * (revenueSplitA / 100);
    const profitB = projectProfit * (revenueSplitB / 100);
    
    document.getElementById('partner-a-metric-percent').textContent = state.partnerSplit.a + '%';
    document.getElementById('partner-b-metric-percent').textContent = state.partnerSplit.b + '%';
    document.getElementById('partner-a-share').textContent = formatCurrency(shareA);
    document.getElementById('partner-b-share').textContent = formatCurrency(shareB);
    document.getElementById('partner-a-profit').textContent = formatCurrency(profitA);
    document.getElementById('partner-b-profit').textContent = formatCurrency(profitB);
  }
  
  // Update metric card colors based on profit/loss
  const profitCard = document.querySelector('.metric-card:has(#project-profit)');
  const returnCard = document.querySelector('.metric-card:has(#annual-return)');
  
  if (projectProfit > 0) {
    profitCard.classList.remove('loss');
    profitCard.classList.add('profit');
  } else {
    profitCard.classList.remove('profit');
    profitCard.classList.add('loss');
  }
  
  // Handle return card coloring with yellow for 0-10%
  returnCard.classList.remove('loss', 'profit', 'warning');
  if (annualReturn < 0) {
    returnCard.classList.add('loss');
  } else if (annualReturn < 10) {
    returnCard.classList.add('warning');
  } else {
    returnCard.classList.add('profit');
  }
  
  // Update partner percentage display  
  updatePartnerSplitDisplay();
  
  // Update financing total display (moved to earlier in the calculation)
  if (state.partnerView === 'split') {
    
    // Update partner summary values
    // Klaus
    document.getElementById('summary-eigenkapital-a').textContent = formatCurrency(data.eigenkapital_a);
    document.getElementById('summary-beleihung-a').textContent = formatCurrency(data.beleihung_a);
    document.getElementById('summary-kredit-a').textContent = formatCurrency(creditA);
    
    // Kevin
    document.getElementById('summary-eigenkapital-b').textContent = formatCurrency(data.eigenkapital_b);
    document.getElementById('summary-beleihung-b').textContent = formatCurrency(data.beleihung_b);
    document.getElementById('summary-kredit-b').textContent = formatCurrency(creditB);
    
    // Calculate partner profits based on revenue split
    const revenueSplitA = state.revenueSplit.followsCostSplit ? state.partnerSplit.a : state.revenueSplit.a;
    const revenueSplitB = state.revenueSplit.followsCostSplit ? state.partnerSplit.b : state.revenueSplit.b;
    
    const profitA = projectProfit * (revenueSplitA / 100);
    const profitB = projectProfit * (revenueSplitB / 100);
    
    document.getElementById('summary-gewinn-a').textContent = formatCurrency(profitA);
    document.getElementById('summary-gewinn-b').textContent = formatCurrency(profitB);
    
    // Calculate partner returns
    const fundsA = data.eigenkapital_a;
    const fundsB = data.eigenkapital_b;
    const returnA = fundsA > 0 ? (Math.pow(1 + (profitA / fundsA), 12 / data.bauzeit) - 1) * 100 : 0;
    const returnB = fundsB > 0 ? (Math.pow(1 + (profitB / fundsB), 12 / data.bauzeit) - 1) * 100 : 0;
    
    document.getElementById('summary-rendite-a').textContent = formatPercent(returnA);
    document.getElementById('summary-rendite-b').textContent = formatPercent(returnB);
  }
  
  // Prepare print view data
  updatePrintView();
  
  // Update price comparison if we're on the analysis tab
  if (state.currentTab === 'analysis') {
    const propertyType = document.getElementById('property-type-select')?.value || 'house';
    const historyData = priceHistoryData[propertyType];
    if (historyData) {
      updatePriceComparison(historyData);
    }
  }
}

// Update allocation bars for both combined and split views
function updateAllocationBars(data, totalInvestment, creditNeeded) {
  if (state.partnerView === 'combined') {
    // Update combined allocation bar
    const allocationBar = document.querySelector('.allocation-bar.combined-only');
    if (allocationBar) {
      const totalFinancing = totalInvestment;
      
      // FIXED: Prevent division by zero and NaN percentages
      if (totalFinancing <= 0) {
        console.warn('Total financing is zero or negative, skipping allocation bar update');
        return;
      }
      
      const eigenkapitalPercent = ((data.eigenkapital || 0) / totalFinancing) * 100;
      const beleihungPercent = ((data.beleihung || 0) / totalFinancing) * 100;
      const kreditPercent = (creditNeeded / totalFinancing) * 100;
      
      // FIXED: Ensure percentages are valid numbers and safely handle NaN
      const safeEigenkapitalPercent = isNaN(eigenkapitalPercent) ? 0 : Math.max(0, eigenkapitalPercent);
      const safeBeleihungPercent = isNaN(beleihungPercent) ? 0 : Math.max(0, beleihungPercent);
      const safeKreditPercent = isNaN(kreditPercent) ? 0 : Math.max(0, kreditPercent);
      
      // FIXED: Add null-safety for allocation bar elements
      const eigenkapitalBar = allocationBar.querySelector('.bar-segment.eigenkapital');
      const eigenkapitalPercentEl = allocationBar.querySelector('.bar-segment.eigenkapital .percentage');
      const beleihungBar = allocationBar.querySelector('.bar-segment.beleihung');
      const beleihungPercentEl = allocationBar.querySelector('.bar-segment.beleihung .percentage');
      const kreditBar = allocationBar.querySelector('.bar-segment.kredit');
      const kreditPercentEl = allocationBar.querySelector('.bar-segment.kredit .percentage');
      
      if (eigenkapitalBar && eigenkapitalPercentEl) {
        eigenkapitalBar.style.width = `${safeEigenkapitalPercent.toFixed(1)}%`;
        eigenkapitalPercentEl.textContent = `${safeEigenkapitalPercent.toFixed(0)}%`;
      }
      
      if (beleihungBar && beleihungPercentEl) {
        beleihungBar.style.width = `${safeBeleihungPercent.toFixed(1)}%`;
        beleihungPercentEl.textContent = `${safeBeleihungPercent.toFixed(0)}%`;
      }
      
      if (kreditBar && kreditPercentEl) {
        kreditBar.style.width = `${safeKreditPercent.toFixed(1)}%`;
        kreditPercentEl.textContent = `${safeKreditPercent.toFixed(0)}%`;
      }
    }
  } else {
    // Update partner allocation bars
    const klausInvestment = totalInvestment * state.partnerSplit.a / 100;
    const kevinInvestment = totalInvestment * state.partnerSplit.b / 100;
    
    // FIXED: Prevent division by zero errors in partner calculations
    if (klausInvestment <= 0 || kevinInvestment <= 0) {
      console.warn('Partner investment amounts are zero or negative, skipping partner allocation bars');
      return;
    }
    
    const klausCreditNeeded = Math.max(0, klausInvestment - (data.eigenkapital_a || 0));
    const kevinCreditNeeded = Math.max(0, kevinInvestment - (data.eigenkapital_b || 0));
    
    // Klaus allocation bar - with NaN protection
    const klausEigenkapitalPercent = ((data.eigenkapital_a || 0) / klausInvestment) * 100;
    const klausBeleihungPercent = ((data.beleihung_a || 0) / klausInvestment) * 100;
    const klausKreditPercent = (klausCreditNeeded / klausInvestment) * 100;
    
    const safeKlausEK = isNaN(klausEigenkapitalPercent) ? 0 : Math.max(0, klausEigenkapitalPercent);
    const safeKlausBel = isNaN(klausBeleihungPercent) ? 0 : Math.max(0, klausBeleihungPercent);
    const safeKlausKredit = isNaN(klausKreditPercent) ? 0 : Math.max(0, klausKreditPercent);
    
    // FIXED: Add null-safety for Klaus allocation bars
    const klausEKBar = document.getElementById('klaus-eigenkapital-bar');
    const klausEKPercentEl = document.getElementById('klaus-eigenkapital-percent');
    const klausBelBar = document.getElementById('klaus-beleihung-bar');
    const klausBelPercentEl = document.getElementById('klaus-beleihung-percent');
    const klausKreditBarEl = document.getElementById('klaus-kredit-bar');
    const klausKreditPercentEl = document.getElementById('klaus-kredit-percent');
    
    if (klausEKBar && klausEKPercentEl) {
      klausEKBar.style.width = `${safeKlausEK.toFixed(1)}%`;
      klausEKPercentEl.textContent = `${safeKlausEK.toFixed(0)}%`;
    }
    
    if (klausBelBar && klausBelPercentEl) {
      klausBelBar.style.width = `${safeKlausBel.toFixed(1)}%`;
      klausBelPercentEl.textContent = `${safeKlausBel.toFixed(0)}%`;
    }
    
    if (klausKreditBarEl && klausKreditPercentEl) {
      klausKreditBarEl.style.width = `${safeKlausKredit.toFixed(1)}%`;
      klausKreditPercentEl.textContent = `${safeKlausKredit.toFixed(0)}%`;
    }
    
    // Kevin allocation bar - with NaN protection
    const kevinEigenkapitalPercent = ((data.eigenkapital_b || 0) / kevinInvestment) * 100;
    const kevinBeleihungPercent = ((data.beleihung_b || 0) / kevinInvestment) * 100;
    const kevinKreditPercent = (kevinCreditNeeded / kevinInvestment) * 100;
    
    const safeKevinEK = isNaN(kevinEigenkapitalPercent) ? 0 : Math.max(0, kevinEigenkapitalPercent);
    const safeKevinBel = isNaN(kevinBeleihungPercent) ? 0 : Math.max(0, kevinBeleihungPercent);
    const safeKevinKredit = isNaN(kevinKreditPercent) ? 0 : Math.max(0, kevinKreditPercent);
    
    // FIXED: Add null-safety for Kevin allocation bars
    const kevinEKBar = document.getElementById('kevin-eigenkapital-bar');
    const kevinEKPercentEl = document.getElementById('kevin-eigenkapital-percent');
    const kevinBelBar = document.getElementById('kevin-beleihung-bar');
    const kevinBelPercentEl = document.getElementById('kevin-beleihung-percent');
    const kevinKreditBarEl = document.getElementById('kevin-kredit-bar');
    const kevinKreditPercentEl = document.getElementById('kevin-kredit-percent');
    
    if (kevinEKBar && kevinEKPercentEl) {
      kevinEKBar.style.width = `${safeKevinEK.toFixed(1)}%`;
      kevinEKPercentEl.textContent = `${safeKevinEK.toFixed(0)}%`;
    }
    
    if (kevinBelBar && kevinBelPercentEl) {
      kevinBelBar.style.width = `${safeKevinBel.toFixed(1)}%`;
      kevinBelPercentEl.textContent = `${safeKevinBel.toFixed(0)}%`;
    }
    
    if (kevinKreditBarEl && kevinKreditPercentEl) {
      kevinKreditBarEl.style.width = `${safeKevinKredit.toFixed(1)}%`;
      kevinKreditPercentEl.textContent = `${safeKevinKredit.toFixed(0)}%`;
    }
  }
}

// Add construction item
window.addConstructionItem = function() {
  const id = `item_${Date.now()}`;
  const newItem = { id, name: 'Neue Position', cost: 0 };
  state.scenarios[state.currentScenario].constructionItems.push(newItem);
  
  const container = document.getElementById('construction-items-list');
  const itemDiv = document.createElement('div');
  itemDiv.className = 'construction-item';
  itemDiv.setAttribute('data-id', id);
  itemDiv.innerHTML = `
    <input type="text" class="item-name" value="${newItem.name}" placeholder="Bezeichnung">
    <div class="currency-input">
      <input type="number" id="cost-${id}" value="${newItem.cost}" step="5000" min="0">
      <span class="currency">€</span>
    </div>
    <button class="remove-btn" onclick="removeConstructionItem('${id}')">Entfernen</button>
  `;
  
  container.appendChild(itemDiv);
  
  // Add event listeners
  itemDiv.querySelector('input[type="number"]').addEventListener('change', handleConstructionItemChange);
  itemDiv.querySelector('.item-name').addEventListener('change', (e) => {
    const item = state.scenarios[state.currentScenario].constructionItems.find(i => i.id === id);
    if (item) item.name = e.target.value;
  });
  
  calculate();
};

// Remove construction item
window.removeConstructionItem = function(id) {
  if (state.scenarios[state.currentScenario].constructionItems.length <= 1) {
    alert('Mindestens eine Position muss vorhanden sein.');
    return;
  }
  
  state.scenarios[state.currentScenario].constructionItems = 
    state.scenarios[state.currentScenario].constructionItems.filter(item => item.id !== id);
  const element = document.querySelector(`.construction-item[data-id="${id}"]`);
  if (element) element.remove();
  calculate();
};

// Update print view
function updatePrintView() {
  const scenarios = ['realistic', 'best', 'worst'];
  const printScenarios = document.getElementById('print-scenarios');
  const projectName = document.querySelector('.project-name').value || 'Immobilienprojekt';
  
  document.getElementById('print-project-name').textContent = projectName;
  document.getElementById('print-date').textContent = new Date().toLocaleDateString('de-DE');
  
  if (!printScenarios) return;
  
  printScenarios.innerHTML = '';
  
  scenarios.forEach(scenario => {
    const data = state.scenarios[scenario].data;
    const scenarioResults = calculateScenarioResults(scenario);
    
    const scenarioDiv = document.createElement('div');
    scenarioDiv.className = `print-scenario ${scenario}`;
    scenarioDiv.innerHTML = `
      <h3>${state.scenarios[scenario].name}</h3>
      <div class="print-metric">
        <span>Gesamtinvestition:</span>
        <span class="value">${formatCurrency(scenarioResults.totalInvestment)}</span>
      </div>
      <div class="print-metric">
        <span>Verkaufserlös:</span>
        <span class="value">${formatCurrency(scenarioResults.netSale)}</span>
      </div>
      <div class="print-metric">
        <span>Projektgewinn:</span>
        <span class="value" style="color: ${scenarioResults.profit > 0 ? 'green' : 'red'}">
          ${formatCurrency(scenarioResults.profit)}
        </span>
      </div>
      <div class="print-metric">
        <span>Rendite p.a.:</span>
        <span class="value">${formatPercent(scenarioResults.annualReturn)}</span>
      </div>
    `;
    printScenarios.appendChild(scenarioDiv);
  });
  
  // Key data
  const keyData = document.getElementById('print-key-data');
  if (keyData) {
    const currentData = state.scenarios[state.currentScenario].data;
    keyData.innerHTML = `
      <div class="print-data-item">
        <span>Grundstück:</span>
        <span>${formatCurrency(currentData.grundstueck)}</span>
      </div>
      <div class="print-data-item">
        <span>Wohnfläche:</span>
        <span>${currentData.wohnflaeche} m²</span>
      </div>
      <div class="print-data-item">
        <span>Baukosten/m²:</span>
        <span>${formatCurrency(currentData.baukosten_qm)}</span>
      </div>
      <div class="print-data-item">
        <span>Verkaufspreis/m²:</span>
        <span>${formatCurrency(currentData.verkaufspreis_qm)}</span>
      </div>
      <div class="print-data-item">
        <span>Eigenkapital:</span>
        <span>${formatCurrency(currentData.eigenkapital)}</span>
      </div>
      <div class="print-data-item">
        <span>Bauzeit:</span>
        <span>${currentData.bauzeit} Monate</span>
      </div>
    `;
  }
  
  // Add detailed cost breakdown
  const costDetails = document.getElementById('print-cost-details');
  if (costDetails) {
    const data = state.scenarios[state.currentScenario].data;
    // FIXED: Add proper rounding to prevent floating point precision issues
  const maklergebuehr = Math.round(data.grundstueck * (data.makler / 100));
    const grunderwerbsteuer = Math.round(data.grundstueck * 0.035);
    const notarkosten = Math.round(data.grundstueck * 0.015);
    const propertyTotal = data.grundstueck + maklergebuehr + grunderwerbsteuer + notarkosten + data.abriss;
    
    let reineBaukosten;
    if (state.constructionMode === 'detailed') {
      reineBaukosten = state.scenarios[state.currentScenario].constructionItems.reduce((sum, item) => sum + item.cost, 0);
    } else {
      reineBaukosten = data.wohnflaeche * data.baukosten_qm;
    }
    // FIXED: Add proper rounding to prevent floating point precision issues
  const baunebenkosten = Math.round(reineBaukosten * (data.baunebenkosten / 100));
    const unvorhergesehen = Math.round(reineBaukosten * (data.unvorhergesehen / 100));
    const constructionTotal = reineBaukosten + baunebenkosten + unvorhergesehen;
    
    costDetails.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 4px;"><strong>Immobilienkosten</strong></td>
          <td style="text-align: right; padding: 4px;"></td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Grundstückspreis</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(data.grundstueck)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Maklergebühr (${data.makler}%)</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(maklergebuehr)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Grunderwerbsteuer (3,5%)</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(grunderwerbsteuer)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Notar/Grundbuch (1,5%)</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(notarkosten)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Abrisskosten</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(data.abriss)}</td>
        </tr>
        <tr style="border-top: 1px solid #ddd; font-weight: bold;">
          <td style="padding: 4px;">Zwischensumme Immobilienkosten</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(propertyTotal)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px 4px 4px 4px;"><strong>Baukosten</strong></td>
          <td style="text-align: right; padding: 4px;"></td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Reine Baukosten</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(reineBaukosten)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Baunebenkosten (${data.baunebenkosten}%)</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(baunebenkosten)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Unvorhergesehenes (${data.unvorhergesehen}%)</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(unvorhergesehen)}</td>
        </tr>
        <tr style="border-top: 1px solid #ddd; font-weight: bold;">
          <td style="padding: 4px;">Zwischensumme Baukosten</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(constructionTotal)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px 4px 4px 4px;"><strong>Finanzierungskosten</strong></td>
          <td style="text-align: right; padding: 4px;"></td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Eigenkapital</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(data.eigenkapital)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Beleihung</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(data.beleihung)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Finanzierungsbedarf</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(Math.max(0, (propertyTotal + constructionTotal) * (data.beteiligung / 100) - data.eigenkapital))}</td>
        </tr>
        <tr>
          <td style="padding: 4px 4px 4px 20px;">Zinskosten (${data.zinssatz}% über ${data.bauzeit} Monate)</td>
          <td style="text-align: right; padding: 4px;">${formatCurrency(Math.round(Math.max(0, (propertyTotal + constructionTotal) * (data.beteiligung / 100) - data.eigenkapital) * (data.zinssatz / 100) * (data.bauzeit / 12)))}</td>
        </tr>
        <tr style="border-top: 2px solid #333; font-weight: bold; font-size: 11pt;">
          <td style="padding: 8px 4px;">Gesamtinvestition inkl. Finanzierung</td>
          <td style="text-align: right; padding: 8px 4px;">${formatCurrency(propertyTotal + constructionTotal + Math.round(Math.max(0, (propertyTotal + constructionTotal) * (data.beteiligung / 100) - data.eigenkapital) * (data.zinssatz / 100) * (data.bauzeit / 12)))}</td>
        </tr>
      </table>
    `;
  }
  
  // Add partner split if in split mode
  const partnerSplitDiv = document.getElementById('print-partner-split');
  const partnerDetails = document.getElementById('print-partner-details');
  if (partnerSplitDiv && partnerDetails) {
    if (state.partnerView === 'split') {
      // Get current data for partner calculations
      const currentData = state.scenarios[state.currentScenario].data;
      
      // Calculate partner-specific values for print view
      const results = calculateScenarioResults(state.currentScenario);
      const totalInvestment = results.totalInvestment;
      
      const shareA = totalInvestment * (state.partnerSplit.a / 100);
      const shareB = totalInvestment * (state.partnerSplit.b / 100);
      const fundsA = (currentData.eigenkapital_a || 0);
      const fundsB = (currentData.eigenkapital_b || 0);
      const creditA = Math.max(0, shareA - fundsA);
      const creditB = Math.max(0, shareB - fundsB);
      const bauzeitA = currentData.bauzeit_a || currentData.bauzeit || 18;
      const bauzeitB = currentData.bauzeit_b || currentData.bauzeit || 18;
      const financingCostsA = Math.round(creditA * ((currentData.zinssatz_a || currentData.zinssatz) / 100) * (bauzeitA / 12));
      const financingCostsB = Math.round(creditB * ((currentData.zinssatz_b || currentData.zinssatz) / 100) * (bauzeitB / 12));
      
      partnerSplitDiv.style.display = 'block';
      partnerDetails.className = 'print-partner-details';
      partnerDetails.innerHTML = `
        <div class="print-partner-column">
          <h4 style="color: #007bff; margin-bottom: 10px;">Klaus</h4>
          <div class="partner-detail-item">
            <span>Kostenanteil:</span>
            <span>${state.partnerSplit.a}%</span>
          </div>
          <div class="partner-detail-item">
            <span>Erlösanteil:</span>
            <span>${state.revenueSplit.a}%</span>
          </div>
          <div class="partner-detail-item">
            <span>Eigenkapital:</span>
            <span>${formatCurrency(currentData.eigenkapital_a || 0)}</span>
          </div>
          <div class="partner-detail-item">
            <span>Kreditbedarf:</span>
            <span>${formatCurrency(creditA)}</span>
          </div>
          <div class="partner-detail-item">
            <span>Zinskosten:</span>
            <span>${formatCurrency(financingCostsA)}</span>
          </div>
        </div>
        <div class="print-partner-column">
          <h4 style="color: #ff8c00; margin-bottom: 10px;">Kevin</h4>
          <div class="partner-detail-item">
            <span>Kostenanteil:</span>
            <span>${state.partnerSplit.b}%</span>
          </div>
          <div class="partner-detail-item">
            <span>Erlösanteil:</span>
            <span>${state.revenueSplit.b}%</span>
          </div>
          <div class="partner-detail-item">
            <span>Eigenkapital:</span>
            <span>${formatCurrency(currentData.eigenkapital_b || 0)}</span>
          </div>
          <div class="partner-detail-item">
            <span>Kreditbedarf:</span>
            <span>${formatCurrency(creditB)}</span>
          </div>
          <div class="partner-detail-item">
            <span>Zinskosten:</span>
            <span>${formatCurrency(financingCostsB)}</span>
          </div>
        </div>
      `;
    } else {
      partnerSplitDiv.style.display = 'none';
    }
  }
}

// Calculate scenario results
function calculateScenarioResults(scenario) {
  const data = state.scenarios[scenario].data;
  // FIXED: Add proper rounding to prevent floating point precision issues
  const maklergebuehr = Math.round(data.grundstueck * (data.makler / 100));
  const grunderwerbsteuer = Math.round(data.grundstueck * 0.035);
  const notarkosten = Math.round(data.grundstueck * 0.015);
  const propertyTotal = data.grundstueck + maklergebuehr + grunderwerbsteuer + notarkosten + data.abriss;
  
  let reineBaukosten;
  if (state.constructionMode === 'simple' || scenario !== state.currentScenario) {
    reineBaukosten = data.wohnflaeche * data.baukosten_qm;
  } else {
    reineBaukosten = state.scenarios[scenario].constructionItems.reduce((sum, item) => sum + item.cost, 0);
  }
  
  // FIXED: Add proper rounding to prevent floating point precision issues
  const baunebenkosten = Math.round(reineBaukosten * (data.baunebenkosten / 100));
  const unvorhergesehen = Math.round(reineBaukosten * (data.unvorhergesehen / 100));
  const constructionTotal = reineBaukosten + baunebenkosten + unvorhergesehen;
  
  const totalInvestment = propertyTotal + constructionTotal;
  const yourShare = totalInvestment * (data.beteiligung / 100);
  const yourFunds = data.eigenkapital;
  const creditNeeded = Math.max(0, yourShare - yourFunds);
  // FIXED: Add proper rounding to prevent floating point precision issues
  const financingCosts = Math.round(creditNeeded * (data.zinssatz / 100) * (data.bauzeit / 12));
  const totalWithFinancing = totalInvestment + financingCosts;
  
  // FIXED: Add proper rounding to prevent floating point precision issues
  const bruttoVerkauf = Math.round(data.wohnflaeche * data.verkaufspreis_qm);
  const vertriebskosten = Math.round(bruttoVerkauf * (data.vertriebskosten / 100));
  const sonstigeKostenProzent = data.sonstige_kosten_prozent || 5;
  const sonstigeKosten = Math.round(bruttoVerkauf * (sonstigeKostenProzent / 100));
  const nettoVerkauf = bruttoVerkauf - vertriebskosten - sonstigeKosten;
  
  const projectProfit = nettoVerkauf - totalWithFinancing;
  const yourProfit = projectProfit * (data.beteiligung / 100);
  const annualReturn = (Math.pow(1 + (yourProfit / yourFunds), 12 / data.bauzeit) - 1) * 100;
  
  return {
    totalInvestment: totalWithFinancing,
    netSale: nettoVerkauf,
    profit: projectProfit,
    annualReturn
  };
}

// Setup Charts
function setupCharts() {
  // Initialize map
  initializeMap();
  
  // Price development chart
  const priceCtx = document.getElementById('price-chart');
  if (priceCtx) {
    window.priceChart = new Chart(priceCtx, {
      type: 'line',
      data: {
        labels: ['2020', '2021', '2022', '2023', '2024'],
        datasets: [{
          label: 'Durchschnittspreis €/m²',
          data: [6890, 7250, 7850, 8200, 8450],
          borderColor: '#0066CC',
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('de-DE') + ' €';
              }
            }
          }
        }
      }
    });
  }
  
  // Interest rate chart
  const interestCtx = document.getElementById('interest-chart');
  if (interestCtx) {
    window.interestChart = new Chart(interestCtx, {
      type: 'line',
      data: {
        labels: ['2020', '2021', '2022', '2023', '2024'],
        datasets: [{
          label: 'Bauzinsen %',
          data: [1.2, 1.1, 2.8, 3.9, 3.7],
          borderColor: '#FF8C00',
          backgroundColor: 'rgba(255, 140, 0, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toFixed(1) + '%';
              }
            }
          }
        }
      }
    });
  }
}

// Historical price data for the last 5 years
const priceHistoryData = {
  house: [
    { year: 2020, price: 6890, change: 0, isFirst: true },
    { year: 2021, price: 7250, change: 5.22, trend: 'up' },
    { year: 2022, price: 7850, change: 8.28, trend: 'up' },
    { year: 2023, price: 8200, change: 4.46, trend: 'up' },
    { year: 2024, price: 8450, change: 3.05, trend: 'up' }
  ],
  'apartment-building': [
    { year: 2020, price: 6200, change: 0, isFirst: true },
    { year: 2021, price: 6850, change: 10.48, trend: 'up' },
    { year: 2022, price: 7200, change: 5.11, trend: 'up' },
    { year: 2023, price: 7500, change: 4.17, trend: 'up' },
    { year: 2024, price: 7320, change: -2.40, trend: 'down' } // FIXED: Added negative example
  ],
  flat: [
    { year: 2020, price: 7800, change: 0, isFirst: true },
    { year: 2021, price: 8200, change: 5.13, trend: 'up' },
    { year: 2022, price: 8900, change: 8.54, trend: 'up' },
    { year: 2023, price: 9100, change: 2.25, trend: 'up' },
    { year: 2024, price: 8950, change: -1.65, trend: 'down' } // FIXED: Added negative example
  ]
};

// Update price history table
// Update detailed breakdown table
function updateDetailedBreakdown(data, maklergebuehr, grunderwerbsteuer, notarkosten, reineBaukosten, baunebenkosten, unvorhergesehen, totalInvestment) {
  // Update values
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = formatCurrency(value);
  };
  
  const updatePercentage = (id, value, total) => {
    const element = document.getElementById(id);
    if (element) element.textContent = ((value / total) * 100).toFixed(1) + '%';
  };
  
  updateElement('breakdown-grundstueck', data.grundstueck);
  updatePercentage('breakdown-grundstueck-percent', data.grundstueck, totalInvestment);
  
  updateElement('breakdown-grunderwerbsteuer', grunderwerbsteuer);
  updatePercentage('breakdown-grunderwerbsteuer-percent', grunderwerbsteuer, totalInvestment);
  
  updateElement('breakdown-notar', notarkosten);
  updatePercentage('breakdown-notar-percent', notarkosten, totalInvestment);
  
  updateElement('breakdown-abriss', data.abriss);
  updatePercentage('breakdown-abriss-percent', data.abriss, totalInvestment);
  
  updateElement('breakdown-neubau', reineBaukosten);
  updatePercentage('breakdown-neubau-percent', reineBaukosten, totalInvestment);
  
  updateElement('breakdown-baunebenkosten', baunebenkosten);
  updatePercentage('breakdown-baunebenkosten-percent', baunebenkosten, totalInvestment);
  
  updateElement('breakdown-unvorhergesehenes', unvorhergesehen);
  updatePercentage('breakdown-unvorhergesehenes-percent', unvorhergesehen, totalInvestment);
  
  const totalElement = document.getElementById('breakdown-total');
  if (totalElement) {
    totalElement.innerHTML = `<strong>${formatCurrency(totalInvestment)}</strong>`;
  }
}

function updatePriceHistory() {
  const propertyType = document.getElementById('property-type-select')?.value || 'house';
  const historyData = priceHistoryData[propertyType];
  const tbody = document.getElementById('price-history-data');
  
  if (!tbody || !historyData) return;
  
  tbody.innerHTML = '';
  
  historyData.forEach(yearData => {
    const row = document.createElement('tr');
    
    // Format change percentage
    let changeText = '-';
    let changeClass = '';
    let trendArrow = '';
    
    if (!yearData.isFirst) {
      changeText = `${yearData.change > 0 ? '+' : ''}${yearData.change.toFixed(1)}%`;
      changeClass = yearData.change > 0 ? 'positive' : 'negative';
      // FIXED: Ensure arrows match the sign of the change, not just the trend field
      if (yearData.change > 0) {
        trendArrow = '↗';
      } else if (yearData.change < 0) {
        trendArrow = '↘';
      } else {
        trendArrow = '→'; // Neutral for zero change
      }
    }
    
    row.innerHTML = `
      <td><strong>${yearData.year}</strong></td>
      <td>${formatCurrency(yearData.price)} /m²</td>
      <td><span class="price-change ${changeClass}">${changeText}</span></td>
      <td><span class="trend-arrow ${yearData.trend || ''}">${trendArrow}</span></td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Update price comparison
  updatePriceComparison(historyData);
}

// Update price comparison section
function updatePriceComparison(historyData) {
  // Get current selling price from the project data
  const data = state.scenarios[state.currentScenario].data;
  const currentPrice = data.verkaufspreis_qm || 8750;
  
  // Calculate 5-year average
  const fiveYearAverage = historyData.reduce((sum, year) => sum + year.price, 0) / historyData.length;
  
  // Calculate difference
  const difference = ((currentPrice - fiveYearAverage) / fiveYearAverage) * 100;
  
  // Update DOM elements
  const currentPriceEl = document.getElementById('current-selling-price');
  const avgPriceEl = document.getElementById('five-year-average');
  const differencePriceEl = document.getElementById('price-difference');
  
  if (currentPriceEl) {
    currentPriceEl.textContent = formatCurrency(currentPrice) + ' /m²';
  }
  
  if (avgPriceEl) {
    avgPriceEl.textContent = formatCurrency(Math.round(fiveYearAverage)) + ' /m²';
  }
  
  if (differencePriceEl) {
    const sign = difference > 0 ? '+' : '';
    differencePriceEl.textContent = `${sign}${difference.toFixed(1)}%`;
    differencePriceEl.className = `price-difference ${difference > 0 ? 'positive' : 'negative'}`;
  }
}

// Update chart data based on property type
function updatePriceChart() {
  const propertyType = document.getElementById('property-type-select')?.value || 'house';
  const historyData = priceHistoryData[propertyType];
  
  if (window.priceChart && historyData) {
    const labels = historyData.map(item => item.year.toString());
    const data = historyData.map(item => item.price);
    
    window.priceChart.data.labels = labels;
    window.priceChart.data.datasets[0].data = data;
    window.priceChart.update();
  }
}

// Update Market Analysis
function updateMarketAnalysis() {
  const propertyType = document.getElementById('property-type-select').value;
  
  // Update stats based on property type
  const stats = {
    house: { avg: 8250, range: '6.500 - 10.500', volume: 342, duration: 87 },
    'apartment-building': { avg: 7500, range: '5.800 - 9.200', volume: 156, duration: 95 },
    flat: { avg: 9100, range: '7.200 - 11.500', volume: 523, duration: 72 }
  };
  
  const currentStats = stats[propertyType];
  
  // Update stat cards
  document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = 
    formatCurrency(currentStats.avg).replace(' €', ' €/m²');
  document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = 
    currentStats.range + ' €/m²';
  document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = 
    currentStats.volume + ' Objekte';
  document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = 
    currentStats.duration + ' Tage';
  
  // Update price history table and chart
  updatePriceHistory();
  updatePriceChart();
}

// Scenario Management Functions
function addScenario() {
  const name = prompt('Name für das neue Szenario:');
  if (name && name.trim()) {
    const id = `custom_${Date.now()}`;
    state.scenarios[id] = {
      name: name.trim(),
      data: { ...state.scenarios.realistic.data },
      constructionItems: state.scenarios.realistic.constructionItems.map(item => ({ ...item }))
    };
    
    // Add tab
    const newTab = document.createElement('button');
    newTab.className = 'scenario-tab';
    newTab.setAttribute('data-scenario', id);
    newTab.textContent = name;
    newTab.addEventListener('click', () => switchScenario(id));
    
    const addBtn = document.getElementById('addScenarioBtn');
    addBtn.parentNode.insertBefore(newTab, addBtn);
    
    switchScenario(id);
  }
}

function copyScenario() {
  const name = prompt('Name für die Kopie:');
  if (name && name.trim()) {
    const id = `custom_${Date.now()}`;
    state.scenarios[id] = {
      name: name.trim(),
      data: { ...state.scenarios[state.currentScenario].data },
      constructionItems: state.scenarios[state.currentScenario].constructionItems.map(item => ({ ...item }))
    };
    
    // Add tab
    const newTab = document.createElement('button');
    newTab.className = 'scenario-tab';
    newTab.setAttribute('data-scenario', id);
    newTab.textContent = name;
    newTab.addEventListener('click', () => switchScenario(id));
    
    const addBtn = document.getElementById('addScenarioBtn');
    addBtn.parentNode.insertBefore(newTab, addBtn);
    
    switchScenario(id);
  }
}

function renameScenario() {
  if (['realistic', 'best', 'worst'].includes(state.currentScenario)) {
    alert('Standard-Szenarien können nicht umbenannt werden.');
    return;
  }
  
  const newName = prompt('Neuer Name:', state.scenarios[state.currentScenario].name);
  if (newName && newName.trim()) {
    state.scenarios[state.currentScenario].name = newName.trim();
    const tab = document.querySelector(`.scenario-tab[data-scenario="${state.currentScenario}"]`);
    if (tab) {
      tab.textContent = newName.trim();
    }
  }
}

function deleteScenario() {
  if (['realistic', 'best', 'worst'].includes(state.currentScenario)) {
    alert('Standard-Szenarien können nicht gelöscht werden.');
    return;
  }
  
  if (confirm(`Szenario "${state.scenarios[state.currentScenario].name}" wirklich löschen?`)) {
    const tab = document.querySelector(`.scenario-tab[data-scenario="${state.currentScenario}"]`);
    if (tab) {
      tab.remove();
    }
    
    delete state.scenarios[state.currentScenario];
    switchScenario('realistic');
  }
}

// Save/Load Functions
function saveProject() {
  const projectName = document.querySelector('.project-name').value || 'Immobilienprojekt';
  const data = {
    projectName,
    ...state
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadProject(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      
      // Load project name
      document.querySelector('.project-name').value = data.projectName || '';
      
      // Load scenarios
      state.scenarios = data.scenarios;
      state.currentScenario = data.currentScenario || 'realistic';
      state.currentTab = data.currentTab || 'property';
      state.partnerView = data.partnerView || 'combined';
      state.constructionMode = data.constructionMode || 'simple';
      state.partnerSplit = data.partnerSplit || { a: 50, b: 50 };
      
      // Ensure revenueSplit is properly initialized
      state.revenueSplit = data.revenueSplit || {
        a: state.partnerSplit.a,
        b: state.partnerSplit.b,
        followsCostSplit: true
      };

      // Ensure all scenarios have required properties
      Object.keys(state.scenarios).forEach(scenarioId => {
        const scenario = state.scenarios[scenarioId];
        // Ensure constructionItems exists
        if (!scenario.constructionItems) {
          scenario.constructionItems = [];
        }
        // Ensure all required data properties exist with defaults
        if (!scenario.data) {
          scenario.data = {};
        }
        const defaultData = {
          sonstige_kosten_prozent: 5,
          eigenkapital_a: 0,
          eigenkapital_b: 0,
          beleihung_a: 0,
          beleihung_b: 0
        };
        Object.keys(defaultData).forEach(key => {
          if (scenario.data[key] === undefined) {
            scenario.data[key] = defaultData[key];
          }
        });
      });
      
      // Rebuild scenario tabs
      const container = document.getElementById('scenarioTabs');
      const existingCustomTabs = container.querySelectorAll('.scenario-tab[data-scenario^="custom_"]');
      existingCustomTabs.forEach(tab => tab.remove());
      
      // Add custom scenario tabs
      Object.keys(state.scenarios).forEach(id => {
        if (!['realistic', 'best', 'worst'].includes(id)) {
          const newTab = document.createElement('button');
          newTab.className = 'scenario-tab';
          newTab.setAttribute('data-scenario', id);
          newTab.textContent = state.scenarios[id].name;
          newTab.addEventListener('click', () => switchScenario(id));
          
          const addBtn = document.getElementById('addScenarioBtn');
          addBtn.parentNode.insertBefore(newTab, addBtn);
        }
      });
      
      // Load current scenario
      switchScenario(state.currentScenario);
      switchTab(state.currentTab);
      togglePartnerView(state.partnerView);
      
      // Update construction mode
      document.querySelector(`input[name="construction-mode"][value="${state.constructionMode}"]`).checked = true;
      document.getElementById('simple-construction').style.display = 
        state.constructionMode === 'simple' ? 'block' : 'none';
      document.getElementById('detailed-construction').style.display = 
        state.constructionMode === 'detailed' ? 'block' : 'none';
      
      loadConstructionItems();
      updatePartnerSplitDisplay();
      
      alert('Projekt erfolgreich geladen!');
    } catch (error) {
      alert('Fehler beim Laden der Datei: ' + error.message);
    }
  };
  
  reader.readAsText(file);
  e.target.value = ''; // Reset file input
}

// Export Functions
function exportData() {
  const data = state.scenarios[state.currentScenario].data;
  const projectName = document.querySelector('.project-name').value || 'Immobilienprojekt';
  
  // Calculate all values
  const grunderwerbsteuer = Math.round(data.grundstueck * 0.035);
  const notarkosten = Math.round(data.grundstueck * 0.015);
  const propertyTotal = data.grundstueck + grunderwerbsteuer + notarkosten + data.abriss;
  
  let reineBaukosten;
  if (state.constructionMode === 'simple') {
    reineBaukosten = data.wohnflaeche * data.baukosten_qm;
  } else {
    reineBaukosten = state.scenarios[state.currentScenario].constructionItems.reduce((sum, item) => sum + item.cost, 0);
  }
  
  // FIXED: Add proper rounding to prevent floating point precision issues
  const baunebenkosten = Math.round(reineBaukosten * (data.baunebenkosten / 100));
  const unvorhergesehen = Math.round(reineBaukosten * (data.unvorhergesehen / 100));
  const constructionTotal = reineBaukosten + baunebenkosten + unvorhergesehen;
  
  const totalInvestment = propertyTotal + constructionTotal;
  const yourShare = totalInvestment * (data.beteiligung / 100);
  const yourFunds = data.eigenkapital;
  const creditNeeded = Math.max(0, yourShare - yourFunds);
  // FIXED: Add proper rounding to prevent floating point precision issues
  const financingCosts = Math.round(creditNeeded * (data.zinssatz / 100) * (data.bauzeit / 12));
  const totalWithFinancing = totalInvestment + financingCosts;
  
  // FIXED: Add proper rounding to prevent floating point precision issues
  const bruttoVerkauf = Math.round(data.wohnflaeche * data.verkaufspreis_qm);
  const vertriebskosten = Math.round(bruttoVerkauf * (data.vertriebskosten / 100));
  const sonstigeKostenProzent = data.sonstige_kosten_prozent || 5;
  const sonstigeKosten = Math.round(bruttoVerkauf * (sonstigeKostenProzent / 100));
  const nettoVerkauf = bruttoVerkauf - vertriebskosten - sonstigeKosten;
  
  const projectProfit = nettoVerkauf - totalWithFinancing;
  const yourProfit = projectProfit * (data.beteiligung / 100);
  const annualReturn = (Math.pow(1 + (yourProfit / yourFunds), 12 / data.bauzeit) - 1) * 100;
  
  // Create CSV data
  const csvData = [
    ['K&K Immo Idee - Kalkulation Export'],
    ['Projekt:', projectName],
    ['Szenario:', state.scenarios[state.currentScenario].name],
    ['Datum:', new Date().toLocaleDateString('de-DE')],
    ['Konstruktionsmodus:', state.constructionMode === 'simple' ? 'Einfach' : 'Detailliert'],
    [''],
    ['EINGABEWERTE'],
    ['Grundstückspreis:', data.grundstueck + ' €'],
    ['Abrisskosten:', data.abriss + ' €'],
    ['Wohnfläche:', data.wohnflaeche + ' m²']
  ];

  // Add construction details based on mode
  if (state.constructionMode === 'simple') {
    csvData.push(['Baukosten pro m²:', data.baukosten_qm + ' €/m²']);
  } else {
    csvData.push(['DETAILLIERTE BAUKOSTEN']);
    const constructionItems = state.scenarios[state.currentScenario].constructionItems || [];
    constructionItems.forEach(item => {
      csvData.push([item.name + ':', Math.round(item.cost) + ' €']);
    });
    csvData.push(['']);
  }

  // Continue with other input values
  csvData.push(
    ['Baunebenkosten:', data.baunebenkosten + '%'],
    ['Unvorhergesehenes:', data.unvorhergesehen + '%']
  );

  // Add financing details based on partner view mode
  if (state.partnerView === 'combined') {
    csvData.push(
      ['Eigenkapital:', data.eigenkapital + ' €'],
      ['Beleihung:', data.beleihung + ' €'],
      ['Beteiligung:', data.beteiligung + '%']
    );
  } else {
    csvData.push(
      ['FINANZIERUNG KLAUS'],
      ['Eigenkapital Klaus:', data.eigenkapital_a + ' €'],
      ['Beleihung Klaus:', data.beleihung_a + ' €'],
      [''],
      ['FINANZIERUNG KEVIN'],
      ['Eigenkapital Kevin:', data.eigenkapital_b + ' €'],
      ['Beleihung Kevin:', data.beleihung_b + ' €'],
      ['']
    );
  }

  csvData.push(
    ['Zinssatz:', data.zinssatz + '%'],
    ['Bauzeit:', data.bauzeit + ' Monate'],
    ['Verkaufspreis pro m²:', data.verkaufspreis_qm + ' €/m²'],
    ['Vertriebskosten:', data.vertriebskosten + '%']
  );

  // Add sales cost breakdown if available
  if (data.sonstige_kosten_prozent) {
    csvData.push(['Sonstige Kosten:', data.sonstige_kosten_prozent + '%']);
  }

  csvData.push(
    [''],
    ['BERECHNETE WERTE'],
    ['Grunderwerbsteuer:', Math.round(grunderwerbsteuer) + ' €'],
    ['Notar/Grundbuch:', Math.round(notarkosten) + ' €'],
    ['Reine Baukosten:', Math.round(reineBaukosten) + ' €'],
    ['Baunebenkosten:', Math.round(baunebenkosten) + ' €'],
    ['Unvorhergesehenes:', Math.round(unvorhergesehen) + ' €'],
    ['Finanzierungskosten:', Math.round(financingCosts) + ' €'],
    [''],
    ['ERGEBNISSE'],
    ['Gesamtinvestition:', Math.round(totalWithFinancing) + ' €'],
    ['Ihr Anteil:', Math.round(yourShare) + ' €'],
    ['Kreditbedarf:', Math.round(creditNeeded) + ' €'],
    ['Brutto-Verkaufserlös:', Math.round(bruttoVerkauf) + ' €'],
    ['Vertriebskosten berechnet:', Math.round(vertriebskosten) + ' €'],
    ['Sonstige Kosten berechnet:', Math.round(sonstigeKosten) + ' €'],
    ['Netto-Verkaufserlös:', Math.round(nettoVerkauf) + ' €'],
    ['Projektgewinn:', Math.round(projectProfit) + ' €'],
    ['Ihr Gewinn:', Math.round(yourProfit) + ' €'],
    ['Rendite p.a.:', annualReturn.toFixed(1) + '%']
  );
  
  // Convert to CSV string
  const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  // Download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Override window.print to show print view
const originalPrint = window.print;
window.print = function() {
  updatePrintView();
  setTimeout(() => {
    originalPrint.call(window);
  }, 100);
}

// Global map variable
let leafletMap = null;
let districtMarkers = [];

// Initialize Leaflet map with Munich districts
function initializeMap() {
  // Check if we're on the analysis tab
  const analysisTab = document.getElementById('analysis-tab');
  if (!analysisTab || !analysisTab.classList.contains('active')) {
    return;
  }
  
  // Check if Munich districts data is available
  if (typeof munichDistrictsData === 'undefined') {
    console.error('Munich districts data not loaded');
    return;
  }
  
  // If map already exists, remove it
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
  
  // Create new map centered on Munich
  leafletMap = L.map('map-container').setView([48.1351, 11.5820], 11);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
    minZoom: 10
  }).addTo(leafletMap);
  
  // Clear existing markers
  districtMarkers.forEach(marker => marker.remove());
  districtMarkers = [];
  
  // Find min and max prices for color scaling
  let minPrice = Infinity;
  let maxPrice = 0;
  Object.values(munichDistrictsData).forEach(district => {
    if (district.avgPrice < minPrice) minPrice = district.avgPrice;
    if (district.avgPrice > maxPrice) maxPrice = district.avgPrice;
  });
  
  // Add district markers
  Object.entries(munichDistrictsData).forEach(([key, district]) => {
    // Calculate color based on price
    const priceRatio = (district.avgPrice - minPrice) / (maxPrice - minPrice);
    const hue = 120 - (priceRatio * 120); // From green (120) to red (0)
    const color = `hsl(${hue}, 70%, 50%)`;
    
    // Different marker sizes for core vs surrounding areas
    const markerSize = district.type === 'core' ? 40 : 35;
    const fontSize = district.type === 'core' ? '11px' : '10px';
    
    // Create custom icon with price color
    const customIcon = L.divIcon({
      className: 'custom-price-marker',
      html: `
        <div style="
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          width: ${markerSize}px;
          height: ${markerSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${fontSize};
          color: white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          opacity: ${district.type === 'core' ? 1 : 0.9};
        ">
          ${(district.avgPrice / 1000).toFixed(1)}k
        </div>
      `,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize/2, markerSize/2]
    });
    
    // Create detailed popup content
    const popupContent = `
      <div style="min-width: 250px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">${district.name}</h4>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 3px 0;"><strong>Durchschnittspreis:</strong></td>
            <td style="text-align: right;">${formatCurrency(district.avgPrice)}/m²</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Preisspanne:</strong></td>
            <td style="text-align: right;">${formatCurrency(district.priceRange.min)} - ${formatCurrency(district.priceRange.max)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Durchschnittsmiete:</strong></td>
            <td style="text-align: right;">${district.avgRent} €/m²</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Einwohner:</strong></td>
            <td style="text-align: right;">${district.population.toLocaleString('de-DE')}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Jährlicher Trend:</strong></td>
            <td style="text-align: right;">${((district.trend - 1) * 100).toFixed(1)}%</td>
          </tr>
        </table>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          <strong>Eigenschaften:</strong><br>
          <div style="margin-top: 5px;">
            ${district.characteristics.map(char => 
              `<span style="display: inline-block; background: #f0f0f0; padding: 2px 8px; margin: 2px; border-radius: 12px; font-size: 12px;">${char}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Create marker
    const marker = L.marker([district.lat, district.lng], { icon: customIcon })
      .addTo(leafletMap)
      .bindPopup(popupContent, {
        maxWidth: 300,
        className: 'district-popup'
      });
    
    // Add click event to update selected district
    marker.on('click', function() {
      updateSelectedDistrict(key, district);
    });
    
    districtMarkers.push(marker);
  });
  
  // Add legend to map
  const legend = L.control({ position: 'bottomright' });
  
  legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'map-legend');
    div.style.background = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
    div.style.fontSize = '12px';
    
    // Create gradient bar with Munich-specific prices
    const gradientHtml = `
      <div style="margin-bottom: 5px; font-weight: bold;">Preisspanne München</div>
      <div style="background: linear-gradient(to right, hsl(120, 70%, 50%), hsl(60, 70%, 50%), hsl(0, 70%, 50%)); 
                  width: 150px; height: 20px; border: 1px solid #ccc;"></div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 5px;">
        <span>${formatCurrency(minPrice)}</span>
        <span>${formatCurrency((minPrice + maxPrice) / 2)}</span>
        <span>${formatCurrency(maxPrice)}</span>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; width: 12px; height: 12px; background: #0066CC; border-radius: 50%; margin-right: 5px;"></span>
          Stadtbezirke
        </div>
        <div>
          <span style="display: inline-block; width: 12px; height: 12px; background: #0066CC; opacity: 0.7; border-radius: 50%; margin-right: 5px;"></span>
          Umland
        </div>
      </div>
    `;
    
    div.innerHTML = gradientHtml;
    return div;
  };
  
  legend.addTo(leafletMap);
  
  // Add info control
  const info = L.control({ position: 'topright' });
  
  info.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'map-info');
    div.style.background = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
    div.style.fontSize = '12px';
    div.innerHTML = '<strong>Klicken Sie auf einen Bezirk für Details</strong>';
    return div;
  };
  
  info.addTo(leafletMap);
  
  // Invalidate size to ensure proper rendering
  setTimeout(() => {
    if (leafletMap) {
      leafletMap.invalidateSize();
    }
  }, 100);
}

// Update selected district information
function updateSelectedDistrict(key, district) {
  // Update the location input
  const locationInput = document.getElementById('market-location-input');
  if (locationInput) {
    locationInput.value = district.name;
  }
  
  // Update market statistics
  const avgPriceElement = document.querySelector('.stat-card:first-child .stat-value');
  if (avgPriceElement) {
    avgPriceElement.textContent = formatCurrency(district.avgPrice) + '/m²';
  }
  
  // Update price range
  const priceRangeElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
  if (priceRangeElement) {
    priceRangeElement.textContent = `${formatCurrency(district.priceRange.min)} - ${formatCurrency(district.priceRange.max)}`;
  }
  
  // Update average rent
  const rentElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
  if (rentElement) {
    rentElement.textContent = district.avgRent + ' €/m²';
  }
  
  // Update yearly trend
  const trendElement = document.querySelector('.stat-card:nth-child(4) .stat-value');
  if (trendElement) {
    const trendPercent = ((district.trend - 1) * 100).toFixed(1);
    trendElement.textContent = `+${trendPercent}%`;
  }
  
  // Update map title
  const mapTitle = document.querySelector('.map-section h3');
  if (mapTitle) {
    mapTitle.textContent = `Immobilienpreise in ${district.name}`;
  }
  
  // Update price comparison
  const comparisonInfo = document.querySelector('.comparison-info');
  if (comparisonInfo) {
    const currentPrice = state.scenarios[state.currentScenario].data.verkaufspreis_qm;
    const priceComparison = currentPrice > district.avgPrice 
      ? `${((currentPrice / district.avgPrice - 1) * 100).toFixed(1)}% über dem Durchschnitt`
      : `${((1 - currentPrice / district.avgPrice) * 100).toFixed(1)}% unter dem Durchschnitt`;
    
    comparisonInfo.innerHTML = `
      <p>Durchschnittspreis in ${district.name}: <strong>${formatCurrency(district.priceRange.min)}-${formatCurrency(district.priceRange.max)} €/m²</strong></p>
      <p>Ihr Preis liegt bei: <strong class="highlight">${formatCurrency(currentPrice)} €/m²</strong></p>
      <p style="margin-top: 10px; font-style: italic;">${priceComparison}</p>
    `;
  }
  
  // Store selected district in state
  state.selectedDistrict = district;
  
  // Trigger calculation update
  calculate();
}

// Initialize on load
// Location data for major German cities and districts with coordinates
const locationData = {
  'München-Pasing': { 
    min: 7500, max: 9500, avg: 8750, 
    lat: 48.1463, lng: 11.4622, zoom: 13,
    districts: [
      { name: 'Pasing', lat: 48.1463, lng: 11.4622, price: 8750 },
      { name: 'Obermenzing', lat: 48.1718, lng: 11.4710, price: 8200 },
      { name: 'Aubing', lat: 48.1551, lng: 11.4092, price: 7500 },
      { name: 'Laim', lat: 48.1431, lng: 11.5016, price: 8900 },
      { name: 'Nymphenburg', lat: 48.1656, lng: 11.5033, price: 9200 }
    ]
  },
  'München-Schwabing': { 
    min: 8500, max: 11000, avg: 9750, 
    lat: 48.1644, lng: 11.5877, zoom: 13,
    districts: [
      { name: 'Schwabing-West', lat: 48.1644, lng: 11.5677, price: 9500 },
      { name: 'Schwabing-Ost', lat: 48.1644, lng: 11.6077, price: 10000 },
      { name: 'Maxvorstadt', lat: 48.1532, lng: 11.5700, price: 9750 }
    ]
  },
  'Berlin-Mitte': { 
    min: 5500, max: 8000, avg: 6750, 
    lat: 52.5200, lng: 13.4050, zoom: 12,
    districts: [
      { name: 'Mitte', lat: 52.5200, lng: 13.4050, price: 7000 },
      { name: 'Tiergarten', lat: 52.5138, lng: 13.3506, price: 6500 },
      { name: 'Wedding', lat: 52.5484, lng: 13.3658, price: 6250 }
    ]
  },
  'Berlin-Prenzlauer Berg': { 
    min: 6000, max: 8500, avg: 7250, 
    lat: 52.5385, lng: 13.4245, zoom: 13,
    districts: [
      { name: 'Prenzlauer Berg', lat: 52.5385, lng: 13.4245, price: 7500 },
      { name: 'Pankow', lat: 52.5690, lng: 13.4027, price: 7000 },
      { name: 'Weißensee', lat: 52.5556, lng: 13.4673, price: 7250 }
    ]
  },
  'Hamburg-Eppendorf': { 
    min: 7000, max: 10000, avg: 8500, 
    lat: 53.5950, lng: 9.9850, zoom: 13,
    districts: [
      { name: 'Eppendorf', lat: 53.5950, lng: 9.9850, price: 8500 },
      { name: 'Winterhude', lat: 53.5938, lng: 10.0046, price: 8200 },
      { name: 'Hoheluft', lat: 53.5861, lng: 9.9710, price: 8800 }
    ]
  },
  'Frankfurt-Westend': { 
    min: 7500, max: 12000, avg: 9750, 
    lat: 50.1188, lng: 8.6468, zoom: 13,
    districts: [
      { name: 'Westend-Nord', lat: 50.1268, lng: 8.6468, price: 10000 },
      { name: 'Westend-Süd', lat: 50.1108, lng: 8.6468, price: 9500 },
      { name: 'Bockenheim', lat: 50.1205, lng: 8.6329, price: 9000 }
    ]
  },
  'Köln-Lindenthal': { 
    min: 5000, max: 7500, avg: 6250, 
    lat: 50.9227, lng: 6.9166, zoom: 13,
    districts: [
      { name: 'Lindenthal', lat: 50.9227, lng: 6.9166, price: 6500 },
      { name: 'Sülz', lat: 50.9115, lng: 6.9345, price: 6000 },
      { name: 'Klettenberg', lat: 50.9031, lng: 6.9264, price: 6250 }
    ]
  },
  'Stuttgart-Mitte': { 
    min: 6500, max: 9000, avg: 7750, 
    lat: 48.7758, lng: 9.1829, zoom: 13,
    districts: [
      { name: 'Mitte', lat: 48.7758, lng: 9.1829, price: 8000 },
      { name: 'Süd', lat: 48.7658, lng: 9.1729, price: 7500 },
      { name: 'West', lat: 48.7758, lng: 9.1629, price: 7750 }
    ]
  },
  'Düsseldorf-Oberkassel': { 
    min: 6000, max: 8500, avg: 7250, 
    lat: 51.2291, lng: 6.7569, zoom: 13,
    districts: [
      { name: 'Oberkassel', lat: 51.2291, lng: 6.7569, price: 7500 },
      { name: 'Niederkassel', lat: 51.2165, lng: 6.7463, price: 7000 },
      { name: 'Lörick', lat: 51.2451, lng: 6.7337, price: 7250 }
    ]
  },
  'Leipzig-Zentrum': { 
    min: 3500, max: 5500, avg: 4500, 
    lat: 51.3397, lng: 12.3731, zoom: 13,
    districts: [
      { name: 'Zentrum', lat: 51.3397, lng: 12.3731, price: 4800 },
      { name: 'Zentrum-Süd', lat: 51.3297, lng: 12.3731, price: 4500 },
      { name: 'Zentrum-Nord', lat: 51.3497, lng: 12.3731, price: 4200 }
    ]
  }
};

// Update market location and all related displays
window.updateMarketLocation = function() {
  const locationInput = document.getElementById('market-location-input');
  const location = locationInput.value || 'München-Pasing';
  
  // Get location data or use default
  const data = locationData[location] || locationData['München-Pasing'];
  
  // Store in state
  state.marketLocation = location;
  state.marketData = data;
  
  // Update all location displays
  updateLocationDisplays(location, data);
  
  // Redraw map with new location
  initializeMap();
  
  // Update market comparison in sale tab
  const marketLocationDisplay = document.getElementById('market-location-display');
  if (marketLocationDisplay) {
    marketLocationDisplay.textContent = location;
  }
  
  // Update price comparison
  const comparisonInfo = document.querySelector('.comparison-info');
  if (comparisonInfo) {
    const priceRange = `${formatCurrency(data.min)}-${formatCurrency(data.max)} €/m²`;
    comparisonInfo.innerHTML = `
      <p>Durchschnittspreis in ${location}: <strong>${priceRange}</strong></p>
      <p>Ihr Preis liegt bei: <strong class="highlight">${document.getElementById('your-price-display')?.textContent || '8.750 €/m²'}</strong></p>
    `;
  }
  
  // Trigger recalculation to update any dependent values
  calculate();
};

// Update all location-specific displays
function updateLocationDisplays(location, data) {
  // Update map section title
  const mapSectionTitle = document.querySelector('.map-section h3');
  if (mapSectionTitle) {
    mapSectionTitle.textContent = `Durchschnittspreise pro m² in ${location}`;
  }
  
  // Update market stats
  const avgPriceElement = document.querySelector('.stat-card:first-child .stat-value');
  if (avgPriceElement) {
    avgPriceElement.textContent = formatCurrency(data.avg) + '/m²';
  }
  
  // Update price range
  const priceRangeElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
  if (priceRangeElement) {
    priceRangeElement.textContent = `${formatCurrency(data.min)} - ${formatCurrency(data.max)}`;
  }
  
  // Update footer note
  const footerNote = document.querySelector('.analysis-content small');
  if (footerNote) {
    footerNote.textContent = `* Basierend auf Marktdaten für ${location} und Umgebung`;
  }
}

// Add autocomplete functionality
function setupLocationAutocomplete() {
  const locationInput = document.getElementById('market-location-input');
  if (!locationInput) return;
  
  // Create datalist for autocomplete
  const datalist = document.createElement('datalist');
  datalist.id = 'location-suggestions';
  
  // Add all locations to datalist
  Object.keys(locationData).forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    datalist.appendChild(option);
  });
  
  // Add datalist to document and link to input
  locationInput.parentNode.appendChild(datalist);
  locationInput.setAttribute('list', 'location-suggestions');
  
  // Add input event listener for real-time updates
  locationInput.addEventListener('change', updateMarketLocation);
  locationInput.addEventListener('blur', updateMarketLocation);
}

document.addEventListener('DOMContentLoaded', init);