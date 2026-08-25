import { useEffect, useState } from 'react';
import { GameCatalogData, loadGameCatalog } from '../game/GameCatalog';

export function useGameCatalog() {
  const [catalog, setCatalog] = useState<GameCatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadGameCatalog()
      .then((data) => {
        if (mounted) setCatalog(data);
      })
      .catch((reason: unknown) => {
        if (mounted) setError(reason instanceof Error ? reason.message : 'Falha ao carregar catálogo do jogo');
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { catalog, error, loading: !catalog && !error };
}