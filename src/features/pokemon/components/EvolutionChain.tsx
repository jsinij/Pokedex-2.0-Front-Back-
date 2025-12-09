import { useEvolutionChain } from '../hooks/useEvolutionChain';
import type { EvoStage } from '../hooks/useEvolutionChain';

/** Arma una etiqueta humana con las condiciones de evolución. */
function conditionLabel(d?: EvoStage['detailsFromPrev'] | null) {
  if (!d) return '';
  const parts: string[] = [];
  if (d.trigger) parts.push(d.trigger.replace(/-/g, ' '));
  if (d.min_level != null) parts.push(`Lv ${d.min_level}`);
  if (d.item) parts.push(`item: ${d.item}`);
  if (d.held_item) parts.push(`held: ${d.held_item}`);
  if (d.time_of_day) parts.push(d.time_of_day);
  if (d.known_move) parts.push(`move: ${d.known_move}`);
  if (d.happiness != null) parts.push(`friendship ≥ ${d.happiness}`);
  if (d.other) parts.push(d.other);
  return parts.join(' · ');
}

/** Render recursivo de ramas de evolución. */
function Stage({ node }: { node: EvoStage }) {
  return (
    <div className="evo-stage">
      <div className="evo-card">
        {node.sprite ? (
          <img className="evo-sprite" src={node.sprite} alt={node.name} />
        ) : (
          <div className="evo-sprite placeholder" />
        )}
        <div className="evo-name">{node.name}</div>
      </div>

      {node.children.length > 0 && (
        <div className="evo-children">
          {node.children.map((child) => (
            <div key={child.name} className="evo-branch">
              <div className="evo-arrow">➜</div>
              {child.detailsFromPrev && (
                <div className="evo-cond">
                  {conditionLabel(child.detailsFromPrev)}
                </div>
              )}
              <Stage node={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Panel de “pokédex pequeña” de la derecha.
 * Recibe el target (nombre o id) desde App y pinta la cadena evolutiva.
 */
export default function EvolutionChain({
  target,
}: {
  target: string | number | undefined;
}) {
  const { data, loading, error } = useEvolutionChain(target ?? null);
  const hasNoEvolution = data && data.children.length === 0;

  return (
    <div className="evo">
      <div className="evo-title">Cadena de evolución</div>
      {loading && <div className="evo-loading">Loading…</div>}
      {error && <div className="evo-error">⚠ {error}</div>}
      {hasNoEvolution && (
        <div className="evo-no-evolution">
          Este Pokémon no tiene ninguna línea evolutiva
        </div>
      )}
      {!loading && !error && data && !hasNoEvolution && <Stage node={data} />}
    </div>
  );
}
