import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App routing', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('renders the landing page by default', () => {
    render(<App />);

    expect(screen.getByText('JIPCHAK')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'START' })).toBeTruthy();
  });

  it('navigates to the play screen from the landing page', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'START' }));

    // 애니메이션 및 페이지 이동 대기
    expect(await screen.findByText('Cam1')).toBeTruthy();
    expect(screen.getByText('나의 기록')).toBeTruthy();
    expect(window.location.hash).toContain('/play');
  });
});
