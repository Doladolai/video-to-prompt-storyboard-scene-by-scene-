/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Video, 
  FileJson, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  LayoutDashboard,
  RefreshCw,
  Copy,
  ChevronRight,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Character {
  id: string;
  name: string;
  description: string;
  visualTraits: string[];
}

interface Scene {
  sceneNumber: number;
  timestamp: string;
  description: string;
  visualPrompt: string;
  charactersPresent: string[];
  cameraAngle: string;
  lighting: string;
}

interface StoryboardData {
  title: string;
  summary: string;
  characters: Character[];
  scenes: Scene[];
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryboardData | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
        setError(null);
        setResult(null);
      } else {
        setError('Please upload a valid video file.');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processVideo = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is missing.");

      const genAI = new GoogleGenAI({ apiKey });
      const base64Video = await fileToBase64(videoFile);

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: videoFile.type,
                  data: base64Video,
                },
              },
              {
                text: `Analyze this video and generate a detailed storyboard for a creative project. 
                Focus on character consistency. Identify each unique character and describe their visual traits clearly.
                
                Return the result in JSON format with the following structure:
                {
                  "title": "A catchy title for the story",
                  "summary": "A brief summary of the video content",
                  "characters": [
                    {
                      "id": "unique_id",
                      "name": "Character Name or Descriptor",
                      "description": "Detailed visual description for consistency",
                      "visualTraits": ["trait1", "trait2"]
                    }
                  ],
                  "scenes": [
                    {
                      "sceneNumber": 1,
                      "timestamp": "00:00",
                      "description": "What is happening in the scene",
                      "visualPrompt": "A detailed prompt for an image generator to recreate this scene, referencing character IDs for consistency",
                      "charactersPresent": ["character_id1"],
                      "cameraAngle": "e.g., Close-up, Wide shot",
                      "lighting": "e.g., Cinematic, Harsh sunlight"
                    }
                  ]
                }
                
                Ensure the visualPrompt is descriptive enough for high-quality image generation (like Midjourney or Stable Diffusion).`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    visualTraits: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "name", "description", "visualTraits"]
                }
              },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    timestamp: { type: Type.STRING },
                    description: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING },
                    charactersPresent: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cameraAngle: { type: Type.STRING },
                    lighting: { type: Type.STRING }
                  },
                  required: ["sceneNumber", "timestamp", "description", "visualPrompt", "charactersPresent", "cameraAngle", "lighting"]
                }
              }
            },
            required: ["title", "summary", "characters", "scenes"]
          }
        },
      });

      const text = response.text;
      if (text) {
        const parsedData = JSON.parse(text) as StoryboardData;
        setResult(parsedData);
        setRawResponse(text);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Video size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Video2Storyboard AI</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-black/60">
            <a href="#" className="hover:text-emerald-600 transition-colors">How it works</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Examples</a>
            <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition-all">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Left Column: Input & Preview */}
          <div className="lg:col-span-5 space-y-8">
            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Transform Video to Storyboard</h2>
                <p className="text-black/60 leading-relaxed">
                  Upload a video and let our AI analyze scenes, characters, and visual styles to generate a consistent storyboard prompt set.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 transition-all duration-300",
                  videoFile ? "border-emerald-500 bg-emerald-50/30" : "border-black/10 hover:border-emerald-400 hover:bg-emerald-50/10"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/*"
                  className="hidden"
                />
                
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  {videoFile ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-900">{videoFile.name}</p>
                        <p className="text-sm text-emerald-600/70">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-black/5 text-black/40 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="font-semibold">Click to upload or drag and drop</p>
                        <p className="text-sm text-black/40">MP4, MOV, AVI up to 50MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {videoPreview && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl overflow-hidden shadow-2xl shadow-black/10 aspect-video bg-black relative group"
                >
                  <video 
                    src={videoPreview} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              )}

              <button
                disabled={!videoFile || isProcessing}
                onClick={processVideo}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                  !videoFile || isProcessing 
                    ? "bg-black/5 text-black/20 cursor-not-allowed" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-[0.98]"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Analyzing Video...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Generate Storyboard
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Summary Card */}
                  <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Analysis Complete</span>
                        <h3 className="text-2xl font-bold">{result.title}</h3>
                      </div>
                      <button 
                        onClick={() => rawResponse && copyToClipboard(rawResponse)}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/40 hover:text-black"
                        title="Copy JSON"
                      >
                        <FileJson size={20} />
                      </button>
                    </div>
                    <p className="text-black/60 leading-relaxed italic">
                      "{result.summary}"
                    </p>
                  </div>

                  {/* Characters Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <User size={18} className="text-emerald-600" />
                      <h4 className="font-bold uppercase tracking-wider text-xs">Character Profiles</h4>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {result.characters.map((char) => (
                        <div key={char.id} className="bg-white border border-black/5 rounded-2xl p-5 hover:border-emerald-200 transition-colors group">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs">
                              {char.name[0]}
                            </div>
                            <h5 className="font-bold">{char.name}</h5>
                          </div>
                          <p className="text-sm text-black/60 mb-4 line-clamp-3">{char.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {char.visualTraits.map((trait, i) => (
                              <span key={i} className="text-[10px] bg-black/5 px-2 py-1 rounded-md font-medium text-black/50">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scenes Timeline */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 px-2">
                      <LayoutDashboard size={18} className="text-emerald-600" />
                      <h4 className="font-bold uppercase tracking-wider text-xs">Scene Breakdown</h4>
                    </div>
                    
                    <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-black/5">
                      {result.scenes.map((scene, idx) => (
                        <div key={idx} className="relative pl-12 group">
                          {/* Timeline Dot */}
                          <div className="absolute left-0 top-2 w-8 h-8 bg-white border-2 border-black/10 rounded-full flex items-center justify-center z-10 group-hover:border-emerald-500 transition-colors">
                            <span className="text-[10px] font-bold">{scene.sceneNumber}</span>
                          </div>

                          <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono bg-black text-white px-2 py-1 rounded">
                                    {scene.timestamp}
                                  </span>
                                  <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
                                    {scene.cameraAngle} • {scene.lighting}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(scene.visualPrompt)}
                                  className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                                >
                                  <Copy size={14} />
                                  Copy Prompt
                                </button>
                              </div>

                              <div className="space-y-2">
                                <p className="font-medium text-black/80">{scene.description}</p>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                  <p className="text-xs font-mono text-slate-500 leading-relaxed">
                                    {scene.visualPrompt}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-black/30 uppercase">Characters:</span>
                                {scene.charactersPresent.map((charId) => {
                                  const char = result.characters.find(c => c.id === charId);
                                  return (
                                    <span key={charId} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                      {char?.name || charId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-black/5 rounded-[40px] bg-black/[0.02]">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-black/10 mb-6">
                    <LayoutDashboard size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Storyboard Generated</h3>
                  <p className="text-black/40 max-w-xs">
                    Upload a video and click "Generate Storyboard" to see the AI analysis here.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12 bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
              <Video size={16} />
            </div>
            <span className="font-bold tracking-tight">Video2Storyboard AI</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-black/40">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">API</a>
            <a href="#" className="hover:text-black transition-colors">Contact</a>
          </div>
          <p className="text-sm text-black/30">
            © 2026 Video2Storyboard AI. Powered by Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
