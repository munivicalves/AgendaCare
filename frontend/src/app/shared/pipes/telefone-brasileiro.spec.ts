import { formatarTelefoneBrasileiro, TelefoneBrasileiroPipe } from './telefone-brasileiro';

describe('Brazilian phone presentation', () => {
  it.each([
    ['3432221234', '(34) 3222-1234'],
    ['34999991234', '(34) 99999-1234'],
    ['(34) 3222-1234', '(34) 3222-1234'],
    ['+55 34 99999 1234', '+55 (34) 99999-1234'],
    ['12345', '12345'],
    ['+1 212 555 0123', '+1 212 555 0123'],
    ['3432221234 ramal', '3432221234 ramal'],
    ['+1 212 555 012345', '+1 212 555 012345'],
  ])('formats %s without losing digits', (input, expected) => {
    expect(formatarTelefoneBrasileiro(input)).toBe(expected);
  });
  it('handles missing values', () => {
    expect(formatarTelefoneBrasileiro(null)).toBe('');
    expect(new TelefoneBrasileiroPipe().transform(null)).toBe('N\u00e3o informado');
  });
});
