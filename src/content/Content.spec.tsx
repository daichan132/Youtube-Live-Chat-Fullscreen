import { render } from '@testing-library/react';
import Content from './Content';

describe('content', () => {
  test('renders content example', () => {
    render(<Content />);
  });
});
