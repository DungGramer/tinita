import { describe, expect, it } from 'vitest';
import { createHtml, html } from '../src/html/html';
import entities from '../src/html/plugin/entities';

/** A fresh instance per test: `extend` mutates, so sharing would leak across tests. */
const base = () => createHtml();
const full = () => createHtml().extend(entities);

describe('html - core, no plugin', () => {
  it('escapes exactly the five characters HTML requires', () => {
    expect(base().encode(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  it('leaves everything else alone, including characters the full table covers', () => {
    // Without the plugin, `ò` is not an entity. Encoding it anyway would mean the
    // core silently carries the 30KB table.
    expect(base().encode('Hòm nhĩ trái')).toBe('Hòm nhĩ trái');
  });

  it('escapes `&` first, so an escaped entity is not re-read as an entity', () => {
    expect(base().encode('&lt;')).toBe('&amp;lt;');
    expect(base().decode('&amp;lt;')).toBe('&lt;');
  });

  it('decodes numeric references, decimal and hex, with or without the semicolon', () => {
    const h = base();
    expect(h.decode('&#60;&#x3C;&#60&#x3C')).toBe('<<<<');
  });

  it('decodes an astral code point as one character, not two halves', () => {
    expect(base().decode('&#x1F600;')).toBe('\u{1F600}');
    expect([...base().decode('&#x1F600;')]).toHaveLength(1);
  });

  it('leaves an unknown entity exactly as written', () => {
    expect(base().decode('&notareal; &#x110000; &#xD800;')).toBe('&notareal; &#x110000; &#xD800;');
  });

  it('empty string in, empty string out', () => {
    expect(base().encode('')).toBe('');
    expect(base().decode('')).toBe('');
  });

  it('THROWS on a non-string rather than logging and returning undefined', () => {
    // The version this replaced did `console.error` then `return`, which made the
    // return type `string | undefined` and hid the mistake at the call site.
    // @ts-expect-error deliberately wrong type
    expect(() => base().encode(null)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => base().decode(42)).toThrow(TypeError);
  });
});

describe('html - entities plugin', () => {
  it('encodes the full named table once extended', () => {
    expect(full().encode('Hòm nhĩ trái')).toBe('H&ograve;m nh&itilde; tr&aacute;i');
  });

  it('is case-sensitive: an uppercase letter never borrows the lowercase entity', () => {
    // Locks the property in. The version this replaced used an `i` flag, which
    // happened not to corrupt anything because it looked entities up by the text
    // it matched rather than by the pattern - but nothing was holding that in
    // place.
    const h = full();
    expect(h.encode('Á')).toBe('&Aacute;');
    expect(h.encode('á')).toBe('&aacute;');
    expect(h.decode('&Aacute;')).toBe('Á');
    expect(h.decode('&aacute;')).toBe('á');
  });

  it('every emitted entity ends with a semicolon', () => {
    // 65 entries of the source table ship without one. `&bne` followed by text
    // reads as the undefined entity `&bnex` and a browser prints it verbatim.
    const encoded = full().encode('<⃒ =⃥ ≮');
    const bare = encoded.match(/&[a-zA-Z][a-zA-Z0-9]*(?![a-zA-Z0-9;])/g);
    expect(bare).toBeNull();
  });

  it('handles multi-code-point keys, which a character class cannot express', () => {
    // The real defect in the version this replaced. Its `[...]` matcher could only
    // ever match one code point, so `<⃒` came out as `&lt;` with the combining
    // mark left dangling after it - a different character entirely. 65 keys in the
    // table are affected.
    const h = full();
    expect(h.encode('<⃒')).toBe('&nvlt;');
    expect(h.decode('&nvlt;')).toBe('<⃒');
  });

  it('applying the same plugin twice is a no-op', () => {
    const once = createHtml().extend(entities);
    const twice = createHtml().extend(entities).extend(entities);
    expect(twice.encode('Hòm nhĩ')).toBe(once.encode('Hòm nhĩ'));
  });

  it('extend returns the same instance so calls chain', () => {
    const h = createHtml();
    expect(h.extend(entities)).toBe(h);
  });

  it('a custom plugin can add entities, and the first registration of an entity wins', () => {
    const h = createHtml().extend((api) => api.addEntities({ '©': '&copy;' }));
    expect(h.encode('©')).toBe('&copy;');
    // `&amp;` is already claimed by `&`, so this registration is ignored rather
    // than making decode ambiguous.
    h.extend((api) => api.addEntities({ '§': '&amp;' }));
    expect(h.encode('§')).toBe('§');
    expect(h.decode('&amp;')).toBe('&');
  });
});

describe('html - round-trip invariant', () => {
  const SAMPLES = [
    '',
    'plain ascii',
    `& < > " '`,
    '&amp;',
    '&&&',
    'Hòm nhĩ trái',
    'Tiếng Việt có dấu: ăâêôơưđ ĂÂÊÔƠƯĐ',
    '\u{1F600}\u{1F1FB}\u{1F1F3}',
    '<⃒=⃥',
    'a'.repeat(1000),
    '<script>alert("xss")</script>',
    "it's a <b>test</b> & more",
  ];

  for (const name of ['core', 'with entities'] as const) {
    const make = name === 'core' ? base : full;

    it(`decode(encode(s)) === s for every sample [${name}]`, () => {
      const h = make();
      for (const sample of SAMPLES) {
        expect(h.decode(h.encode(sample))).toBe(sample);
      }
    });
  }

  it('decode(encode(s)) === s over 2000 random strings [with entities]', () => {
    // Property test rather than examples: the examples above are the cases someone
    // thought of, and the bugs this module replaced were all in cases nobody did.
    const h = full();
    const ALPHABET = [
      ...`&<>"' abcXYZ019`,
      'à',
      'Á',
      'ĩ',
      'đ',
      ' ',
      '\u{1F600}',
      '<⃒',
      '∑',
    ];

    let seed = 0x2f6e2b1;
    const next = () => {
      // xorshift: deterministic, so a failure is reproducible.
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0x100000000;
    };

    for (let i = 0; i < 2000; i += 1) {
      const length = Math.floor(next() * 24);
      let sample = '';
      for (let j = 0; j < length; j += 1) {
        sample += ALPHABET[Math.floor(next() * ALPHABET.length)];
      }
      expect(h.decode(h.encode(sample))).toBe(sample);
    }
  });

  it('encoded output contains no bare `<`, `>` or unescaped `&` [with entities]', () => {
    const h = full();
    const encoded = h.encode('<a href="x">it\'s & more</a>');
    expect(encoded).not.toMatch(/[<>]/);
    expect(encoded).not.toMatch(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/);
  });
});

describe('html - the shared instance', () => {
  it('is usable without extending', () => {
    expect(html.encode('<b>')).toBe('&lt;b&gt;');
  });
});
