/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateSceneImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';

const DAILY_LIFE_SCENES = [
    // Daily & Urban
    'di dalam kamar tidur yang nyaman dengan cahaya pagi',
    'bekerja di meja kantor yang modern dan rapi',
    'duduk santai di sofa ruang keluarga yang hangat',
    'memasak di dapur yang terang dan bersih',
    'membaca buku di kafe favorit yang tenang',
    'berjalan-jalan di taman kota saat sore hari',
    'berdiri di balkon apartemen dengan pemandangan kota',
    'belajar di perpustakaan universitas yang megah',
    'bersantai di atas kasur dengan selimut tebal',
    'menikmati kopi di teras rumah',
    'di dalam mobil saat perjalanan',
    'berbelanja di supermarket yang ramai',
    'di jalanan kota Tokyo saat malam hari dengan lampu neon',
    'di atap gedung pencakar langit saat senja',
    'menunggu kereta di stasiun bawah tanah yang ramai',
    'di dalam sebuah galeri seni modern',
    
    // Nature & Travel
    'di tengah hutan pinus yang berkabut',
    'di tepi pantai dengan pasir putih dan air jernih',
    'mendaki gunung dengan pemandangan lembah di bawahnya',
    'di bawah air terjun yang deras',
    'berkemah di bawah langit malam penuh bintang',
    'duduk di tepi danau yang tenang saat matahari terbenam',
    'di sebuah desa tradisional di pedalaman Bali',
    'menjelajahi pasar malam yang ramai di Bangkok',

    // Fantasy & Sci-Fi
    'di sebuah kastil melayang di angkasa',
    'menunggang naga di atas pegunungan vulkanik',
    'di taman ajaib dengan bunga-bunga yang bercahaya',
    'berdiri di depan gerbang kota elf yang megah',
    'di dalam kokpit pesawat ruang angkasa',
    'berjalan di kota futuristik dengan mobil terbang',
    'di stasiun luar angkasa yang menghadap ke planet Bumi',
    'menemukan reruntuhan kuno di planet Mars',

    // Historical & Action
    'di pasar rempah-rempah era kolonial',
    'di sebuah pesta dansa bangsawan abad ke-18',
    'menjadi ksatria di depan sebuah benteng kuno',
    'sebagai mata-mata di era perang dingin',
    'balapan mobil sport di sirkuit Monaco',
    'melompat dari satu gedung ke gedung lain seperti parkour',
];


const GHOST_POLAROIDS_CONFIG = [
  { initial: { x: "-150%", y: "0%", rotate: -30 }, transition: { delay: 0.2 } },
  { initial: { x: "150%", y: "0%", rotate: 25 }, transition: { delay: 0.4 } },
];


type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "font-kalam text-xl text-center text-white bg-orange-600 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-orange-500 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-kalam text-xl text-center text-orange-300 bg-transparent border-2 border-orange-500/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-orange-500 hover:text-black";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

function App() {
    const [personImage, setPersonImage] = useState<string | null>(null);
    const [clothingImage, setClothingImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const [customScenes, setCustomScenes] = useState<string[]>(['']);
    const [scenesToGenerate, setScenesToGenerate] = useState<string[]>([]);
    const isMobile = useMediaQuery('(max-width: 768px)');


    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, imageType: 'person' | 'clothing') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (imageType === 'person') {
                    setPersonImage(result);
                } else {
                    setClothingImage(result);
                }
                setGeneratedImages({}); // Clear previous results
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if(personImage && clothingImage) {
            setAppState('image-uploaded');
        }
    }, [personImage, clothingImage]);

    const handleGenerateClick = async () => {
        if (!personImage || !clothingImage) return;

        // --- DYNAMIC SCENE LOGIC ---
        const shuffleArray = (array: string[]) => {
            const newArr = [...array];
            for (let i = newArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
            }
            return newArr;
        };

        const userScenes = customScenes.map(s => s.trim()).filter(Boolean);
        const finalScenes: string[] = [...new Set(userScenes)]; // Use Set to remove duplicate user inputs
        
        const remainingScenesPool = DAILY_LIFE_SCENES.filter(scene => !finalScenes.includes(scene));

        const shuffledPool = shuffleArray(remainingScenesPool);
        const scenesNeeded = 6 - finalScenes.length;
        
        if (scenesNeeded > 0) {
            finalScenes.push(...shuffledPool.slice(0, scenesNeeded));
        }
        
        setScenesToGenerate(finalScenes);
        // --- END LOGIC ---

        setIsLoading(true);
        setAppState('generating');
        
        const initialImages: Record<string, GeneratedImage> = {};
        finalScenes.forEach(scene => {
            initialImages[scene] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        const concurrencyLimit = 2; // Process two scenes at a time
        const scenesQueue = [...finalScenes];

        const processScene = async (scene: string) => {
            try {
                const resultUrl = await generateSceneImage(personImage, clothingImage, scene);
                setGeneratedImages(prev => ({
                    ...prev,
                    [scene]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [scene]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate image for ${scene}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (scenesQueue.length > 0) {
                const scene = scenesQueue.shift();
                if (scene) {
                    await processScene(scene);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateScene = async (scene: string) => {
        if (!personImage || !clothingImage) return;

        if (generatedImages[scene]?.status === 'pending') {
            return;
        }
        
        console.log(`Regenerating image for ${scene}...`);

        setGeneratedImages(prev => ({
            ...prev,
            [scene]: { status: 'pending' },
        }));

        try {
            const resultUrl = await generateSceneImage(personImage, clothingImage, scene);
            setGeneratedImages(prev => ({
                ...prev,
                [scene]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({
                ...prev,
                [scene]: { status: 'error', error: errorMessage },
            }));
            console.error(`Failed to regenerate image for ${scene}:`, err);
        }
    };
    
    const handleReset = () => {
        setPersonImage(null);
        setClothingImage(null);
        setGeneratedImages({});
        setAppState('idle');
        setCustomScenes(['']);
        setScenesToGenerate([]);
    };

    const handleDownloadIndividualImage = (scene: string) => {
        const image = generatedImages[scene];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `imajinasilokal-${scene.replace(/\s+/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [scene, image]) => {
                    acc[scene] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length === 0) {
                alert("Tidak ada gambar yang berhasil dibuat untuk diunduh. Coba lagi nanti atau buat ulang gambar yang gagal.");
                setIsDownloading(false);
                return;
            }
            
            if (Object.keys(imageData).length < scenesToGenerate.length) {
                console.warn("Album diunduh dengan gambar parsial karena tidak semua adegan berhasil dibuat.");
            }


            const albumDataUrl = await createAlbumPage(imageData);

            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'imajinasilokal-album.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Gagal membuat atau mengunduh album:", error);
            alert("Maaf, terjadi kesalahan saat membuat album Anda. Silakan coba lagi.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCustomSceneChange = (index: number, value: string) => {
        const newScenes = [...customScenes];
        newScenes[index] = value;
        setCustomScenes(newScenes);
    };

    const addCustomScene = () => {
        if (customScenes.length < 3) {
            setCustomScenes(prev => [...prev, '']);
        }
    };

    const removeCustomScene = (index: number) => {
        if (customScenes.length > 1) {
            setCustomScenes(prev => prev.filter((_, i) => i !== index));
        }
    };

    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div aria-hidden="true" className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/20 to-transparent z-0"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-8xl font-bebas font-bold text-neutral-100 tracking-wider">IMAJINASILOKAL</h1>
                    <p className="font-kalam text-neutral-300 mt-2 text-2xl tracking-wide">Imajinasikan Gayamu Disini</p>
                </div>

                {appState === 'idle' && (
                     <div className="relative flex flex-col items-center justify-center w-full">
                        {GHOST_POLAROIDS_CONFIG.map((config, index) => (
                             <motion.div
                                key={index}
                                className="absolute w-80 h-[26rem] rounded-md p-4 bg-neutral-100/10 blur-sm"
                                initial={config.initial}
                                animate={{ x: "0%", y: "0%", rotate: (Math.random() - 0.5) * 20, scale: 0, opacity: 0 }}
                                transition={{ ...config.transition, ease: "circOut", duration: 2 }}
                            />
                        ))}
                        <motion.div
                             initial={{ opacity: 0, scale: 0.8 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: 1, duration: 0.8, type: 'spring' }}
                             className="flex flex-col md:flex-row items-center gap-8"
                        >
                            <div className="flex flex-col items-center">
                                <label htmlFor="person-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                    <PolaroidCard 
                                        caption="PILIH FOTOMU"
                                        status="done"
                                        imageUrl={personImage}
                                    />
                                </label>
                                <input id="person-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageUpload(e, 'person')} />
                            </div>
                             <div className="flex flex-col items-center">
                                <label htmlFor="clothing-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                    <PolaroidCard 
                                        caption="PILIH REFERENSI"
                                        status="done"
                                        imageUrl={clothingImage}
                                    />
                                </label>
                                <input id="clothing-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageUpload(e, 'clothing')} />
                            </div>
                        </motion.div>
                         <p className="mt-8 font-kalam text-neutral-500 text-center max-w-xs text-xl">
                            Pilih fotomu dan gambar referensi untuk memulai petualangan gaya.
                        </p>
                    </div>
                )}

                {appState === 'image-uploaded' && personImage && clothingImage && (
                    <motion.div 
                        className="flex flex-col items-center gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                         <div className="flex flex-col md:flex-row items-center gap-8">
                             <PolaroidCard 
                                imageUrl={personImage} 
                                caption="Model Pilihan" 
                                status="done"
                             />
                             <PolaroidCard 
                                imageUrl={clothingImage} 
                                caption="Referensi Pilihan" 
                                status="done"
                             />
                         </div>

                         <div className="w-full max-w-lg mt-4 flex flex-col items-center gap-4 text-center">
                            <label className="font-kalam text-2xl text-neutral-300">
                                Tuliskan imajinasimu di sini... (hingga 3)
                            </label>
                            <div className="w-full flex flex-col gap-3">
                                {customScenes.map((scene, index) => (
                                    <div key={index} className="relative w-full flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={scene}
                                            onChange={(e) => handleCustomSceneChange(index, e.target.value)}
                                            placeholder={`misal: di puncak gunung (${index + 1})`}
                                            className="w-full bg-neutral-900 border-2 border-neutral-700 rounded-sm py-3 px-4 pr-10 text-neutral-100 font-sans focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        />
                                        {customScenes.length > 1 && (
                                            <button 
                                                onClick={() => removeCustomScene(index)} 
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                                                aria-label={`Hapus latar ${index + 1}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {customScenes.length < 3 && (
                                <button onClick={addCustomScene} className="font-kalam text-orange-400 hover:text-orange-300 transition-colors text-lg mt-1">
                                    + Tambah Latar Lain
                                </button>
                            )}

                             <p className="font-sans text-xs text-neutral-500 mt-2">
                                Latar yang kosong atau tidak diisi akan dipilihkan secara acak.
                            </p>
                         </div>
                         
                         <div className="flex items-center gap-4 mt-4">
                            <button onClick={handleReset} className={secondaryButtonClasses}>
                                Coba Lagi
                            </button>
                            <button onClick={handleGenerateClick} className={primaryButtonClasses}>
                                Mulai Berimajinasi!
                            </button>
                         </div>
                    </motion.div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && (
                     <div className="w-full max-w-6xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
                            {scenesToGenerate.map((scene, index) => (
                                <motion.div
                                    key={scene}
                                    className="flex justify-center"
                                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.1 }}
                                >
                                     <PolaroidCard
                                        caption={scene}
                                        status={generatedImages[scene]?.status || 'pending'}
                                        imageUrl={generatedImages[scene]?.url}
                                        error={generatedImages[scene]?.error}
                                        onRetry={handleRegenerateScene}
                                        onDownload={handleDownloadIndividualImage}
                                        isMobile={isMobile}
                                    />
                                </motion.div>
                            ))}
                        </div>
                         <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button 
                                        onClick={handleDownloadAlbum} 
                                        disabled={isDownloading} 
                                        className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isDownloading ? 'Menyusun Album...' : 'Simpan Album'}
                                    </button>
                                    <button onClick={handleReset} className={secondaryButtonClasses}>
                                        Coba Lagi
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </main>
    );
}

export default App;