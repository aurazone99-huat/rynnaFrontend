
import React from 'react';

export type GenreType = 'All' | 'Anime' | 'Wuthering Waves' | 'Honkai: Star Rail' | 'Goddess of Victory: Nikke' | 'Honor of Kings' | 'VTuber';

export interface GalleryItem {
  id: string;
  url: string;
  genre: GenreType;
  title: string;
}

export interface SocialLink {
  name: string;
  // Fix: Added React import to resolve missing 'React' namespace
  icon: React.ReactNode;
  url: string;
  color: string;
}