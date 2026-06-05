import {describe, expect, it, vi} from 'vitest';
import {render, waitFor} from '@testing-library/react';
import {Bar, BarChart, ResponsiveContainer} from 'recharts';

describe('test layout setup', () => {
  it('reports non-zero element size through ResizeObserver', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    let width = 0;
    let height = 0;
    const observer = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
    });

    observer.observe(element);
    await Promise.resolve();

    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('renders responsive charts without layout warnings', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[{name: 'A', minutes: 10}]}>
          <Bar dataKey="minutes" />
        </BarChart>
      </ResponsiveContainer>,
    );

    await waitFor(() => {
      expect(consoleWarn).not.toHaveBeenCalledWith(expect.stringContaining('should be greater than 0'));
    });
    consoleWarn.mockRestore();
  });
});
