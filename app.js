// =========================================================================
// CONFIGURACIÓN DE SUPABASE
// =========================================================================
let supabaseClient = null; 

const SUPABASE_URL = 'https://midtsqigsndcytbwadxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZHRzcWlnc25kY3l0YndhZHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODE2NDEsImV4cCI6MjA5OTY1NzY0MX0.INlhVioQtlvBwqAwdh75VjATplfzQA9ol6vfFziKUWw';

function initSupabase() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn('El SDK de Supabase no se detectó en window.');
    }
}

// =========================================================================
// NAVEGACIÓN Y INICIALIZACIÓN DOM
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTab === 'pendientes') cargarPendientes();
            if (targetTab === 'historial') cargarHistorial();
        });
    });

    cargarPendientes();
});

// =========================================================================
// OPERACIONES DB
// =========================================================================

document.getElementById('form-agregar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputNombre = document.getElementById('input-nombre');
    const inputCantidad = document.getElementById('input-cantidad');
    const selectUnidad = document.getElementById('select-unidad');
    const feedback = document.getElementById('feedback');

    feedback.className = 'feedback';
    feedback.textContent = '';

    if (!supabaseClient) {
        feedback.classList.add('error');
        feedback.textContent = 'Error: Cliente de Supabase no inicializado.';
        return;
    }

    const nombre = inputNombre.value.trim();
    const cantidad = parseFloat(inputCantidad.value);
    const unidad = selectUnidad.value;

    if (!nombre || isNaN(cantidad) || cantidad <= 0) {
        feedback.classList.add('error');
        feedback.textContent = 'Por favor completa todos los campos correctamente.';
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('compras_pendientes')
            .insert([{ nombre, cantidad, unidad }]);

        if (error) throw error;

        feedback.classList.add('success');
        feedback.textContent = `Agregado: ${nombre} (${cantidad} ${unidad})`;
        
        // Limpiar inputs
        inputNombre.value = '';
        inputCantidad.value = '1';
        selectUnidad.selectedIndex = 0;
        inputNombre.focus();

        cargarPendientes();
    } catch (err) {
        feedback.classList.add('error');
        feedback.textContent = 'Error: ' + err.message;
    }
});

async function cargarPendientes() {
    const contenedor = document.getElementById('lista-pendientes');
    if (!contenedor) return;

    if (!supabaseClient) {
        contenedor.innerHTML = '<li class="empty-state">No hay conexión con la base de datos.</li>';
        return;
    }

    contenedor.innerHTML = '<li class="empty-state">Cargando...</li>';

    try {
        const { data, error } = await supabaseClient.from('compras_pendientes').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            contenedor.innerHTML = '<li class="empty-state">No hay productos pendientes.</li>';
            return;
        }

        contenedor.innerHTML = '';
        data.forEach(item => {
            const li = document.createElement('li');
            li.className = 'item-card';
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-title">${escapeHtml(item.nombre)}</span>
                    <span class="item-meta">Cantidad: ${item.cantidad} ${escapeHtml(item.unidad)}</span>
                </div>
                <button class="btn-check" onclick="marcarComprado('${item.id}', '${escapeHtml(item.nombre)}', ${item.cantidad}, '${escapeHtml(item.unidad)}')">
                    ✓ Comprado
                </button>
            `;
            contenedor.appendChild(li);
        });
    } catch (err) {
        contenedor.innerHTML = `<li class="empty-state">Error al cargar: ${err.message}</li>`;
    }
}

async function marcarComprado(id, nombre, cantidad, unidad) {
    if (!supabaseClient) return;

    try {
        const { error: insertError } = await supabaseClient
            .from('compras_historial')
            .insert([{ nombre, cantidad, unidad }]);

        if (insertError) throw insertError;

        const { error: deleteError } = await supabaseClient
            .from('compras_pendientes')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        cargarPendientes();
    } catch (err) {
        alert('Error al procesar: ' + err.message);
    }
}

async function cargarHistorial() {
    const contenedor = document.getElementById('lista-historial');
    if (!contenedor) return;

    if (!supabaseClient) {
        contenedor.innerHTML = '<li class="empty-state">No hay conexión con la base de datos.</li>';
        return;
    }

    contenedor.innerHTML = '<li class="empty-state">Cargando...</li>';

    try {
        const { data, error } = await supabaseClient
            .from('compras_historial')
            .select('*')
            .order('fecha_compra', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            contenedor.innerHTML = '<li class="empty-state">El historial está vacío.</li>';
            return;
        }

        contenedor.innerHTML = '';
        data.forEach(item => {
            const fecha = new Date(item.fecha_compra).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            const li = document.createElement('li');
            li.className = 'item-card';
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-title">${escapeHtml(item.nombre)}</span>
                    <span class="item-meta">${item.cantidad} ${escapeHtml(item.unidad)}</span>
                </div>
                <span class="item-meta" style="text-align: right;">${fecha}</span>
            `;
            contenedor.appendChild(li);
        });
    } catch (err) {
        contenedor.innerHTML = `<li class="empty-state">Error al cargar: ${err.message}</li>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}