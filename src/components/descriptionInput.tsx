import { Box, render, Text } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
interface DescriptionInputProps {
  prompt: string;
  required: boolean;
  onSubmit: (input: string) => void;
}

export const DescriptionInput: React.FC<DescriptionInputProps> = ({
  prompt,
  onSubmit,
  required
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (required && !input.trim()) {
      setError('This field is required');
    } else {
      onSubmit(input);
    }
  };
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{prompt}</Text>
      </Box>
      <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      {error && (
        <Box>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
};

export const descriptionInput = async (
  prompt: string,
  required = false
): Promise<string> => {
  return new Promise((resolve) => {
    const { unmount } = render(
      <DescriptionInput
        prompt={prompt}
        required={required}
        onSubmit={(input) => {
          unmount();
          resolve(input);
        }}
      />
    );
  });
};
