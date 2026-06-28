import { describe, it, expect } from 'vitest';
import { omitKey } from '@app/store.js';

describe('omitKey', () => {
  it('удаляет ключ из плоского объекта', () => {
    const result = omitKey({ a: 1, b: 2, c: 3 }, 'b');
    expect(result).toEqual({ a: 1, c: 3 });
    expect(result).not.toHaveProperty('b');
  });

  it('возвращает новый объект (не мутирует вход)', () => {
    const input = { a: 1, b: 2 };
    const result = omitKey(input, 'a');
    expect(result).not.toBe(input);
    expect(input).toEqual({ a: 1, b: 2 });
  });

  it('не копирует унаследованные свойства прототипа (только own)', () => {
    const proto = { inherited: 'value' };
    const input = Object.create(proto);
    input.own = 1;
    const result = omitKey(input, 'own');
    expect(result).not.toHaveProperty('own');
    expect(result).not.toHaveProperty('inherited'); // own-копия, прототип не переносится
  });

  it('пустой объект → пустой объект', () => {
    expect(omitKey({}, 'any')).toEqual({});
  });

  it('несуществующий ключ → без изменений', () => {
    const result = omitKey({ a: 1 }, 'nonexistent');
    expect(result).toEqual({ a: 1 });
  });
});
