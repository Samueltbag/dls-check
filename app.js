// Configurações e Chaves
const PLAYLIST_ID = "PLaUTz-QvZS37jBnXDKxwUPnK3FN1EnNQC"; // Playlist da Quinta Temporada do DLS
const STORAGE_KEY_API = "dls_yt_api_key";
const STORAGE_KEY_WATCHED = "dls_watched_ids";

let apiKey = localStorage.getItem(STORAGE_KEY_API) || "";
let watchedIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_WATCHED) || "[]"));

// Elementos DOM
const feedContainer = document.getElementById("feed");
const statsContainer = document.getElementById("stats");

document.getElementById("btn-config").addEventListener("click", promptApiKey);
document.getElementById("btn-sync").addEventListener("click", fetchEpisodes);

// Solicita a API Key na primeira execução ou ao clicar em Config
function promptApiKey() {
  const key = prompt("Informe sua YouTube Data API v3 Key:", apiKey);
  if (key !== null) {
    apiKey = key.trim();
    localStorage.setItem(STORAGE_KEY_API, apiKey);
    if (apiKey) fetchEpisodes();
  }
}

// Alterna o status de assistido e salva localmente
function toggleWatched(videoId) {
  if (watchedIds.has(videoId)) {
    watchedIds.delete(videoId);
  } else {
    watchedIds.add(videoId);
  }
  localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(Array.from(watchedIds)));
  // Atualiza apenas a interface mantendo os dados em memória
  if (window.currentEpisodes) {
    renderFeed(window.currentEpisodes);
  } else {
    fetchEpisodes();
  }
}

// Busca TODOS os episódios da playlist do YouTube (tratando paginação)
async function fetchEpisodes() {
  if (!apiKey) {
    statsContainer.innerHTML = `⚠ Cadastre sua <b>API Key</b> do Google Cloud no botão acima para começar.`;
    return;
  }

  statsContainer.innerText = "Buscando episódios da 5ª Temporada...";

  try {
    let allItems = [];
    let nextPageToken = "";

    // Loop para buscar todas as páginas de vídeos da playlist
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

// Renderiza a lista na ordem natural da playlist (mais recentes para mais antigos)
function renderFeed(episodes) {
  const watchedCount = episodes.filter(ep => watchedIds.has(ep.id)).length;
  statsContainer.innerText = `Assistidos: ${watchedCount} de ${episodes.length} episódios da 5ª Temporada`;

  feedContainer.innerHTML = "";

  if (episodes.length === 0) {
    feedContainer.innerHTML = `<p class="text-center text-zinc-500 py-8">Nenhum episódio encontrado.</p>`;
    return;
  }

  episodes.forEach(ep => {
    const isWatched = watchedIds.has(ep.id);
    const card = document.createElement("div");

    // Estilo adaptado para quando estiver assistido vs pendente
    const cardBg = isWatched ? "bg-zinc-900/40 opacity-60 border-zinc-800/50" : "bg-zinc-900 border-zinc-800";
    const btnStyle = isWatched ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-emerald-600 hover:text-white";

    card.className = `flex bg-zinc-900 rounded-lg overflow-hidden border p-3 gap-3 items-center transition-all ${cardBg}`;

    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${ep.id}" target="_blank" class="relative flex-shrink-0 w-32 h-20 rounded overflow-hidden bg-zinc-800">
        <img src="${ep.thumb}" class="w-full h-full object-cover">
      </a>
      <div class="flex-grow min-w-0 py-1">
        <h2 class="text-xs sm:text-sm font-semibold text-zinc-100 leading-snug break-words">${ep.title}</h2>
      </div>
      <button onclick="toggleWatched('${ep.id}')" class="flex-shrink-0 px-3 py-3 text-sm font-bold rounded-lg transition-colors ${btnStyle}" title="${isWatched ? 'Marcar como não assistido' : 'Marcar como assistido'}">
        ✓
      </button>
    `;
    feedContainer.appendChild(card);
  });
}

// Inicialização automática
if (apiKey) fetchEpisodes();
