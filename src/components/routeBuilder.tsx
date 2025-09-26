import { Box, render, Text } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
import t from '../i18n/index.js';

interface RouteBuilderProps {
  siteName: string;
  onSubmit: (route: string) => void;
  onCancel: () => void;
}

export const RouteBuilder: React.FC<RouteBuilderProps> = ({
  siteName,
  onSubmit,
  onCancel
}) => {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [currentInput, setCurrentInput] = useState<'prefix' | 'suffix'>(
    'prefix'
  );

  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (currentInput === 'prefix') {
      setCurrentInput('suffix');
      return;
    }

    // Build complete route, add dot before prefix and slash before suffix if not empty
    const prefixWithDot = prefix ? `${prefix}.` : '';
    const suffixWithDot = suffix ? `/${suffix}` : '';
    const route = `${prefixWithDot}${siteName}${suffixWithDot}`;
    onSubmit(route);
  };

  const handleCancel = () => {
    onCancel();
  };

  const currentPrompt =
    currentInput === 'prefix'
      ? t('route_builder_prefix_prompt')
          .d(`Enter route prefix for ${siteName} (e.g., abc, def):`)
          .replace('${siteName}', siteName)
      : t('route_builder_suffix_prompt')
          .d(`Enter route suffix for ${siteName} (e.g., *, users/*):`)
          .replace('${siteName}', siteName);

  const prefixWithDot = prefix ? `${prefix}.` : '';
  const suffixWithDot = suffix ? `/${suffix}` : '';
  const preview = `Preview: ${prefixWithDot}${siteName}${suffixWithDot}`;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>Building route for site: </Text>
        <Text color="cyan">{siteName}</Text>
      </Box>

      <Box marginTop={1}>
        <Text>{currentPrompt}</Text>
      </Box>

      <Box marginTop={1}>
        <TextInput
          value={currentInput === 'prefix' ? prefix : suffix}
          onChange={currentInput === 'prefix' ? setPrefix : setSuffix}
          onSubmit={handleSubmit}
        />
      </Box>

      {preview && (
        <Box marginTop={1}>
          <Text color="green">{preview}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          {t('route_builder_instructions').d(
            'Press Enter to continue, Ctrl+C to cancel'
          )}
        </Text>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
};

export const routeBuilder = async (
  siteName: string
): Promise<string | null> => {
  return new Promise((resolve) => {
    const { unmount } = render(
      <RouteBuilder
        siteName={siteName}
        onSubmit={(route) => {
          unmount();
          resolve(route);
        }}
        onCancel={() => {
          unmount();
          resolve(null);
        }}
      />
    );
  });
};
