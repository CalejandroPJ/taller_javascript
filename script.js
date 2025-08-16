// Configuración global
const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 20; // más tarjetas por página

// Estado
let currentPage = 1;
let totalPokemon = 0;
let pokemonList = [];
let allTypes = [];
let selectedTypes = new Set();
let searchQuery = '';

// Referencias DOM
const pokemonGrid = document.getElementById('pokemonGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const totalCountLabel = document.getElementById('totalCount');
const currentPageLabel = document.getElementById('currentPageLabel');
const loading = document.getElementById('loading');
const pokemonModal = document.getElementById('pokemonModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
const searchInput = document.getElementById('searchInput');
const typeChipsContainer = document.getElementById('typeChips');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
  loadTypes();
  setupEventListeners();
  loadPokemonList();
});

// Cargar tipos desde API para filtros
async function loadTypes() {
  try {
    const res = await fetch(`${API_BASE_URL}/type`);
    const data = await res.json();
    allTypes = data.results.filter(type => !['unknown', 'shadow'].includes(type.name));
    renderTypeChips();
  } catch (error) {
    console.error('Error al cargar tipos:', error);
  }
}

// Mostrar chips de filtros
function renderTypeChips() {
  typeChipsContainer.innerHTML = '';
  allTypes.forEach(type => {
    const chip = document.createElement('button');
    chip.textContent = capitalize(type.name);
    chip.className = `text-white px-4 py-1 rounded-full text-sm font-semibold cursor-pointer transition-colors 
      ${getTypeColor(type.name)} 
      ${selectedTypes.has(type.name) ? 'ring-4 ring-offset-1 ring-yellow-300' : 'hover:ring-2 hover:ring-yellow-300'}`;
    chip.addEventListener('click', () => {
      if (selectedTypes.has(type.name)) {
        selectedTypes.delete(type.name);
      } else {
        selectedTypes.add(type.name);
      }
      currentPage = 1; // resetear página
      loadPokemonList();
      renderTypeChips();
    });
    typeChipsContainer.appendChild(chip);
  });
}

// Cargar lista principal de Pokémon
async function loadPokemonList() {
  showLoading(true);
  try {
    // Si hay búsqueda, no paginamos porque buscaremos uno a uno
    if (searchQuery.trim()) {
      await loadPokemonByName(searchQuery.trim().toLowerCase());
      updatePaginationControls(1, 1);
      totalCountLabel.textContent = 1;
      currentPageLabel.textContent = 1;
      showLoading(false);
      return;
    }

    // Si hay filtros por tipo, tenemos que hacer una búsqueda especial
    if (selectedTypes.size > 0) {
      await loadPokemonByTypes(Array.from(selectedTypes));
      showLoading(false);
      return;
    }

    // Petición normal paginada
    const offset = (currentPage - 1) * POKEMON_PER_PAGE;
    const res = await fetch(`${API_BASE_URL}/pokemon?limit=${POKEMON_PER_PAGE}&offset=${offset}`);
    const data = await res.json();

    totalPokemon = data.count;
    pokemonList = data.results;

    await displayPokemonList();
    updatePaginationControls(currentPage, Math.ceil(totalPokemon / POKEMON_PER_PAGE));
    totalCountLabel.textContent = totalPokemon;
    currentPageLabel.textContent = currentPage;
  } catch (error) {
    console.error('Error al cargar Pokémon:', error);
    alert('Error al cargar Pokémon. Intenta recargar la página.');
  } finally {
    showLoading(false);
  }
}

// Mostrar lista en grid
async function displayPokemonList() {
  pokemonGrid.innerHTML = '';
  for (const pokemon of pokemonList) {
    const data = await fetchPokemonDetails(pokemon.url);
    if (data) {
      const card = createPokemonCard(data);
      pokemonGrid.appendChild(card);
    }
  }
}

// Cargar Pokémon por nombre (búsqueda exacta)
async function loadPokemonByName(name) {
  pokemonGrid.innerHTML = '';
  try {
    const res = await fetch(`${API_BASE_URL}/pokemon/${name}`);
    if (!res.ok) throw new Error('No encontrado');
    const data = await res.json();

    // Si hay filtros, validar que Pokémon tenga esos tipos
    if (selectedTypes.size > 0) {
      const typesNames = data.types.map(t => t.type.name);
      if (!Array.from(selectedTypes).every(t => typesNames.includes(t))) {
        pokemonGrid.innerHTML = '<p class="col-span-full text-center text-gray-600">No hay Pokémon que coincida con los filtros.</p>';
        return;
      }
    }

    const card = createPokemonCard(data);
    pokemonGrid.appendChild(card);
  } catch {
    pokemonGrid.innerHTML = '<p class="col-span-full text-center text-gray-600">No se encontró ningún Pokémon con ese nombre.</p>';
  }
}

// Cargar Pokémon por filtros de tipos
async function loadPokemonByTypes(types) {
  pokemonGrid.innerHTML = '';
  totalCountLabel.textContent = 'Cargando...';
  currentPageLabel.textContent = currentPage;

  try {
    // Obtener los Pokémon para cada tipo
    const promises = types.map(type => fetch(`${API_BASE_URL}/type/${type}`).then(r => r.json()));
    const results = await Promise.all(promises);

    // Obtener listas de Pokémon por tipo
    const arraysOfPokemon = results.map(res => res.pokemon.map(p => p.pokemon));

    // Intersectar listas para que contengan todos los tipos seleccionados
    let filteredPokemon = arraysOfPokemon.reduce((a, b) =>
      a.filter(p => b.some(pb => pb.name === p.name))
    );

    totalPokemon = filteredPokemon.length;
    totalCountLabel.textContent = totalPokemon;

    // Paginación manual del arreglo
    const start = (currentPage - 1) * POKEMON_PER_PAGE;
    const end = start + POKEMON_PER_PAGE;
    pokemonList = filteredPokemon.slice(start, end);

    if (pokemonList.length === 0) {
      pokemonGrid.innerHTML = '<p class="col-span-full text-center text-gray-600">No hay Pokémon que coincida con los filtros.</p>';
    } else {
      await displayPokemonList();
    }
    updatePaginationControls(currentPage, Math.ceil(totalPokemon / POKEMON_PER_PAGE));
    currentPageLabel.textContent = currentPage;

  } catch (error) {
    console.error('Error al filtrar por tipos:', error);
    alert('Error al filtrar Pokémon por tipo.');
  }
}

// Obtener detalles de un Pokémon desde URL
async function fetchPokemonDetails(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar detalles');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Crear tarjeta Pokémon
function createPokemonCard(pokemon) {
  const card = document.createElement('div');
  card.className = `bg-white rounded-xl shadow-md flex flex-col justify-between`;

  // Franja superior pequeña con color y número
  const colorStripe = document.createElement('div');
  colorStripe.className = `rounded-t-xl h-8 ${getTypeColor(pokemon.types[0].type.name)} flex items-center px-3`;
  colorStripe.innerHTML = `<p class="text-sm text-white font-semibold">#${pokemon.id.toString().padStart(3, '0')}</p>`;

  // Sección imagen y nombre en fondo blanco
  const mainContent = document.createElement('div');
  mainContent.className = `p-5 flex flex-col items-center`;

  const typesBadges = pokemon.types.map(typeInfo => {
    return `<span class="inline-block px-3 py-1 text-xs rounded-full text-white mr-2 ${getTypeColor(typeInfo.type.name)}">${capitalize(typeInfo.type.name)}</span>`;
  }).join('');

  mainContent.innerHTML = `
    <div class="my-3">
      <img src="${pokemon.sprites.front_default || ''}" alt="${pokemon.name}" class="w-24 h-24 object-contain bg-white rounded" />
    </div>
    <h3 class="text-center text-xl font-bold capitalize text-gray-900">${capitalize(pokemon.name)}</h3>
    <div class="text-center mt-2">${typesBadges}</div>
  `;

  // Sección inferior con altura, peso y botón
  const bottomSection = document.createElement('div');
  bottomSection.className = `p-5 grid grid-cols-2 gap-2 text-center text-sm font-semibold text-gray-700`;

  bottomSection.innerHTML = `

    <button
      class="mt-4 col-span-2 bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold py-2 rounded hover:from-green-500 hover:to-green-700 transition"
      onclick="showPokemonDetails(${pokemon.id})"
    >Ver Detalles 📊</button>
  `;

  card.appendChild(colorStripe);
  card.appendChild(mainContent);
  card.appendChild(bottomSection);

  return card;
}


// Mostrar detalles en modal
async function showPokemonDetails(pokemonId) {
  showLoading(true);
  try {
    const res = await fetch(`${API_BASE_URL}/pokemon/${pokemonId}`);
    if (!res.ok) throw new Error('No encontrado');
    const pokemon = await res.json();

    modalTitle.textContent = `#${pokemon.id.toString().padStart(3, '0')} ${capitalize(pokemon.name)}`;
    modalContent.innerHTML = `
      <div class="text-center mb-4">
        <img src="${pokemon.sprites.front_default || ''}" alt="${pokemon.name}" class="w-48 h-48 mx-auto" />
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4 text-gray-700">
        <div>
          <h3 class="font-semibold">Altura:</h3>
          <p>${(pokemon.height / 10).toFixed(1)} m</p>
        </div>
        <div>
          <h3 class="font-semibold">Peso:</h3>
          <p>${(pokemon.weight / 10).toFixed(1)} kg</p>
        </div>
      </div>

      <div class="mb-4">
        <h3 class="font-semibold mb-2">Tipos:</h3>
        ${pokemon.types.map(t => `<span class="inline-block px-3 py-1 text-xs rounded-full text-white mr-2 ${getTypeColor(t.type.name)}">${capitalize(t.type.name)}</span>`).join('')}
      </div>

      <div class="mb-4">
        <h3 class="font-semibold mb-2">Habilidades:</h3>
        <ul class="list-disc list-inside text-gray-700">
          ${pokemon.abilities.map(a => `<li class="capitalize">${a.ability.name.replace(/-/g, ' ')}</li>`).join('')}
        </ul>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Estadísticas Base:</h3>
        ${createStatsDisplay(pokemon.stats)}
      </div>
    `;

    pokemonModal.classList.remove('hidden');
    pokemonModal.classList.add('flex');
  } catch (error) {
    console.error(error);
    alert('Error al cargar detalles del Pokémon.');
  } finally {
    showLoading(false);
  }
}

// Crear barras de estadísticas
function createStatsDisplay(stats) {
  return stats.map(stat => {
    const name = stat.stat.name.replace(/-/g, ' ');
    const value = stat.base_stat;
    const percentage = Math.min((value / 200) * 100, 100);
    return `
      <div class="mb-2">
        <div class="flex justify-between text-sm text-gray-700 font-semibold capitalize">
          <span>${name}</span><span>${value}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Actualizar paginación
function updatePaginationControls(page, totalPages) {
  pageInfo.textContent = `Página ${page} de ${totalPages}`;
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page === totalPages;

  // Actualizar estilos disabled
  [prevBtn, nextBtn].forEach(btn => {
    if (btn.disabled) {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });

  // Actualizar etiquetas superiores
  currentPageLabel.textContent = page;
  totalCountLabel.textContent = totalPokemon;
}

// Event listeners
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

  pokemonModal.addEventListener('click', (e) => {
    if (e.target === pokemonModal) {
      pokemonModal.classList.add('hidden');
      pokemonModal.classList.remove('flex');
    }
  });

  searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    currentPage = 1;
    loadPokemonList();
  }, 500));

  clearFiltersBtn.addEventListener('click', () => {
    selectedTypes.clear();
    searchQuery = '';
    searchInput.value = '';
    currentPage = 1;
    renderTypeChips();
    loadPokemonList();
  });
}

// Mostrar/ocultar loading
function showLoading(show) {
  if (show) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

// Helpers

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

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Debounce para evitar llamadas excesivas
function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Exponer función global para onclick en tarjeta
window.showPokemonDetails = showPokemonDetails;
