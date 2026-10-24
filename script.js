// Importar funciones necesarias de Firebase desde la CDN
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

// Inicializar Firebase, Base de Datos y Autenticación
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const glossaryCollection = collection(db, "glosario");
const calendarNotesCollection = collection(db, "calendario_notas");

let liveGlossary = [];
let calendarNotes = {}; 
let selectedDateKey = "";

// Diccionario de sinónimos
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

// --- VERIFICAR SI EL USUARIO HA INICIADO SESIÓN ---
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

// --- ESCUCHAR CAMBIOS EN TIEMPO REAL DEL GLOSARIO ---
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

// --- ESCUCHAR NOTAS DEL CALENDARIO EN TIEMPO REAL ---
function loadCalendarNotes() {
    onSnapshot(calendarNotesCollection, (snapshot) => {
        calendarNotes = {};
        snapshot.forEach((doc) => {
            calendarNotes[doc.id] = doc.data().note;
        });
        renderCalendarGrid();
    });
}

// --- FUNCIONES DEL CALENDARIO (2026 - 2028) ---
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
        const emptyCell = document.createElement('div');
        grid.appendChild(emptyCell);
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const dayCell = document.createElement('div');
        dayCell.style.cssText = "background-color: #111518; border: 1px solid #2d3748; border-radius: 8px; padding: 10px 5px; cursor: pointer; transition: all 0.2s; position: relative;";
        
        let hasNote = Boolean(calendarNotes[dateKey]);
        
        dayCell.innerHTML = `
            <div style="font-weight: bold; font-size: 15px; color: ${hasNote ? '#00b386' : '#f1f5f9'};">${day}</div>
            ${hasNote ? '<div style="font-size: 10px; color: #a7f3d0; background: #00674F; border-radius: 4px; margin-top: 4px; padding: 1px;">Nota</div>' : ''}
        `;

        dayCell.onmouseover = () => dayCell.style.borderColor = '#00674F';
        dayCell.onmouseout = () => dayCell.style.borderColor = '#2d3748';
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
        // Mostrar vista con botón de editar si ya existe una nota
        if (currentNoteText) currentNoteText.textContent = noteText;
        if (displayNoteContainer) displayNoteContainer.style.display = 'block';
        if (dayNoteInput) dayNoteInput.style.display = 'none';
    } else {
        // Mostrar campo de texto directamente si el día está vacío
        if (dayNoteInput) {
            dayNoteInput.value = '';
            dayNoteInput.style.display = 'block';
        }
        if (displayNoteContainer) displayNoteContainer.style.display = 'none';
    }

    document.getElementById('dayNoteSection').style.display = 'block';
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
        alert("¡Nota guardada y sincronizada en la nube!");
        selectCalendarDay(...selectedDateKey.split('-').map(Number));
    } catch (error) {
        console.error("Error al guardar nota de calendario: ", error);
        alert("No se pudo guardar la nota. Asegúrate de actualizar las Reglas de Firebase.");
    }
};

// --- GESTIÓN DE ARCHIVOS Y GLOSARIO ---
window.updateFileName = function() {
    const input = document.getElementById('imageInput');
    const display = document.getElementById('fileNameDisplay');
    if (input.files && input.files.length > 0) {
        display.textContent = input.files[0].name;
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
        alert('Por favor completa la palabra y la definición.');
        return;
    }

    const file = imageInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async function () {
            await processCloudSave(word, category, definition, reader.result, editId);
        };
    } else {
        let currentImage = null;
        if (editId) {
            let existing = liveGlossary.find(item => item.id === editId);
            if (existing) currentImage = existing.image || null;
        }
        await processCloudSave(word, category, definition, currentImage, editId);
    }
};

async function processCloudSave(word, category, definition, image, editId) {
    try {
        if (editId) {
            const itemRef = doc(db, "glosario", editId);
            await updateDoc(itemRef, {
                word: word,
                category: category,
                definition: definition,
                image: image
            });
            document.getElementById('editId').value = '';
            document.getElementById('saveBtn').textContent = 'Guardado';
        } else {
            await addDoc(glossaryCollection, {
                word: word,
                category: category,
                definition: definition,
                image: image,
                timestamp: Date.now()
            });
        }

        document.getElementById('wordInput').value = '';
        document.getElementById('definitionInput').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('fileNameDisplay').textContent = 'Ningún archivo seleccionado';
    } catch (error) {
        console.error("Error al guardar en Firebase: ", error);
        alert("Ocurrió un error al guardar en la nube.");
    }
}

function getSynonyms(word) {
    const lower = word.toLowerCase();
    if (synonymDictionary[lower]) {
        return synonymDictionary[lower];
    }
    return ["concepto", "término", "noción"];
}

window.loadGlossary = function() {
    renderGlossary();
};

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

    if (itemsToDisplay.length === 0) {
        display.innerHTML = '<div class="empty-msg">No hay conceptos guardados todavía en la nube.</div>';
        return;
    }

    const categories = {};
    itemsToDisplay.forEach(item => {
        const cat = item.category || "General";
        if (!categories[cat]) {
            categories[cat] = [];
        }
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

            catHtml += `
                <div class="glossary-item">
                    <div class="item-word">${item.word}</div>
                    <div class="item-definition">${item.definition}</div>
                    ${item.image ? `<img src="${item.image}" class="item-image" alt="${item.word}">` : ''}
                    
                    <div class="synonyms-container">
                        <span class="synonyms-label">Sinónimos sugeridos:</span>
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
}

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
    if (confirm('¿Estás seguro de eliminar este concepto? Se borrará para los 5 usuarios.')) {
        try {
            await deleteDoc(doc(db, "glosario", id));
        } catch (error) {
            console.error("Error al eliminar: ", error);
            alert("No se pudo eliminar el concepto.");
        }
    }
};

window.exportToPDF = function() {
    if (liveGlossary.length === 0) {
        alert('No hay conceptos guardados para exportar a PDF.');
        return;
    }

    let sortedGlossary = [...liveGlossary];
    sortedGlossary.sort((a, b) => a.word.localeCompare(b.word));

    const letterGroups = {};
    sortedGlossary.forEach(item => {
        const firstLetter = item.word.charAt(0).toUpperCase();
        if (!letterGroups[firstLetter]) {
            letterGroups[firstLetter] = [];
        }
        letterGroups[firstLetter].push(item);
    });

    const pdfContent = document.getElementById('pdfContent');
    pdfContent.innerHTML = '';

    for (let letter in letterGroups) {
        let letterSection = `<div class="pdf-letter-group">`;
        letterSection += `<div class="pdf-letter-header">${letter}</div>`;

        letterGroups[letter].forEach(item => {
            letterSection += `
                <div class="pdf-entry">
                    <span class="pdf-word">${item.word}:</span> ${item.definition}
                </div>
            `;
        });

        letterSection += `</div>`;
        pdfContent.innerHTML += letterSection;
    }

    const element = document.getElementById('pdfExportTemplate');
    element.style.display = 'block';

    const opt = {
        margin:       15,
        filename:     'Glosario_Noteindex.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none';
    });
};

