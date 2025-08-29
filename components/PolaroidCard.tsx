/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    imageUrl?: string | null;
    caption: string;
    status: ImageStatus;
    error?: string;
    onRetry?: (caption: string) => void;
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
            <p className="mt-4 font-kalam text-neutral-400 animate-pulse">{message}</p>
        </div>
    );
};

const ErrorState = ({ error, onRetry, caption }: { error?: string; onRetry?: (caption: string) => void; caption: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm text-neutral-400 max-w-full break-words px-2">
            {error || "Gagal membuat gambar."}
        </p>
        {onRetry && (
            <button
                onClick={() => onRetry(caption)}
                className="mt-4 bg-orange-600 text-white font-kalam text-lg py-1 px-4 rounded-sm hover:bg-orange-500 transition-colors flex items-center gap-2"
                aria-label={`Ulangi pembuatan untuk ${caption}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20l-1.5-1.5A9 9 0 003.5 9" />
                </svg>
                Ulangi
            </button>
        )}
    </div>
);


const PolaroidCard = ({ imageUrl, caption, status, error, onRetry, onDownload, isMobile }: PolaroidCardProps) => {
    const hasResult = status === 'done' && imageUrl;
    
    // The "shake" animation is now just a visual cue on mobile for completed images
    const canShake = isMobile && hasResult && onRetry;

    return (
        <div className={cn(
            "w-80 h-[26rem] rounded-md p-4 bg-neutral-100 shadow-lg flex flex-col items-center gap-3 transform-gpu transition-transform",
            canShake ? "active:scale-95 active:rotate-[-2deg]" : "",
            status === 'error' ? 'animate-pulse' : ''
        )}
        >
            <div className="w-full h-[75%] bg-neutral-900 border-4 border-neutral-800 flex items-center justify-center overflow-hidden">
                {!imageUrl && status === 'done' && !error && (
                    <div className="flex items-center justify-center h-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                {status === 'pending' && <LoadingSpinner />}
                {status === 'error' && <ErrorState error={error} onRetry={onRetry} caption={caption} />}
                {hasResult && <img src={imageUrl} alt={caption} className="w-full h-full object-cover" />}
            </div>
            
            <div className="w-full flex items-center justify-between gap-2 px-1">
                <p className={cn(
                    "font-kalam text-xl text-center truncate flex-1",
                    status === 'pending' && 'text-neutral-500',
                    status === 'error' && 'text-red-400',
                    'text-neutral-800'
                )}>
                    {caption}
                </p>
                {hasResult && onDownload && (
                     <button onClick={() => onDownload(caption)} className="text-neutral-500 hover:text-black transition-colors" aria-label={`Unduh gambar ${caption}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default PolaroidCard;