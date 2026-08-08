export interface RegistryEntry {
  key: string;
  aliases?: readonly string[];
}

export function normalizeRegistryKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * Registry genérico para conteúdo do cliente.
 *
 * O engine consulta chaves estáveis; módulos de conteúdo registram as
 * implementações. Isso evita que o loop principal conheça cada região,
 * monstro ou herói existente no jogo.
 */
export class Registry<T extends RegistryEntry> {
  private readonly entries = new Map<string, T>();
  private readonly aliases = new Map<string, string>();

  public register(entry: T): this {
    const key = normalizeRegistryKey(entry.key);
    if (!key) throw new Error('Registry: key vazia');
    if (this.entries.has(key)) throw new Error(`Registry: key duplicada "${entry.key}"`);

    this.entries.set(key, entry);
    this.aliases.set(key, key);

    for (const alias of entry.aliases ?? []) {
      const normalizedAlias = normalizeRegistryKey(alias);
      const existing = this.aliases.get(normalizedAlias);
      if (existing && existing !== key) {
        throw new Error(`Registry: alias "${alias}" já pertence a "${existing}"`);
      }
      this.aliases.set(normalizedAlias, key);
    }
    return this;
  }

  public registerAll(entries: readonly T[]): this {
    entries.forEach((entry) => this.register(entry));
    return this;
  }

  public get(keyOrAlias: string): T | undefined {
    const normalized = normalizeRegistryKey(keyOrAlias);
    const canonicalKey = this.aliases.get(normalized) ?? normalized;
    return this.entries.get(canonicalKey);
  }

  public has(keyOrAlias: string): boolean {
    return this.get(keyOrAlias) !== undefined;
  }

  public list(): T[] {
    return [...this.entries.values()];
  }
}
