import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Ping } from '../../src/ui/ping/Ping';

describe('Ping', () => {
  it('render div khi không có onClick, anchor khi có', () => {
    const { container, unmount } = render(<Ping />);
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.firstElementChild?.getAttribute('role')).toBeNull();
    unmount();

    render(<Ping onClick={() => {}} />);
    const anchor = screen.getByRole('button');
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('tabindex')).toBe('0');
  });

  it('count={0} hiển thị trong span, không phải text trần', () => {
    // Regression: điều kiện cũ là `{count && <span>}`. Với `count={0}` thì `0 &&`
    // trả về số 0, và React RENDER số 0 - ra một "0" trần ngoài span, không có
    // class nào. Không phải "không render gì" như trực giác.
    const { container } = render(<Ping count={0} />);
    const span = container.querySelector('.tnt-ping-count');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('0');
  });

  it('không truyền count thì không có node count nào', () => {
    const { container } = render(<Ping />);
    expect(container.querySelector('.tnt-ping-count')).toBeNull();
  });

  it('chỉ thêm class offset khi có prefix', () => {
    const { container, unmount } = render(<Ping count={3} />);
    expect(container.querySelector('.tnt-ping-body-offset')).toBeNull();
    unmount();

    const withPrefix = render(<Ping count={3} prefix={<span>pre</span>} />);
    expect(withPrefix.container.querySelector('.tnt-ping-body-offset')).not.toBeNull();
  });

  it('KHÔNG dùng class Tailwind thô nào trong JSX', () => {
    // Bundle cố ý không ship utility Tailwind. Một class Tailwind trong JSX là phụ
    // thuộc NGẦM vào Tailwind của host: host không có thì component vỡ layout.
    // Đo được trước khi sửa: `.tnt-ping` nhận `display: block` thay vì `inline-flex`.
    const { container } = render(<Ping count={3} prefix={<span>pre</span>} />);
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .filter((c) => !c.startsWith('tnt-'));
    expect(classes).toEqual([]);
  });

  it('hai dot chỉ để trang trí nên phải aria-hidden', () => {
    const { container } = render(<Ping />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('gọi onClick khi click', async () => {
    const onClick = vi.fn();
    render(<Ping onClick={onClick} />);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
