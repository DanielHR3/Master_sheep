import React, { useState, useCallback } from 'react';
import { Camera, Image as ImageIcon, Link as LinkIcon, UploadCloud, X } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (val: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 800; // max dimension 800px
        
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height *= maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width *= maxSize / height));
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // compress image
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        onChange(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      onChange(urlInput);
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  if (value) {
    return (
      <div className="relative w-full h-40 bg-slate-900 border border-white/10 rounded-xl overflow-hidden group">
        <img src={value} alt="Preview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            type="button" 
            onClick={() => onChange('')}
            className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full border-2 border-dashed rounded-xl p-4 transition-all ${
        isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {!showUrlInput ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <label className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors p-2 cursor-pointer">
              <UploadCloud size={24} />
              <span className="text-[10px] uppercase font-bold">Subir Archivo</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => { if (e.target.files?.length) processFile(e.target.files[0]); }} 
              />
            </label>
            <div className="w-px h-8 bg-slate-700"></div>
            <label className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors p-2 cursor-pointer">
              <Camera size={24} />
              <span className="text-[10px] uppercase font-bold">Tomar Foto</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={(e) => { if (e.target.files?.length) processFile(e.target.files[0]); }} 
              />
            </label>
            <div className="w-px h-8 bg-slate-700"></div>
            <button type="button" onClick={() => setShowUrlInput(true)} className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors p-2">
              <LinkIcon size={24} />
              <span className="text-[10px] uppercase font-bold">Usar URL</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            O arrastra una imagen aquí (JPG, PNG)
          </p>
        </div>
      ) : (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input 
            type="url" 
            placeholder="Pega la URL de la imagen aquí..." 
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            autoFocus
          />
          <button type="button" onClick={() => setShowUrlInput(false)} className="p-2 text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500">
            Usar
          </button>
        </form>
      )}
    </div>
  );
};

export default ImageUpload;
