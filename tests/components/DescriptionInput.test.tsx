// @vitest-environment jsdom

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  DescriptionInput,
  descriptionInput
} from '../../src/components/descriptionInput';

describe('DescriptionInput', () => {
  it('should render the prompt text', () => {
    render(
      <DescriptionInput
        prompt="Enter your description"
        required={true}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Enter your description')).toBeInTheDocument();
  });

  it('should show an error message if required and input is empty', () => {
    render(
      <DescriptionInput
        prompt="Enter your description"
        required={true}
        onSubmit={vi.fn()}
      />
    );

    // Simulate form submission
    // console.log(screen.getByText('123'));
    // console.log(screen.getByTitle('ink-text'));
    // fireEvent.submit(screen.getByText('1'));

    // expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  // it('should call onSubmit with the input value', () => {
  //   const mockOnSubmit = vi.fn();
  //   render(
  //     <DescriptionInput
  //       prompt="Enter your description"
  //       required={false}
  //       onSubmit={mockOnSubmit}
  //     />
  //   );

  //   const input = screen.getByRole('textbox');

  //   // Simulate user input
  //   fireEvent.change(input, { target: { value: 'My description' } });
  //   fireEvent.submit(input);

  //   expect(mockOnSubmit).toHaveBeenCalledWith('My description');
  // });

  // it('should resolve the promise with the input value - non-required', async () => {
  //   const input = await descriptionInput('Enter your description', false);

  //   const inputElement = screen.getByRole('textbox');
  //   fireEvent.change(inputElement, { target: { value: 'Some description' } });
  //   fireEvent.submit(inputElement);

  //   expect(input).toBe('Some description');
  // });

  // it('should resolve the promise with the input value - required', async () => {
  //   const input = await descriptionInput('Enter your description', true);

  //   // Simulate user input
  //   const inputElement = screen.getByRole('textbox');
  //   fireEvent.change(inputElement, {
  //     target: { value: 'Some required description' }
  //   });
  //   fireEvent.submit(inputElement);

  //   expect(input).toBe('Some required description');
  // });
});
