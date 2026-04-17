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

function getIcon(name) {
    return `<svg class="svg-icon icon-${name}"><use href="#icon-${name}"></use></svg>`;
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
    toolSum.innerHTML = t('tool_header', 'ui') + getIcon('chevron');
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
        sum.innerHTML = t(catKey, 'categories') + getIcon('chevron');
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
        card.style.cursor = 'pointer'; // Kursor rączki na desktopie
        card.onclick = () => showRecipeDetails(r);

        const icons = [...r.mainIngredients.map(i => i.icon), ...(r.tools ? r.tools.map(t => t.icon) : [])];
        
        card.innerHTML = `
            <div class="card-header"><span class="recipe-name">${r.name}</span></div>
            <div class="card-body">
                <div class="result-icon">${r.resultIcon}</div>
                <div class="ingredients-row">${icons.map(i => `<span>${i}</span>`).join('<span class="plus">+</span>')}</div>
            </div>
            <div class="card-footer">
                <div class="footer-left"><span class="diff-val">${getIcon('chef').repeat(r.difficulty)}</span></div>
                <div class="footer-center">${getIcon('time')}${r.prepTime} ${t('prep_time', 'ui')}</div>
                <div class="footer-right"><span class="energy-val">${getIcon('energy').repeat(r.energy)}</span></div>
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

function formatAmount(amount) {
    // Jeśli to liczba całkowita, zwróć ją po prostu
    if (Number.isInteger(amount)) return amount;

    // Pobierz część całkowitą (np. z 1.5 wyciągnij 1)
    const whole = Math.floor(amount);
    // Pobierz część ułamkową (np. 0.5)
    const fraction = amount - whole;

    // Mapa ułamków (klucz to wartość dziesiętna, wartość to ułamek)
    const fractionMap = {
        0.5: "½",
        0.25: "¼",
        0.75: "¾",
        0.33: "⅓",
        0.66: "⅔"
        // 0.5: "1/2",
        // 0.25: "1/4",
        // 0.75: "3/4",
        // 0.33: "1/3",
        // 0.66: "2/3",
        // 0.2: "1/5",
        // 0.125: "1/8"
    };

    // Szukamy pasującego ułamka w mapie (z małym marginesem błędu dla floatów)
    const fractionText = fractionMap[Object.keys(fractionMap).find(key => Math.abs(key - fraction) < 0.01)];

    if (fractionText) {
        // Jeśli mamy część całkowitą (np. 1 i 1/2), połącz je, w przeciwnym razie tylko ułamek
        return whole > 0 ? `${whole} ${fractionText}` : fractionText;
    }

    // Jeśli nie ma w mapie, zwróć normalną liczbę (bezpiecznik)
    return amount;
}

function showRecipeDetails(recipe) {
    const backdrop = document.getElementById('recipe-modal');
    const cardContainer = document.getElementById('modal-card-container');
    
    // 1. Generowanie treści (Składniki i Narzędzia)
    const ingredientsHtml = recipe.mainIngredients.map(ing => `
        <div class="modal-ing-row">
            <span class="modal-ing-name"><span>${ing.icon}</span> ${t(ing.item, 'items')}</span>
            <span class="modal-ing-value">${formatAmount(ing.amount)} ${t(ing.unit, 'units')}</span>
        </div>
    `).join('');

    const toolsHtml = (recipe.tools && recipe.tools.length > 0) ? 
            recipe.tools.map(tool => `
                <div class="modal-ing-row">
                    <span class="modal-ing-name"><span>${tool.icon}</span> ${t(tool.item, 'items')}</span>
                    <span class="modal-ing-value">1 ${t('pcs', 'units')}</span>
                </div>
            `).join('') : '';

    let typeClass = 'card-default';
    if (recipe.tags.includes('vege')) typeClass = 'card-vege';
    else if (recipe.tags.includes('fish')) typeClass = 'card-fish';

    // 2. Budowanie nowej struktury 3D
    cardContainer.innerHTML = `
        <div class="card-scene">
            <div class="card-inner" id="recipe-card-inner">
                
                <div class="recipe-card ${typeClass} card-face card-front">
                    <div class="card-header"><span class="recipe-name">${recipe.name}</span></div>
                    <div class="card-body">
                        <div class="result-icon" style="font-size: 5rem; height: 120px;">${recipe.resultIcon}</div>
                        <div class="modal-ing-container">
                            ${ingredientsHtml}
                            ${toolsHtml}
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="footer-left"><span class="diff-val">${getIcon('chef').repeat(recipe.difficulty)}</span></div>
                        <div class="footer-center">${getIcon('time')}${recipe.prepTime} ${t('prep_time', 'ui')}</div>
                        <div class="footer-right"><span class="energy-val">${getIcon('energy').repeat(recipe.energy)}</span></div>
                    </div>
                </div>

                <div class="recipe-card ${typeClass} card-face card-back">
                    <div class="card-header"><span class="recipe-name">${recipe.name}</span></div>
                    <div class="card-body">
                        <div style="color: var(--accent-gold); font-weight: bold; text-align: center;">
                            ✨ +${10 * recipe.energy} do poczucia sytości
                        </div>
                    </div>
                    <div></div>
                </div>

            </div>
        </div>
    `;

    // 3. Obsługa obracania (Logic)
    // const cardInner = document.getElementById('recipe-card-inner');
    // let touchStartX = 0;
    // let currentRotation = 0; // Śledzimy stopnie

    // const flipCard = (direction) => {
    //     if (direction === 'left') currentRotation -= 180;
    //     else currentRotation += 180;
        
    //     cardInner.style.transform = `rotateY(${currentRotation}deg)`;
    // };

    // // Kliknięcie (zawsze w jedną stronę)
    // cardInner.onclick = (e) => {
    //     if (e.target.closest('button, a')) return;
    //     flipCard('left'); 
    // };

    // // Swipe
    // cardInner.ontouchstart = (e) => {
    //     touchStartX = e.touches[0].clientX;
    // };

    // cardInner.ontouchend = (e) => {
    //     const touchEndX = e.changedTouches[0].clientX;
    //     const diff = touchStartX - touchEndX;
        
    //     if (Math.abs(diff) > 50) {
    //         // Jeśli diff > 0, to swipe w lewo, jeśli < 0 to w prawo
    //         flipCard(diff > 0 ? 'left' : 'right');
    //     }
    // };

    const cardInner = document.getElementById('recipe-card-inner');
    let startX = 0;
    let currentRotation = 0; // Kąt, przy którym karta skończyła poprzedni ruch
    let isDragging = false;
    
    // Funkcja pomocnicza do ustawiania rotacji bez transition
    // const setRotation = (deg, useTransition = false) => {
    //     cardInner.style.transition = useTransition ? "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)" : "none";
    //     cardInner.style.transform = `rotateY(${deg}deg)`;
    // };
    const setRotation = (deg, useTransition = false) => {
        // Używamy cubic-bezier dla "miękkiego" lądowania karty
        cardInner.style.transition = useTransition ? "transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none";
        cardInner.style.transform = `rotateY(${deg}deg)`;
    };
    
    // Kliknięcie (zostawiamy dla desktopu)
    cardInner.onclick = (e) => {
        if (e.target.closest('button, a') || isDragging) return;
        currentRotation -= 180;
        setRotation(currentRotation, true);
    };
    
    // Obsługa dotyku
    cardInner.ontouchstart = (e) => {
        startX = e.touches[0].clientX;
        isDragging = false; 
        cardInner.style.transition = "none"; // Wyłączamy animację na czas ruchu palca
    };
    
    cardInner.ontouchmove = (e) => {
        const currentX = e.touches[0].clientX;
        const diffX = startX - currentX;
        
        // Próg 5px, żeby odróżnić tapnięcie od celowego ruchu
        if (Math.abs(diffX) > 5) {
            isDragging = true;
            // Przelicznik: 1px ruchu = ok. 0.5 stopnia obrotu (dostosuj czułość)
            const rotationProgress = currentRotation - (diffX * 0.8);
            cardInner.style.transform = `rotateY(${rotationProgress}deg)`;
        }
    };
    
    cardInner.ontouchend = (e) => {
        if (!isDragging) return;
        
        const endX = e.changedTouches[0].clientX;
        const totalDiffX = startX - endX;
    
        // Jeśli przesunięto o więcej niż 100px, kończymy obrót
        if (Math.abs(totalDiffX) > 100) {
            currentRotation += (totalDiffX > 0) ? -180 : 180;
        } 
        // Jeśli mniej - karta wróci do poprzedniej stabilnej pozycji (currentRotation)
        
        setRotation(currentRotation, true);
        
        // Mały reset flagi dragging po animacji
        setTimeout(() => { isDragging = false; }, 100);
    };

    // 4. Wyświetlanie modala
    backdrop.style.display = 'flex';
    setTimeout(() => {
        backdrop.classList.add('active');
        document.body.classList.add('modal-open');
    }, 10);
}

// function showRecipeDetails(recipe) {
//     const backdrop = document.getElementById('recipe-modal');
//     const cardContainer = document.getElementById('modal-card-container');
    
//     // Generowanie wierszy składników (Wizja punkt E)
//     const ingredientsHtml = recipe.mainIngredients.map(ing => `
//         <div class="modal-ing-row">
//             <span class="modal-ing-name">
//                 <span>${ing.icon}</span> 
//                 ${t(ing.item, 'items')}
//             </span>
//             <span class="modal-ing-value">
//                 ${formatAmount(ing.amount)} ${t(ing.unit, 'units')}
//             </span>
//         </div>
//     `).join('');

//     const toolsHtml = (recipe.tools && recipe.tools.length > 0) ? 
//             recipe.tools.map(tool => `
//                 <div class="modal-ing-row">
//                     <span class="modal-ing-name"><span>${tool.icon}</span> ${t(tool.item, 'items')}</span>
//                     <span class="modal-ing-value">1 ${t('pcs', 'units')}</span>
//                 </div>
//             `).join('') : '';

//     // Określenie klasy koloru (jak na liście)
//     let typeClass = 'card-default';
//     if (recipe.tags.includes('vege')) typeClass = 'card-vege';
//     else if (recipe.tags.includes('fish')) typeClass = 'card-fish';

//     // Budowanie karty (Wizja punkt B i E)
//     cardContainer.innerHTML = `
//         <div class="recipe-card ${typeClass} recipe-card-standalone">
//             <div class="card-header"><span class="recipe-name" style="font-size: 1.3rem;">${recipe.name}</span></div>
//             <div class="card-body">
//                 <div class="result-icon" style="font-size: 5rem; height: 120px;">${recipe.resultIcon}</div>
//                 <div class="modal-ing-container">
//                     ${ingredientsHtml}
//                     ${toolsHtml}
//                 </div>
//             </div>
//             <div class="card-footer" style="padding: 15px 12px;">
//                 <div class="footer-left"><span class="diff-val">${"👨‍🍳".repeat(recipe.difficulty)}</span></div>
//                 <div class="footer-center">⏱️ ${recipe.prepTime} ${t('prep_time', 'ui')}</div>
//                 <div class="footer-right"><span class="energy-val">${"❤️".repeat(recipe.energy)}</span></div>
//             </div>
//         </div>
//     `;

//     // Wyświetlanie z animacją
//     backdrop.style.display = 'flex';
//     setTimeout(() => {
//         backdrop.classList.add('active');
//         document.body.classList.add('modal-open');
//     }, 10);
// }

// Obsługa zamykania
function closeModal() {
    const backdrop = document.getElementById('recipe-modal');
    backdrop.classList.remove('active');
    setTimeout(() => {
        backdrop.style.display = 'none';
        if (!filterPanel.classList.contains('visible')) {
            document.body.classList.remove('modal-open');
        }
    }, 300); // Czas trwania animacji CSS
}

document.getElementById('close-modal-btn').onclick = closeModal;
document.getElementById('recipe-modal').onclick = (e) => {
    if (e.target.id === 'recipe-modal') closeModal();
};

// Pamiętaj o dodaniu card.onclick w renderDeck!

initApp();
