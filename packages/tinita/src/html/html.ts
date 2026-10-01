import type { Html, HtmlPlugin } from './types';

/**
 * The five characters HTML actually requires escaping. Everything else is
 * optional, and the full named set costs 30KB - see the `entities` plugin.
 *
 * `'` encodes to `&#39;` rather than `&apos;`: `&apos;` is not in HTML 4 and some
 * older consumers print it verbatim, while a numeric reference is universal.
 */
const BASE_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a literal for use inside a regular expression alternation. */
function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertString(value: unknown, method: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`html.${method}() expects a string, received ${typeof value}`);
  }
}

/**
 * Matches anything shaped like an entity reference so `decode` can look it up.
 *
 * Case-insensitive on purpose: it only finds candidates. The lookup that follows
 * is a plain Map read and therefore exact, which is what keeps `&Aacute;` and
 * `&aacute;` apart - they are different characters.
 */
const ENTITY_SHAPE = /&(?:#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi;

/**
 * Create an isolated encoder.
 *
 * Prefer this over the shared `html` instance when you need a map nobody else can
 * change: `extend` mutates the instance it is called on, so two parts of one app
 * extending the shared instance differently will see each other's entities.
 */
export function createHtml(): Html {
  /** character -> entity */
  const encodeEntities = new Map<string, string>();
  /** entity -> character. Built from `encodeEntities`, always in step with it. */
  const decodeEntities = new Map<string, string>();
  const applied = new Set<HtmlPlugin>();

  /** Rebuilt lazily, because registering entities is far rarer than encoding. */
  let encodeMatcher: RegExp | null = null;

  const addEntities = (entities: Readonly<Record<string, string>>): void => {
    for (const [character, rawEntity] of Object.entries(entities)) {
      // 64 entries of the published named-entity table ship without the trailing
      // `;`. `&bne` followed by any text reads as the entity `&bnex`, which is
      // undefined, so the browser prints the whole thing verbatim.
      const entity = rawEntity.endsWith(';') ? rawEntity : `${rawEntity};`;

      // First registration of an entity wins. Two characters sharing one entity
      // makes decode ambiguous, and the round-trip invariant would silently fail
      // for whichever one lost.
      if (decodeEntities.has(entity)) continue;

      encodeEntities.set(character, entity);
      decodeEntities.set(entity, character);
    }
    encodeMatcher = null;
  };

  const buildEncodeMatcher = (): RegExp => {
    // Alternation, not a character class. A character class cannot express the
    // multi-code-point keys (`<⃒`), and the table contains `\`, `]`, `^` and `-`,
    // every one of which means something else inside `[...]`.
    //
    // Longest first so `<⃒` is preferred over a bare `<` at the same position.
    const alternatives = [...encodeEntities.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeForRegExp)
      .join('|');

    return new RegExp(alternatives, 'g');
  };

  const instance: Html = {
    encode(input) {
      assertString(input, 'encode');
      encodeMatcher ??= buildEncodeMatcher();
      // `replace` with a global regex resets lastIndex itself, so the cached
      // matcher is safe to share across calls.
      return input.replace(encodeMatcher, (match) => encodeEntities.get(match) ?? match);
    },

    decode(input) {
      assertString(input, 'decode');
      return input.replace(ENTITY_SHAPE, (match) => {
        const named = decodeEntities.get(match) ?? decodeEntities.get(`${match};`);
        if (named !== undefined) return named;

        const numeric = /^&#(x)?([0-9a-f]+);?$/i.exec(match);
        if (!numeric) return match;

        const codePoint = Number.parseInt(numeric[2] as string, numeric[1] ? 16 : 10);
        // Lone surrogates and anything past the Unicode range would make
        // fromCodePoint throw. An unrecognised reference is left as written.
        if (!Number.isFinite(codePoint) || codePoint > 0x10ffff) return match;
        if (codePoint >= 0xd800 && codePoint <= 0xdfff) return match;

        return String.fromCodePoint(codePoint);
      });
    },

    extend(plugin) {
      if (applied.has(plugin)) return instance;
      applied.add(plugin);
      plugin({ addEntities });
      return instance;
    },
  };

  addEntities(BASE_ENTITIES);
  return instance;
}

/**
 * Shared instance, the one most code should import.
 *
 * ```ts
 * import { html } from 'tinita/html';
 * html.encode('<script>');            // '&lt;script&gt;'
 * ```
 *
 * For the full named set, extend it once where your app starts:
 *
 * ```ts
 * import { html } from 'tinita/html';
 * import entities from 'tinita/html/plugin/entities';
 * html.extend(entities);
 * ```
 *
 * `extend` mutates this instance, which is the point of the pattern and also its
 * cost: it is global state. Reach for `createHtml()` when that matters.
 */
export const html: Html = createHtml();
