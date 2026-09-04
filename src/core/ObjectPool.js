// ObjectPool genérico. create() cria, reset(obj) prepara para reuso.
export class ObjectPool {
  constructor(create, reset, initial = 0) {
    this.create = create;
    this.reset = reset;
    this.free = [];
    this.active = new Set();
    for (let i = 0; i < initial; i++) this.free.push(this.create());
  }
  acquire() {
    const obj = this.free.length ? this.free.pop() : this.create();
    this.active.add(obj);
    return obj;
  }
  release(obj) {
    if (!this.active.has(obj)) return;
    this.active.delete(obj);
    if (this.reset) this.reset(obj);
    this.free.push(obj);
  }
  releaseAll() {
    for (const obj of this.active) { if (this.reset) this.reset(obj); this.free.push(obj); }
    this.active.clear();
  }
  get activeCount() { return this.active.size; }
}
