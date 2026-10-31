import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc,
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE FIREBASE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyCoxvKElcSHL8teVaopOw9lEkWDDNvdAIo",
  authDomain: "noteindex-a3df9.firebaseapp.com",
  projectId: "noteindex-a3df9",
  storageBucket: "noteindex-a3df9.firebasestorage.app",
  messagingSenderId: "731064985722",
  appId: "1:731064985722:web:67c8e2ab4601e8f197f3c3",
  measurementId: "G-2NEPNKQ97S"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const glossaryCollection = collection(db, "glosario");
const calendarNotesCollection = collection(db, "calendario_notas");

let liveGlossary = [];
let calendarNotes = {}; 
let selectedDateKey = "";
let currentCategoryFilter = "ALL";
let isGlossaryVisible = true; // Estado para ocultar/mostrar todo el glosario

// Control de Zoom inicial (lee de la memoria del navegador o usa 13px por defecto para móvil)
let currentFontSize = parseInt(localStorage.getItem('noteindex_zoom')) || 13;

function applyZoom() {
    document.documentElement.style.setProperty('--def-font-size', currentFontSize + 'px');
    localStorage.setItem('noteindex_zoom', currentFontSize);
}

window.adjustZoom = function(direction) {
    currentFontSize += direction * 2;
    if (currentFontSize < 11) currentFontSize = 11;
    if (currentFontSize > 24) currentFontSize = 24;
    applyZoom();
};

applyZoom();

// FUNCIÓN PARA MOSTRAR / OCULTAR TODO EL GLOSARIO
window.toggleGlossaryVisibility = function() {
    isGlossaryVisible = !isGlossaryVisible;
    const display = document.getElementById('glossaryDisplay');
    const toggleBtn = document.getElementById('toggleGlossaryBtn');

    if (display && toggleBtn) {
        if (isGlossaryVisible) {
            display.style.display = 'block';
            toggleBtn.innerHTML = '👁️ Ocultar conceptos';
        } else {
            display.style.display = 'none';
            toggleBtn.innerHTML = '👁️ Mostrar conceptos';
        }
    }
};

const synonymDictionary = {
    "caminar": ["andar", "pasear", "marchar", "recorrer"],
    "matemáticas": ["cálculo", "aritmética", "álgebra", "geometría"],
    "educación": ["enseñanza", "formación", "instrucción", "pedagogía"],
    "programa": ["software", "aplicación", "código", "sistema"],
    "definición": ["concepto", "significado", "explicación", "descripción"],
    "rápido": ["veloz", "ágil", "presto", "raudo"],
    "guardar": ["almacenar", "conservar", "registrar", "archivar"],
    "estructura": ["armazón", "construcción", "sistema", "configuración"]
};

onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('loginScreen');
    if (user) {
        if (loginScreen) loginScreen.style.display = 'none';
        loadGlossary();
        loadCalendarNotes();
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
    }
});

window.loginUser = function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorMsg = document.getElementById('loginError');

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            document.getElementById('loginScreen').style.display = 'none';
        })
        .catch(() => {
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'Correo o contraseña incorrectos.';
        });
};

onSnapshot(glossaryCollection, (snapshot) => {
    liveGlossary = [];
    snapshot.forEach((documento) => {
        liveGlossary.push({
            id: documento.id,
            ...documento.data()
        });
    });
    renderGlossary();
});

function loadCalendarNotes() {
    onSnapshot(calendarNotesCollection, (snapshot) => {
        calendarNotes = {};
        snapshot.forEach((doc) => {
            calendarNotes[doc.id] = doc.data().note;
        });
        renderCalendarGrid();
    });
}

window.openCalendarModal = function() {
    document.getElementById('calendarModal').style.display = 'flex';
    renderCalendarGrid();
};

window.closeCalendarModal = function() {
    document.getElementById('calendarModal').style.display = 'none';
};

window.renderCalendarGrid = function() {
    const year = parseInt(document.getElementById('calYear').value);
    const month = parseInt(document.getElementById('calMonth').value);
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const adjustedFirstDay = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < adjustedFirstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const dayCell = document.createElement('div');
        dayCell.style.cssText = "background-color: #111518; border: 1px solid #2d3748; border-radius: 8px; padding: 10px 5px; cursor: pointer;";
        
        let hasNote = Boolean(calendarNotes[dateKey]);
        
        dayCell.innerHTML = `
            <div style="font-weight: bold; font-size: 14px; color: ${hasNote ? '#00b386' : '#f1f5f9'};">${day}</div>
            ${hasNote ? '<div style="font-size: 9px; color: #a7f3d0; background: #00674F; border-radius: 4px; margin-top: 2px; padding: 1px;">Nota</div>' : ''}
        `;

        dayCell.onclick = () => selectCalendarDay(year, month, day);
        grid.appendChild(dayCell);
    }
};

function selectCalendarDay(year, month, day) {
    selectedDateKey = `${year}-${month}-${day}`;
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    document.getElementById('selectedDateTitle').textContent = `Nota para el día ${day} de ${monthNames[month]} de ${year}:`;
    
    const noteText = calendarNotes[selectedDateKey] || '';
    const dayNoteInput = document.getElementById('dayNoteInput');
    const displayNoteContainer = document.getElementById('displayNoteContainer');
    const currentNoteText = document.getElementById('currentNoteText');

    if (noteText) {
        if (currentNoteText) currentNoteText.textContent = noteText;
        if (displayNoteContainer) displayNoteContainer.style.display = 'block';
        if (dayNoteInput) dayNoteInput.style.display = 'none';
    } else {
        if (dayNoteInput) {
            dayNoteInput.value = '';
            dayNoteInput.style.display = 'block';
        }
        if (displayNoteContainer) displayNoteContainer.style.display = 'none';
    }

    document.getElementById('dayNoteSection').style.display = 'block';
    if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise();
}

window.enableNoteEdit = function() {
    const dayNoteInput = document.getElementById('dayNoteInput');
    const displayNoteContainer = document.getElementById('displayNoteContainer');
    if (dayNoteInput && displayNoteContainer) {
        dayNoteInput.value = calendarNotes[selectedDateKey] || '';
        displayNoteContainer.style.display = 'none';
        dayNoteInput.style.display = 'block';
        dayNoteInput.focus();
    }
};

window.saveDayNote = async function() {
    if (!selectedDateKey) return;
    const noteText = document.getElementById('dayNoteInput').value.trim();
    try {
        await setDoc(doc(db, "calendario_notas", selectedDateKey), {
            note: noteText,
            updatedAt: Date.now()
        });
        selectCalendarDay(...selectedDateKey.split('-').map(Number));
    } catch (error) {
        console.error("Error al guardar nota: ", error);
    }
};

window.filterByCategory = function(category, btnElement) {
    currentCategoryFilter = category;
    const buttons = document.querySelectorAll('.pill-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderGlossary();
};

window.toggleFavorite = async function(id, currentStatus) {
    try {
        const itemRef = doc(db, "glosario", id);
        await updateDoc(itemRef, { isFavorite: !currentStatus });
    } catch (error) {
        console.error("Error al actualizar favorito: ", error);
    }
};

window.toggleDefinition = function(id) {
    const defElement = document.getElementById(`def-${id}`);
    const btnElement = document.getElementById(`btn-def-${id}`);
    if (defElement && btnElement) {
        defElement.classList.toggle('collapsed');
        if (defElement.classList.contains('collapsed')) {
            btnElement.textContent = 'Ver más ▾';
        } else {
            btnElement.textContent = 'Ver menos ▴';
        }
    }
};

window.updateFileName = function() {
    const input = document.getElementById('imageInput');
    const display = document.getElementById('fileNameDisplay');
    if (input.files && input.files.length > 0) {
        display.textContent = `${input.files.length} archivo(s)`;
    } else {
        display.textContent = 'Ningún archivo seleccionado';
    }
};

window.saveWord = async function() {
    const word = document.getElementById('wordInput').value.trim();
    const category = document.getElementById('categoryInput').value;
    const definition = document.getElementById('definitionInput').value.trim();
    const imageInput = document.getElementById('imageInput');
    const editId = document.getElementById('editId').value;

    if (!word || !definition) {
        alert('Por favor completa la palabra y el concepto/cálculo.');
        return;
    }

    const files = Array.from(imageInput.files);
    if (files.length > 0) {
        const imagePromises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        });
        const imagesBase64 = await Promise.all(imagePromises);
        await processCloudSave(word, category, definition, imagesBase64, editId);
    } else {
        let existingImages = [];
        let existingFav = false;
        if (editId) {
            let existing = liveGlossary.find(item => item.id === editId);
            if (existing) {
                existingImages = existing.images || (existing.image ? [existing.image] : []);
                existingFav = Boolean(existing.isFavorite);
            }
        }
        await processCloudSave(word, category, definition, existingImages, editId, existingFav);
    }
};

async function processCloudSave(word, category, definition, imagesArray, editId, isFav = false) {
    try {
        if (editId) {
            const itemRef = doc(db, "glosario", editId);
            await updateDoc(itemRef, { word, category, definition, images: imagesArray });
            document.getElementById('editId').value = '';
            document.getElementById('saveBtn').textContent = 'Guardar Concepto';
        } else {
            await addDoc(glossaryCollection, {
                word, category, definition, images: imagesArray, isFavorite: isFav, timestamp: Date.now()
            });
        }
        document.getElementById('wordInput').value = '';
        document.getElementById('definitionInput').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('fileNameDisplay').textContent = 'Ningún archivo seleccionado';
    } catch (error) {
        console.error("Error al guardar: ", error);
    }
}

function getSynonyms(word) {
    const lower = word.toLowerCase();
    return synonymDictionary[lower] || ["concepto", "término", "noción"];
}

window.loadGlossary = function() { renderGlossary(); };

function renderGlossary() {
    const display = document.getElementById('glossaryDisplay');
    const searchInput = document.getElementById('searchInput');
    if (!display) return;
    
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
    display.innerHTML = '';

    let itemsToDisplay = [...liveGlossary];

    if (searchVal) {
        itemsToDisplay = itemsToDisplay.filter(item => 
            (item.word && item.word.toLowerCase().includes(searchVal)) || 
            (item.category && item.category.toLowerCase().includes(searchVal)) ||
            (item.definition && item.definition.toLowerCase().includes(searchVal))
        );
    }

    if (currentCategoryFilter === 'FAV') {
        itemsToDisplay = itemsToDisplay.filter(item => item.isFavorite === true);
    } else if (currentCategoryFilter !== 'ALL') {
        itemsToDisplay = itemsToDisplay.filter(item => item.category === currentCategoryFilter);
    }

    if (itemsToDisplay.length === 0) {
        display.innerHTML = '<div class="empty-msg">No hay conceptos guardados.</div>';
        return;
    }

    const categories = {};
    itemsToDisplay.forEach(item => {
        const cat = item.category || "General";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
    });

    for (let cat in categories) {
        categories[cat].sort((a, b) => a.word.localeCompare(b.word));
        const catDiv = document.createElement('div');
        catDiv.className = 'category-container';
        let catHtml = `<h2 class="category-title">📁 ${cat}</h2>`;

        categories[cat].forEach(item => {
            const synonyms = getSynonyms(item.word);
            const synonymChips = synonyms.map(s => `<span class="synonym-chip">${s}</span>`).join(' ');

            let imagesList = item.images || (item.image ? [item.image] : []);
            let galleryHtml = '';
            
            if (imagesList.length > 0) {
                let gridClass = 'gallery-multi';
                if (imagesList.length === 1) gridClass = 'gallery-1';
                else if (imagesList.length === 2) gridClass = 'gallery-2';
                else if (imagesList.length === 3) gridClass = 'gallery-3';
                else if (imagesList.length === 4) gridClass = 'gallery-4';

                galleryHtml = `<div class="image-gallery ${gridClass}">`;
                imagesList.forEach(imgUrl => {
                    galleryHtml += `<img src="${imgUrl}" class="gallery-thumb" onclick="openLightbox('${imgUrl}')" alt="${item.word}">`;
                });
                galleryHtml += `</div>`;
            }

            const isFav = Boolean(item.isFavorite);
            const starIcon = isFav ? '⭐' : '☆';
            const isLongText = item.definition && item.definition.length > 90;

            catHtml += `
                <div class="glossary-item ${isFav ? 'is-favorite' : ''}">
                    <div class="item-header-row">
                        <div class="item-word">${item.word}</div>
                        <button class="fav-btn" onclick="toggleFavorite('${item.id}', ${isFav})">${starIcon}</button>
                    </div>
                    
                    <div id="def-${item.id}" class="item-definition ${isLongText ? 'collapsed' : ''}">${item.definition}</div>
                    ${isLongText ? `<button id="btn-def-${item.id}" class="btn-toggle-def" onclick="toggleDefinition('${item.id}')">Ver más ▾</button>` : ''}
                    
                    ${galleryHtml}
                    
                    <div class="synonyms-container">
                        <span class="synonyms-label">Sinónimos:</span>
                        ${synonymChips}
                    </div>

                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editItem('${item.id}')">✏️ Editar</button>
                        <button class="btn-delete" onclick="deleteItem('${item.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
        });

        catDiv.innerHTML = catHtml;
        display.appendChild(catDiv);
    }

    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch((err) => console.log('MathJax error:', err));
    }
}

window.openLightbox = function(src) {
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImage');
    if (modal && img) {
        img.src = src;
        modal.style.display = 'flex';
    }
};

window.closeLightbox = function() {
    const modal = document.getElementById('lightboxModal');
    if (modal) modal.style.display = 'none';
};

window.editItem = function(id) {
    let item = liveGlossary.find(i => i.id === id);
    if (item) {
        document.getElementById('wordInput').value = item.word;
        document.getElementById('categoryInput').value = item.category;
        document.getElementById('definitionInput').value = item.definition;
        document.getElementById('editId').value = item.id;
        document.getElementById('saveBtn').textContent = 'Actualizar Concepto';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.deleteItem = async function(id) {
    if (confirm('¿Estás seguro de eliminar este concepto?')) {
        try {
            await deleteDoc(doc(db, "glosario", id));
        } catch (error) {
            console.error("Error al eliminar: ", error);
        }
    }
};

window.exportToPDF = function() {
    if (liveGlossary.length === 0) {
        alert('No hay conceptos guardados para exportar.');
        return;
    }
    
    let htmlContent = "";
    liveGlossary.forEach(item => {
        htmlContent += `
            <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                <h3 style="color: #00674F; margin: 0 0 5px 0;">${item.word} (${item.category || 'General'})</h3>
                <p style="margin: 0 0 5px 0; font-size: 14px; white-space: pre-wrap;">${item.definition}</p>
            </div>
        `;
    });

    document.getElementById('pdfContent').innerHTML = htmlContent;
    const element = document.getElementById('pdfExportTemplate');
    element.style.display = 'block';

    const opt = {
        margin:       10,
        filename:     'Noteindex_Glosario.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
        element.style.display = 'none';
    });
};
