// ============================================================
// AssetManager — preparado para carregar /models/<tipo>.glb no futuro.
// Se o arquivo não existir (ou falhar), o jogo usa o visual procedural.
// Nenhuma dependência desses arquivos existe hoje.
// ============================================================
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_PATHS = {
  barbudo: 'models/barbudo.glb',
  capitao: 'models/capitao.glb',
  careca: 'models/careca.glb',
  dino: 'models/dino.glb',
  tiozap: 'models/tio_zap.glb',
  assessor: 'models/assessor.glb',
  influencer: 'models/influencer.glb',
  militante: 'models/militante.glb',
};

class AssetManager {
  constructor() {
    this.models = new Map();   // type → gltf
    this.loader = null;
    this.enabled = true;       // desligar para forçar procedural
    this.tried = new Set();
  }

  getModel(type) {
    return this.enabled ? this.models.get(type) || null : null;
  }

  // Tenta carregar todos os modelos em segundo plano. Falhas são silenciosas.
  async preload() {
    if (!this.loader) this.loader = new GLTFLoader();
    const jobs = Object.entries(MODEL_PATHS).map(([type, path]) => this.tryLoad(type, path));
    await Promise.allSettled(jobs);
    return this.models.size;
  }

  async tryLoad(type, path) {
    if (this.tried.has(type)) return;
    this.tried.add(type);
    try {
      // HEAD primeiro para não gerar erro 404 barulhento no console do Vite
      const head = await fetch(path, { method: 'HEAD' });
      const ct = head.headers.get('content-type') || '';
      if (!head.ok || ct.includes('text/html')) return; // Vite devolve index.html para 404
      const gltf = await this.loader.loadAsync(path);
      this.models.set(type, gltf);
      console.info(`[AssetManager] GLB carregado: ${type}`);
    } catch (e) {
      /* sem GLB → procedural */
    }
  }
}

export const assetManager = new AssetManager();
