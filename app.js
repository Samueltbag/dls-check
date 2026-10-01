// Configurações e Chaves
const PLAYLIST_ID = "PLaUTz-QvZS37jBnXDKxwUPnK3FN1EnNQC"; // Playlist da 5ª Temporada
const STORAGE_KEY_API = "dls_yt_api_key";
const STORAGE_KEY_STATUS = "dls_ep_status_map"; // Guarda os status: 'watching' | 'completed'

let apiKey = localStorage.getItem(STORAGE_KEY_API) || "";
// Objeto com mapeamento: { "videoId": "watching" | "completed" }
let statusMap = JSON.parse(localStorage.getItem(STORAGE_KEY_STATUS) || "{}");
let currentFilter = "all"; // 'all' | 'unstarted' | 'watching' | 'completed'

// Elementos DOM
const feedContainer = document.getElementById("feed");
const statsContainer = document.getElementById("stats");

document.getElementById("btn-config").addEventListener("click", promptApiKey);
document.getElementById("btn-sync").addEventListener("click", fetchEpisodes);

// Configura os botões de filtro no topo
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".filter-btn").forEach(b => {
      b.classList.remove("bg-red-600", "text-white");
      b.classList.add("bg-zinc-800", "text-zinc-400");
    });
    e.target.classList.remove("bg-zinc-800", "text-zinc-400");
    e.target.classList.add("bg-red-600", "text-white");

    currentFilter = e.target.dataset.filter;
    if (window.currentEpisodes) renderFeed(window.currentEpisodes);
  });
});

function promptApiKey() {
  const key = prompt("Informe sua YouTube Data API v3 Key:", apiKey);
  if (key !== null) {
    apiKey = key.trim();
    localStorage.setItem(STORAGE_KEY_API, apiKey);
    if (apiKey) fetchEpisodes();
  }
}

// Alterna o status do episódio em ciclo: não iniciado -> em andamento -> concluído -> não iniciado
function cycleStatus(videoId) {
  const current = statusMap[videoId];
  if (!current) {
    statusMap[videoId] = "watching";
  } else if (current === "watching") {
    statusMap[videoId] = "completed";
  } else {
    delete statusMap[videoId];
  }

  localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(statusMap));
  if (window.currentEpisodes) renderFeed(window.currentEpisodes);
}

// Busca episódios da API
async function fetchEpisodes() {
  if (!apiKey) {
    statsContainer.innerHTML = `⚠ Cadastre sua <b>API Key</b> do Google Cloud para começar.`;
    return;
  }

  statsContainer.innerText = "Buscando episódios da 5ª Temporada...";

  try {
    let allItems = [];
    let nextPageToken = "";

    do {
      const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=50${pageParam}&key=${apiKey}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        alert("Erro na API: " + data.error.message);
        return;
      }

      const pageItems = data.items.map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumb: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
      }));

      allItems = allItems.concat(pageItems);
      nextPageToken = data.nextPageToken || "";

    } while (nextPageToken);

    window.currentEpisodes = allItems;
    renderFeed(allItems);
  } catch (err) {
    statsContainer.innerText = "Erro ao carregar dados da API.";
    console.error(err);
  }
}

// Renderiza o feed aplicando os filtros e estilos visuais
function renderFeed(episodes) {
  const completedCount = episodes.filter(ep => statusMap[ep.id] === "completed").length;
  const watchingCount = episodes.filter(ep => statusMap[ep.id] === "watching").length;

  statsContainer.innerText = `Assistindo: ${watchingCount} | Concluídos: ${completedCount} de ${episodes.length}`;

  // Filtragem da lista
  let filtered = episodes.filter(ep => {
    const status = statusMap[ep.id] || "unstarted";
    if (currentFilter === "watching") return status === "watching";
    if (currentFilter === "completed") return status === "completed";
    if (currentFilter === "unstarted") return status === "unstarted";
    return true; // 'all'
  });

  feedContainer.innerHTML = "";

  if (filtered.length === 0) {
    feedContainer.innerHTML = `<p class="text-center text-zinc-500 py-8">Nenhum episódio nesta categoria.</p>`;
    return;
  }

  filtered.forEach(ep => {
    const status = statusMap[ep.id] || "unstarted";
    const card = document.createElement("div");

    let cardBg = "bg-zinc-900 border-zinc-800";
    let btnStyle = "bg-zinc-800 text-zinc-400 hover:bg-zinc-700";
    let btnIcon = "○";
    let badgeHtml = "";

    if (status === "watching") {
      cardBg = "bg-amber-950/20 border-amber-500/40 shadow-sm";
      btnStyle = "bg-amber-500 text-zinc-950 hover:bg-amber-400 font-extrabold";
      btnIcon = "⏳";
      badgeHtml = `<span class="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">ASSISTINDO</span>`;
    } else if (status === "completed") {
      cardBg = "bg-zinc-900/40 opacity-60 border-zinc-800/50";
      btnStyle = "bg-emerald-600 text-white hover:bg-emerald-500";
      btnIcon = "✓";
      badgeHtml = `<span class="inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">CONCLUÍDO</span>`;
    }

    card.className = `flex bg-zinc-900 rounded-lg overflow-hidden border p-3 gap-3 items-center transition-all ${cardBg}`;

    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${ep.id}" target="_blank" class="relative flex-shrink-0 w-32 h-20 rounded overflow-hidden bg-zinc-800">
        <img src="${ep.thumb}" class="w-full h-full object-cover">
      </a>
      <div class="flex-grow min-w-0 py-1">
        ${badgeHtml}
        <h2 class="text-xs sm:text-sm font-semibold text-zinc-100 leading-snug break-words">${ep.title}</h2>
      </div>
      <button onclick="cycleStatus('${ep.id}')" class="flex-shrink-0 px-3 py-3 text-sm font-bold rounded-lg transition-colors ${btnStyle}" title="Alternar status">
        ${btnIcon}
      </button>
    `;
    feedContainer.appendChild(card);
  });
}

// Inicialização automática
if (apiKey) fetchEpisodes();
