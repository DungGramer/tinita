import { getFileNameParts } from '../file/getFileNameParts';
import {
  DEFAULT_EXTENSION_TO_TYPE,
  DEFAULT_TYPE_TO_EXTENSION,
} from './defaultTypes';
import type { Mime, MimePlugin } from './types';

/** Escape for use inside a RegExp character-free alternation. */
const escapeForRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normaliseExtension = (extension: string): string =>
  extension.replace(/^\./, '').toLowerCase();

/** `text/plain;charset=utf-8` and `TEXT/PLAIN` both resolve as `text/plain`. */
const normaliseType = (mimeType: string): string =>
  mimeType.split(';')[0].trim().toLowerCase();

/**
 * A `Mime` instance with its own tables.
 *
 * Use this when one part of an app needs the full table and another must not see
 * it - two instances cannot leak registrations into each other. For the usual case,
 * the shared `mime` export is enough.
 */
export function createMime(): Mime {
  const typeToExtension = new Map(Object.entries(DEFAULT_TYPE_TO_EXTENSION));
  const extensionToType = new Map(Object.entries(DEFAULT_EXTENSION_TO_TYPE));
  const applied = new WeakSet<MimePlugin>();

  const addTypes: MimePluginAddTypes = (
    nextTypeToExtension,
    nextExtensionToType
  ) => {
    for (const [type, extension] of Object.entries(nextTypeToExtension)) {
      const key = normaliseType(type);
      if (!typeToExtension.has(key)) {
        typeToExtension.set(key, normaliseExtension(extension));
      }
    }
    for (const [extension, type] of Object.entries(nextExtensionToType)) {
      const key = normaliseExtension(extension);
      if (!extensionToType.has(key)) {
        extensionToType.set(key, normaliseType(type));
      }
    }
  };

  const instance: Mime = {
    fromExtension(extension) {
      if (typeof extension !== 'string') {
        throw new TypeError(
          `mime.fromExtension: expected a string, got ${typeof extension}`
        );
      }

      return extensionToType.get(normaliseExtension(extension));
    },

    fromFileName(fileName) {
      if (typeof fileName !== 'string') {
        throw new TypeError(
          `mime.fromFileName: expected a string, got ${typeof fileName}`
        );
      }
      const [, extension] = getFileNameParts(fileName);

      return extension
        ? extensionToType.get(extension.toLowerCase())
        : undefined;
    },

    toExtension(mimeType) {
      if (typeof mimeType !== 'string') {
        throw new TypeError(
          `mime.toExtension: expected a string, got ${typeof mimeType}`
        );
      }

      return typeToExtension.get(normaliseType(mimeType));
    },

    acceptToRegExp(accept) {
      if (typeof accept !== 'string') {
        throw new TypeError(
          `mime.acceptToRegExp: expected a string, got ${typeof accept}`
        );
      }

      const extensions = new Set<string>();
      for (const rawToken of accept.split(',')) {
        const token = rawToken.trim();
        if (token === '') continue;

        if (token.startsWith('.')) {
          extensions.add(normaliseExtension(token));
          continue;
        }

        const type = normaliseType(token);
        if (type.endsWith('/*')) {
          const prefix = `${type.slice(0, -1)}`;
          for (const [extension, candidate] of extensionToType) {
            if (candidate.startsWith(prefix)) extensions.add(extension);
          }
          continue;
        }

        // A full type contributes every extension that resolves back to it, not just
        // the preferred one: accept="image/jpeg" must still match `photo.jpeg`.
        for (const [extension, candidate] of extensionToType) {
          if (candidate === type) extensions.add(extension);
        }
      }

      // Nothing recognised means match nothing. `new RegExp('')` would match every
      // file name, which is the opposite of what an accept filter is for.
      if (extensions.size === 0) return /(?!)/;

      const alternation = [...extensions].map(escapeForRegExp).join('|');

      return new RegExp(`\\.(?:${alternation})$`, 'i');
    },

    extend(plugin) {
      if (typeof plugin !== 'function') {
        throw new TypeError(
          `mime.extend: expected a plugin function, got ${typeof plugin}`
        );
      }
      if (applied.has(plugin)) return instance;
      applied.add(plugin);
      plugin({ addTypes });

      return instance;
    },
  };

  return instance;
}

type MimePluginAddTypes = (
  typeToExtension: Readonly<Record<string, string>>,
  extensionToType: Readonly<Record<string, string>>
) => void;

/**
 * Shared instance, carrying the default table.
 *
 * Extending this is global to the process, which is the point: a plugin applied once
 * at startup is visible everywhere. Use `createMime()` when that is not wanted.
 */
export const mime = createMime();
