import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FixedWindowList } from './FixedWindowList';

describe('FixedWindowList', () => {
  it('renders all rows when below the virtualization threshold', () => {
    render(
      <FixedWindowList
        items={['a', 'b', 'c']}
        rowHeight={48}
        threshold={24}
        getKey={(item) => item}
        renderRow={(item) => <span>{item}</span>}
      />,
    );

    expect(screen.getAllByText(/^[abc]$/)).toHaveLength(3);
  });

  it('windowing renders a bounded subset for long lists', () => {
    const items = Array.from({ length: 80 }, (_, i) => `ep-${i}`);
    const { container } = render(
      <FixedWindowList
        items={items}
        rowHeight={48}
        threshold={24}
        maxHeight={240}
        overscan={0}
        getKey={(item) => item}
        renderRow={(item) => <span>{item}</span>}
      />,
    );

    const rendered = container.querySelectorAll('li span');
    expect(rendered.length).toBeLessThan(80);
    expect(rendered.length).toBeGreaterThan(0);
    expect(screen.getByText('ep-0')).toBeInTheDocument();
    expect(screen.queryByText('ep-79')).not.toBeInTheDocument();
  });
});
