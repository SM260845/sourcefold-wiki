import { formatName } from './util.js';

export function greet(name: string): string {
  return `hello ${formatName(name)}`;
}
