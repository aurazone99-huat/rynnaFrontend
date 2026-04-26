
import React, { useState } from 'react';
import { GenreType, GalleryItem } from '../types';

const ITEMS: GalleryItem[] = [
  { id: '1', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767245853/houshou_marine_co1xsb.jpg', genre: 'VTuber', title: 'Houshou Marine' },
  { id: '2', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767247024/camellya_jrddpc.jpg', genre: 'Wuthering Waves', title: 'Camellya' },
  { id: '3', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767247030/Inori_Yuzuriha_znwjlu.jpg', genre: 'Anime', title: 'Inori Yuzuriha' },
  { id: '4', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767247378/Evernight_furmhq.jpg', genre: 'Honkai: Star Rail', title: 'Evernight' },
  { id: '5', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767247478/The_Herta_dfnevv.jpg', genre: 'Honkai: Star Rail', title: 'The Herta' },
  { id: '6', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767247915/Dorothy_di8pko.jpg', genre: 'Goddess of Victory: Nikke', title: 'Dorothy' },
  { id: '7', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767248086/Unkind_Maid_qixvxo.jpg', genre: 'Goddess of Victory: Nikke', title: 'Privaty: Unkind Maid' },
  { id: '8', url: 'https://res.cloudinary.com/dityornjc/image/upload/v1767248310/DiaoChan_rnooq0.jpg', genre: 'Honor of Kings', title: 'DiaoChan' },
];

const GallerySection: React.FC = () => {
  const [filter, setFilter] = useState<GenreType>('All');

  const filteredItems = filter === 'All' 
    ? ITEMS 
    : ITEMS.filter(item => item.genre === filter);

  const genres: GenreType[] = ['All', 'Anime', 'Wuthering Waves', 'Honkai: Star Rail', 'Goddess of Victory: Nikke', 'Honor of Kings', 'VTuber'];

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-4 mb-12 justify-center">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setFilter(genre)}
            className={`px-8 py-3 text-xs font-black uppercase tracking-widest transition-all clay-button outline-none ${
              filter === genre 
                ? 'bg-purple-100 text-purple-600 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.05)]' 
                : 'bg-white text-purple-400'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Grid: Updated to grid-cols-2 for mobile */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            className="group relative aspect-[3/4] clay-puffy-sm p-3 bg-white cursor-pointer transition-transform duration-500 hover:scale-[1.02]"
          >
            <div className="w-full h-full rounded-[20px] overflow-hidden relative">
              <img 
                src={item.url} 
                alt={item.title}
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4 md:p-6">
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest mb-1">{item.genre}</span>
                <h3 className="text-white text-sm md:text-lg font-black leading-tight">{item.title}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GallerySection;
