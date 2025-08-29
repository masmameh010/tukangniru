/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    imageUrl?: string;
    caption: string;
    status: ImageStatus;
    error?: string;
    onShake?: (caption: string) => void;
    onDownload?: (caption: string) => void;
    isMobile?: boolean;
}

const LOADING_MESSAGES = [
    "Piksel-piksel sedang menari...",
    "Meramu palet warna impian...",
    "Menenun gaya di kanvas digital...",
    "Mencari pencahayaan sempurna...",
    "Berbisik dengan muse virtual...",
    "Setiap piksel adalah sebuah cerita...",
    "Sebentar lagi, mahakarya tercipta...",
];

const LoadingSpinner = () => {
    const [message, setMessage] = useState(LOADING_MESSAGES[0]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(prevMessage => {
                let newMessage;
                do {
                    newMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
                } while (newMessage === prevMessage);
                return newMessage;
            });
        }, 2500);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <svg className="animate-spin h-8 w-8 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-neutral-500 text-sm mt-4 font-kalam">{message}</p>
        </div>
    );
};

const ErrorDisplay = () => (
    <div className="flex items-center justify-center h-full">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </div>
);

const Placeholder = ({ caption }: { caption: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-kalam text-2xl text-center">{caption}</span>
    </div>
);


const PolaroidCard: React.FC<PolaroidCardProps> = ({ imageUrl, caption, status, error, onShake, onDownload, isMobile }) => {
    const [isDeveloped, setIsDeveloped] = useState(false);

    useEffect(() => {
        if (imageUrl) {
            setIsDeveloped(false); // Reset animation for new images
            const timer = setTimeout(() => {
                setIsDeveloped(true);
            }, 100); // Short delay to allow render before animating
            return () => clearTimeout(timer);
        } else {
            setIsDeveloped(false); // Reset if image is removed
        }
    }, [imageUrl]);


    return (
        <div className="bg-neutral-100 p-4 pb-16 flex flex-col items-center justify-start aspect-[3/4] w-80 max-w-full rounded-md shadow-lg relative">
            <div className="w-full bg-neutral-900 shadow-inner flex-grow relative overflow-hidden group">
                {status === 'pending' && <LoadingSpinner />}
                {status === 'error' && <ErrorDisplay />}
                {status === 'done' && imageUrl && (
                    <>
                        <div className={cn(
                            "absolute top-2 right-2 z-20 flex flex-col gap-2 transition-opacity duration-300",
                            !isMobile && "opacity-0 group-hover:opacity-100",
                        )}>
                            {onDownload && (
                                <button
                                    onClick={() => onDownload(caption)}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Unduh gambar untuk ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}
                             {onShake && (
                                <button
                                    onClick={() => onShake(caption)}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Buat ulang gambar untuk ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div
                            className={`absolute inset-0 z-10 bg-[#3a322c] transition-opacity duration-[3500ms] ease-out ${
                                isDeveloped ? 'opacity-0' : 'opacity-100'
                            }`}
                            aria-hidden="true"
                        />
                        
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={caption}
                            className={`w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${
                                isDeveloped 
                                ? 'opacity-100 filter-none' 
                                : 'opacity-80 filter sepia(1) contrast(0.8) brightness(0.8)'
                            }`}
                        />
                    </>
                )}
                {status === 'done' && !imageUrl && <Placeholder caption={caption} />}
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-center px-2">
                <p className={cn(
                    "font-kalam text-xl truncate",
                    status === 'done' && imageUrl ? 'text-black' : 'text-neutral-800'
                )}>
                    {caption}
                </p>
            </div>
        </div>
    );
};

export default PolaroidCard;