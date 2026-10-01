import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, X, Check, Loader2 } from 'lucide-react';
import { fileToCompressedBase64 } from '../../utils/imageUtils';
import { uploadImageToSupabaseStorage, isSupabaseConfigured } from '../../services/supabase';

interface ImageUploadInputProps {
  value?: string;
  onChange: (newValue: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  className?: string;
  previewHeight?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value = '',
  onChange,
  label,
  placeholder = 'https://... o sube desde tu equipo',
  helperText,
  className = '',
  previewHeight = 'h-32',
}) => {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      if (isSupabaseConfigured()) {
        const { url, error } = await uploadImageToSupabaseStorage(file, 'productos');
        if (url && !error) {
          onChange(url);
          return;
        }
      }
      const base64 = await fileToCompressedBase64(file);
      onChange(base64);
    } catch (err: any) {
      try {
        const base64 = await fileToCompressedBase64(file);
        onChange(base64);
      } catch (fallbackErr: any) {
        alert(fallbackErr.message || 'Error al procesar la imagen seleccionada');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block">
            {label}
          </label>
          <div className="flex items-center gap-1 text-[10px] font-semibold bg-stone-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-amber-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              📁 Subir Archivo
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                mode === 'url'
                  ? 'bg-white text-amber-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              🔗 Por URL
            </button>
          </div>
        </div>
      )}

      {/* Preview if exists */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 group">
          <div className={`w-full ${previewHeight} flex items-center justify-center overflow-hidden bg-stone-100/60`}>
            <img
              src={value}
              alt="Vista previa"
              className="max-h-full max-w-full object-contain p-2"
              onError={(e) => {
                // If broken url, show placeholder icon
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white text-stone-800 text-xs font-bold shadow-md hover:bg-stone-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-700" />
              <span>Cambiar imagen</span>
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 flex items-center gap-1.5 cursor-pointer"
              title="Eliminar imagen"
            >
              <X className="w-3.5 h-3.5" />
              <span>Quitar</span>
            </button>
          </div>
        </div>
      ) : (
        /* No image selected yet */
        <div>
          {mode === 'upload' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-amber-600 bg-amber-50/50'
                  : 'border-stone-300 hover:border-amber-700 hover:bg-amber-50/20 bg-stone-50/50'
              }`}
            >
              {isProcessing ? (
                <div className="py-3 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                  <span className="text-xs text-stone-600 font-medium">
                    Procesando y optimizando imagen...
                  </span>
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Toca para subir desde tu equipo
                    </span>
                    <span className="text-[11px] text-stone-500">
                      O arrastra una foto aquí (JPG, PNG, WebP)
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* If url mode and has value, allow quick url editing */}
      {mode === 'url' && value && (
        <div className="flex gap-2 mt-1">
          <input
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-stone-200 bg-stone-50 font-mono text-stone-600"
          />
        </div>
      )}

      {helperText && <p className="text-[10px] text-stone-400 mt-1">{helperText}</p>}
    </div>
  );
};
