/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-3 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center gap-4 px-4">
                {/* Left Side */}
                <div className="hidden md:flex items-center gap-4 text-neutral-500 whitespace-nowrap">
                    <p>Didukung oleh Gemini 2.5 Flash Image Preview</p>
                    <span className="text-neutral-700" aria-hidden="true">|</span>
                    <p>
                        Dimodifikasi oleh{' '}
                        <a
                            href="https://www.instagram.com/TukangNiru/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-orange-400 transition-colors duration-200"
                        >
                            @TukangNiru
                        </a>
                    </p>
                </div>

                {/* Right Side */}
                <div className="flex-grow flex justify-end items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <a
                            href="https://aistudio.google.com/apps"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-kalam text-sm sm:text-base text-center text-white bg-orange-600 py-2 px-4 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-orange-500 shadow-[1px_1px_0px_1px_rgba(0,0,0,0.2)] whitespace-nowrap"
                        >
                            Aplikasi di AI Studio
                        </a>
                        <a
                            href="https://lynk.id/imajinasilokal1/s/12o34vm546ld"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-kalam text-sm sm:text-base text-center text-black bg-orange-500 py-2 px-4 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-orange-400 shadow-[1px_1px_0px_1px_rgba(0,0,0,0.2)] whitespace-nowrap"
                        >
                            Dukung Kreator ☕
                        </a>
                        <a
                            href="https://gemini.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-kalam text-sm sm:text-base text-center text-white bg-white/10 backdrop-blur-sm border border-white/50 py-2 px-4 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black whitespace-nowrap"
                        >
                            Ngobrol dengan Gemini
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;