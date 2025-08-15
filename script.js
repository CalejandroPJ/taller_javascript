// Configuración global
const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 10;

// Variables de estado
let currentPage = 1;
let totalPokemon = 0;
let pokemonList = [];

// Referencias a elementos del DOM
const pokemonTableBody = document.getElementById('pokemonTableBody');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const loading = document.getElementById('loading');
const pokemonModal = document.getElementById('pokemonModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    loadPokemonList();
    setupEventListeners();
});

// Función para cargar la lista de Pokémon
async function loadPokemonList() {
    try {
        showLoading(true);
        
        const offset = (currentPage - 1) * POKEMON_PER_PAGE;
        const response = await fetch(`${API_BASE_URL}/pokemon?limit=${POKEMON_PER_PAGE}&offset=${offset}`);
        const data = await response.json();
        
        totalPokemon = data.count;
        pokemonList = data.results;
        
        await displayPokemonList();
        updatePaginationControls();
        
    } catch (error) {
        console.error('Error al cargar la lista de Pokémon:', error);
        showError('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
        showLoading(false);
    }
}

// Función para mostrar la lista de Pokémon en la tabla
async function displayPokemonList() {
    pokemonTableBody.innerHTML = '';
    
    for (let i = 0; i < pokemonList.length; i++) {
        const pokemon = pokemonList[i];
        const pokemonData = await fetchPokemonDetails(pokemon.url);
        
        if (pokemonData) {
            const row = createPokemonRow(pokemonData);
            pokemonTableBody.appendChild(row);
        }
    }
}

// Función para obtener detalles de un Pokémon específico
async function fetchPokemonDetails(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener detalles del Pokémon:', error);
        return null;
    }
}

// Función para crear una fila de la tabla
function createPokemonRow(pokemon) {
    const row = document.createElement('tr');
    row.className = 'border-b hover:bg-gray-50';
    
    // Obtener tipos del Pokémon
    const types = pokemon.types.map(type => type.type.name).join(', ');
    
    row.innerHTML = `
        <td class="px-6 py-4 font-medium">#${pokemon.id}</td>
        <td class="px-6 py-4">
            <img src="${pokemon.sprites.front_default}" 
                 alt="${pokemon.name}" 
                 class="w-16 h-16 object-contain">
        </td>
        <td class="px-6 py-4 font-medium capitalize">${pokemon.name}</td>
        <td class="px-6 py-4">
            ${createTypesBadges(pokemon.types)}
        </td>
        <td class="px-6 py-4">
            <button onclick="showPokemonDetails(${pokemon.id})" 
                    class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                Ver Detalle
            </button>
        </td>
    `;
    
    return row;
}

// Función para crear badges de tipos
function createTypesBadges(types) {
    return types.map(typeInfo => {
        const typeName = typeInfo.type.name;
        const colorClass = getTypeColor(typeName);
        return `<span class="inline-block px-2 py-1 text-xs rounded-full text-white mr-1 ${colorClass}">
                    ${typeName}
                </span>`;
    }).join('');
}

// Función para obtener colores según el tipo
function getTypeColor(type) {
    const colors = {
        normal: 'bg-gray-400',
        fire: 'bg-red-500',
        water: 'bg-blue-500',
        electric: 'bg-yellow-400',
        grass: 'bg-green-500',
        ice: 'bg-blue-300',
        fighting: 'bg-red-700',
        poison: 'bg-purple-500',
        ground: 'bg-yellow-600',
        flying: 'bg-indigo-400',
        psychic: 'bg-pink-500',
        bug: 'bg-green-400',
        rock: 'bg-yellow-800',
        ghost: 'bg-purple-700',
        dragon: 'bg-indigo-700',
        dark: 'bg-gray-800',
        steel: 'bg-gray-500',
        fairy: 'bg-pink-300'
    };
    return colors[type] || 'bg-gray-400';
}

// Función para mostrar detalles del Pokémon en modal
async function showPokemonDetails(pokemonId) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/pokemon/${pokemonId}`);
        const pokemon = await response.json();
        
        modalTitle.textContent = `#${pokemon.id} ${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}`;
        
        modalContent.innerHTML = `
            <div class="text-center mb-4">
                <img src="${pokemon.sprites.front_default}" 
                     alt="${pokemon.name}" 
                     class="w-32 h-32 mx-auto">
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h3 class="font-semibold text-gray-700">Altura:</h3>
                    <p>${pokemon.height / 10} m</p>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-700">Peso:</h3>
                    <p>${pokemon.weight / 10} kg</p>
                </div>
            </div>
            
            <div class="mb-4">
                <h3 class="font-semibold text-gray-700 mb-2">Tipos:</h3>
                ${createTypesBadges(pokemon.types)}
            </div>
            
            <div class="mb-4">
                <h3 class="font-semibold text-gray-700 mb-2">Habilidades:</h3>
                <ul class="list-disc list-inside">
                    ${pokemon.abilities.map(ability => 
                        `<li class="capitalize">${ability.ability.name.replace('-', ' ')}</li>`
                    ).join('')}
                </ul>
            </div>
            
            <div>
                <h3 class="font-semibold text-gray-700 mb-2">Estadísticas Base:</h3>
                ${createStatsDisplay(pokemon.stats)}
            </div>
        `;
        
        pokemonModal.classList.remove('hidden');
        pokemonModal.classList.add('flex');
        
    } catch (error) {
        console.error('Error al cargar detalles del Pokémon:', error);
        showError('Error al cargar los detalles del Pokémon.');
    } finally {
        showLoading(false);
    }
}

// Función para crear display de estadísticas
function createStatsDisplay(stats) {
    return stats.map(stat => {
        const statName = stat.stat.name.replace('-', ' ');
        const statValue = stat.base_stat;
        const percentage = Math.min((statValue / 200) * 100, 100);
        
        return `
            <div class="mb-2">
                <div class="flex justify-between text-sm">
                    <span class="capitalize">${statName}</span>
                    <span>${statValue}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Función para configurar event listeners
function setupEventListeners() {
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadPokemonList();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(totalPokemon / POKEMON_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            loadPokemonList();
        }
    });
    
    closeModal.addEventListener('click', () => {
        pokemonModal.classList.add('hidden');
        pokemonModal.classList.remove('flex');
    });
    
    // Cerrar modal al hacer clic fuera de él
    pokemonModal.addEventListener('click', (e) => {
        if (e.target === pokemonModal) {
            pokemonModal.classList.add('hidden');
            pokemonModal.classList.remove('flex');
        }
    });
}

// Función para actualizar controles de paginación
function updatePaginationControls() {
    const totalPages = Math.ceil(totalPokemon / POKEMON_PER_PAGE);
    
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    if (prevBtn.disabled) {
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    if (nextBtn.disabled) {
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Funciones auxiliares
function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showError(message) {
    alert(message); // En una aplicación real, usaríamos un sistema de notificaciones más elegante
}