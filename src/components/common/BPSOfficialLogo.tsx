import React from 'react';

interface BPSOfficialLogoProps {
  variant?: 'banner' | 'header' | 'compact' | 'print' | 'crest-only' | 'hero';
  className?: string;
  showSubtitle?: boolean;
}

// User requested complete removal of the school logo from the whole site
export const BPSOfficialLogo: React.FC<BPSOfficialLogoProps> = () => {
  return null;
};
