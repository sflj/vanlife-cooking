const categoriesMap = {
    "vege_fruit": ["onion", "tomatoes", "pepper", "zucchini", "mushroom", "lettuce", "garlic", "potato", "carrot", "lemon"],
    "proteins": ["egg", "chicken", "beef", "bacon", "sausage", "fish", "ham", "tuna"],
    "dairy": ["cheese", "milk", "butter"],
    "others": ["pasta", "bread", "water", "sugar", "flour", "oil"]
};

let translations = {};
let allRecipes = [];
let selectedIngredients = new Set();
let selectedToolIcon = null; 
let currentSort = 'name';

const filterBtn = document.getElementById('filter-btn');
const filterPanel = document.getElementById('filter-panel');
const recipeList = document.getElementById('recipe-list');
const accordionContainer = document.getElementById('filter-accordion-container');

// Otwieranie/Zamykanie przez guzik w headerze
filterBtn.onclick = () => {
    const isVisible = filterPanel.classList.toggle('visible');
    document.body.classList.toggle('modal-open', isVisible);
};

// Funkcja tłumacząca
function t(key, section = 'items') {
    return (translations[section] && translations[section][key]) ? translations[section][key] : key;
}

async function initApp() {
    const userLang = navigator.language.split('-')[0];
    const supported = ['pl', 'en', 'de'];
    const langToLoad = supported.includes(userLang) ? userLang : 'pl';

    try {
        const langRes = await fetch(`lang_${langToLoad}.json`);
        translations = await langRes.json();
    } catch (e) {
        console.warn("Language file not found, falling back to Polish.");
        const fallback = await fetch(`lang_pl.json`);
        translations = await fallback.json();
    }

    updateStaticUI();
    await fetchRecipes();
}

function updateStaticUI() {
    document.getElementById('ui-title').textContent = t('title', 'ui');
    document.getElementById('ui-vege-label').textContent = t('vege_only', 'ui');
    document.getElementById('apply-filters').textContent = t('filter_btn', 'ui');
}

async function fetchRecipes() {
    try {
        const response = await fetch(`recipes.json?t=${new Date().getTime()}`);
        allRecipes = await response.json();
        generateFilters(allRecipes);
        applyAndRender();
    } catch (err) {
        recipeList.innerHTML = "Error loading recipes.";
        console.error(err);
    }
}

function generateFilters(recipes) {
    const toolsData = new Map();
    const ingredientsMap = new Map();

    recipes.forEach(r => {
        r.mainIngredients.forEach(i => ingredientsMap.set(i.item, i.icon));
        if(r.tools) {
            r.tools.forEach(t => toolsData.set(t.icon, t.item));
        }
    });

    accordionContainer.innerHTML = '';

    // --- SPRZĘT ---
    const toolDet = document.createElement('details');
    toolDet.open = true;
    const toolSum = document.createElement('summary');
    toolSum.textContent = t('tool_header', 'ui');
    toolDet.appendChild(toolSum);

    const toolCont = document.createElement('div');
    toolCont.className = 'category-container';

    toolsData.forEach((itemName, icon) => {
        const chip = document.createElement('div');
        chip.className = 'ingredient-chip';
        chip.innerHTML = `${icon} ${t(itemName)}`;
        chip.onclick = () => {
            const isAlreadySelected = chip.classList.contains('tool-active');
            toolCont.querySelectorAll('.ingredient-chip').forEach(c => c.classList.remove('tool-active'));
            if (isAlreadySelected) {
                selectedToolIcon = null;
            } else {
                chip.classList.add('tool-active');
                selectedToolIcon = icon;
            }
        };
        toolCont.appendChild(chip);
    });
    toolDet.appendChild(toolCont);
    accordionContainer.appendChild(toolDet);

    // --- SKŁADNIKI ---
    for (const [catKey, items] of Object.entries(categoriesMap)) {
        const det = document.createElement('details');
        const sum = document.createElement('summary');
        sum.textContent = t(catKey, 'categories');
        det.appendChild(sum);

        const cont = document.createElement('div');
        cont.className = 'category-container';

        items.forEach(itemName => {
            const icon = ingredientsMap.get(itemName);
            if (!icon) return;

            const chip = document.createElement('div');
            chip.className = 'ingredient-chip';
            chip.innerHTML = `${icon} ${t(itemName)}`;
            chip.onclick = () => {
                chip.classList.toggle('active');
                selectedIngredients.has(itemName) ? selectedIngredients.delete(itemName) : selectedIngredients.add(itemName);
            };
            cont.appendChild(chip);
        });

        if (cont.children.length > 0) {
            det.appendChild(cont);
            accordionContainer.appendChild(det);
        }
    }
}

function setSort(type, btn) {
    currentSort = type;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyAndRender();
}

document.getElementById('apply-filters').onclick = () => {
    applyAndRender();
    filterPanel.classList.remove('visible');
    document.body.classList.remove('modal-open');
    window.scrollTo({
        top: 0,
        behavior: 'instant'
    });
};

function applyAndRender() {
    const vege = document.getElementById('vege-only').checked;

    let filtered = allRecipes.filter(r => {
        const tMatch = !selectedToolIcon || (r.tools && r.tools.some(t => t.icon === selectedToolIcon));
        const vMatch = !vege || r.tags.includes('vege');
        const rIngs = r.mainIngredients.map(i => i.item);
        const iMatch = Array.from(selectedIngredients).every(name => rIngs.includes(name));
        return tMatch && vMatch && iMatch;
    });

    filtered.sort((a, b) => {
        if (currentSort === 'name') return a.name.localeCompare(b.name);
        if (currentSort === 'energy') return b.energy - a.energy;
        if (currentSort === 'prepTime') return a.prepTime - b.prepTime;
        if (currentSort === 'difficulty') return a.difficulty - b.difficulty;
    });

    renderDeck(filtered);
}

function renderDeck(recipes) {
    recipeList.innerHTML = '';

    if (recipes.length === 0) {
        showEmptyState();
        return;
    }

    recipes.forEach(r => {
        const card = document.createElement('div');
        let typeClass = 'card-default';
        if (r.tags.includes('vege')) typeClass = 'card-vege';
        else if (r.tags.includes('fish')) typeClass = 'card-fish';
        card.className = `recipe-card ${typeClass}`;

        const icons = [...r.mainIngredients.map(i => i.icon), ...(r.tools ? r.tools.map(t => t.icon) : [])];
        
        card.innerHTML = `
            <div class="card-header"><span class="recipe-name">${r.name}</span></div>
            <div class="card-body">
                <div class="result-icon">${r.resultIcon}</div>
                <div class="ingredients-row">${icons.map(i => `<span>${i}</span>`).join('<span class="plus">+</span>')}</div>
            </div>
            <div class="card-footer">
                <div class="footer-left"><span class="diff-val">${"👨‍🍳".repeat(r.difficulty)}</span></div>
                <div class="footer-center">⏱️ ${r.prepTime} ${t('prep_time', 'ui')}</div>
                <div class="footer-right"><span class="energy-val">${"❤️".repeat(r.energy)}</span></div>
            </div>
        `;
        recipeList.appendChild(card);
    });
}

function showEmptyState() {
    // Zbierz ikony wybranych filtrów do raportu
    const activeIcons = [];
    if (selectedToolIcon) activeIcons.push(selectedToolIcon);
    
    selectedIngredients.forEach(itemName => {
        allRecipes.some(r => {
            const ing = r.mainIngredients.find(i => i.item === itemName);
            if (ing) {
                activeIcons.push(ing.icon);
                return true;
            }
            return false;
        });
    });

    if (document.getElementById('vege-only').checked) activeIcons.push('🌿');

    recipeList.innerHTML = `
        <div class="empty-state">
            <p>${t('no_results', 'ui')}</p>
            <div class="empty-state-icons">${activeIcons.join(' ')}</div>
            <button class="reset-btn" onclick="openFilterPanel()">${t('reset_filters', 'ui')}</button>
        </div>
    `;
}

// Funkcja wywoływana z Empty State
function openFilterPanel() {
    filterPanel.classList.add('visible');
    document.body.classList.add('modal-open');
}

initApp();
