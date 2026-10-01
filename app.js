// Configurações e Chaves
const PLAYLIST_ID = "UUvA3GfI6aT8J79YcTjO3Aiw"; // ID da Playlist de Uploads do Desce a Letra Show (UU + final do channel ID)
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

// Salva o progresso no localStorage
function toggleWatched(videoId) {
  if (watchedIds.has(videoId)) {
    watchedIds.delete(videoId);
  } else {
    watchedIds.add(videoId);
  }
  localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(Array.from(watchedIds)));
  fetchEpisodes(); // Re-renderiza atualizando a lista
}

// Busca episódios da API do YouTube
async function fetchEpisodes() {
  if (!apiKey) {
    statsContainer.innerHTML = `⚠️️ Cadastre sua <b>API Key</b> do Google Cloud no botão acima para começar.`;
    return;
  }

  statsContainer.innerText = "Buscando episódios do YouTube...";

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=50&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      alert("Erro na API: " + data.error.message);
      return;
    }

    const items = data.items.map(item => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumb: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
    }));

    renderFeed(items);
  } catch (err) {
    statsContainer.innerText = "Erro ao carregar dados da API.";
    console.error(err);
  }
}

// Lógica Principal: Intercalação (1 Antigo / 1 Recente)
function renderFeed(episodes) {
  const unwatched = episodes.filter(ep => !watchedIds.has(ep.id));
  const watchedCount = episodes.length - unwatched.length;

  statsContainer.innerText = `Assistidos: ${watchedCount} de ${episodes.length} episódios carregados`;

  // Separar em duas pilhas
  const antigos = [...unwatched].reverse(); // Do mais antigo pro mais novo
  const recentes = [...unwatched];          // Do mais novo pro mais antigo

  const intercalados = [];
  const total = unwatched.length;
  let iAntigo = 0;
  let iRecente = 0;

  for (let k = 0; k < total; k++) {
    if (k % 2 === 0 && iAntigo < antigos.length) {
      // Prioridade / Tipo: Antigo
      const ep = antigos[iAntigo++];
      intercalados.push({ ...ep, tag: "ANTIGO" });
    } else if (iRecente < recentes.length) {
      // Prioridade / Tipo: Recente
      const ep = recentes[iRecente++];
      intercalados.push({ ...ep, tag: "RECENTE" });
    }
  }

  // Renderizar Cards
  feedContainer.innerHTML = "";

  if (intercalados.length === 0) {
    feedContainer.innerHTML = `<p class="text-center text-zinc-500 py-8">🎉 Você está em dia com os episódios!</p>`;
    return;
  }

  intercalados.forEach(ep => {
    const card = document.createElement("div");
    card.className = "flex bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow p-2 gap-3 items-center";

    const isAntigo = ep.tag === "ANTIGO";
    const badgeColor = isAntigo ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30";

    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${ep.id}" target="_blank" class="relative flex-shrink-0 w-28 h-16 rounded overflow-hidden">
        <img src="${ep.thumb}" class="w-full h-full object-cover">
      </a>
      <div class="flex-grow min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}">${ep.tag}</span>
        </div>
        <h2 class="text-xs font-semibold text-zinc-200 truncate" title="${ep.title}">${ep.title}</h2>
      </div>
      <button onclick="toggleWatched('${ep.id}')" class="px-3 py-2 text-xs font-bold bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-400 rounded-lg transition-colors">
        ✓
      </button>
    `;
    feedContainer.appendChild(card);
  });
}

// Inicialização automática
if (apiKey) fetchEpisodes();