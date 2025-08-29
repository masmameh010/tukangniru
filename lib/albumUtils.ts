/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Helper function to load an image and return it as an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
        img.src = src;
    });
}

/**
 * Creates a single grid image from a collection of scene images.
 * @param imageData A record mapping scene strings to their image data URLs.
 * @returns A promise that resolves to a data URL of the generated grid image (JPEG format).
 */
export async function createAlbumPage(imageData: Record<string, string>): Promise<string> {
    const canvas = document.createElement('canvas');
    const canvasWidth = 2400; // Wider for a grid layout
    const canvasHeight = 3600; // Taller for 3 rows
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get 2D canvas context');
    }

    // 1. Draw the background
    ctx.fillStyle = '#111111'; // A dark background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Load all the images concurrently
    const loadedImages = await Promise.all(
        Object.values(imageData).map(url => loadImage(url))
    );

    // 3. Define grid layout and draw each image
    const grid = { cols: 2, rows: 3, padding: 50 };
    const cellWidth = (canvasWidth - grid.padding * (grid.cols + 1)) / grid.cols;
    const cellHeight = (canvasHeight - grid.padding * (grid.rows + 1)) / grid.rows;

    loadedImages.forEach((img, index) => {
        const row = Math.floor(index / grid.cols);
        const col = index % grid.cols;

        const cellX = grid.padding * (col + 1) + cellWidth * col;
        const cellY = grid.padding * (row + 1) + cellHeight * row;
        
        // Calculate image dimensions to fit within the cell ("contain" logic)
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth = cellWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > cellHeight) {
            drawHeight = cellHeight;
            drawWidth = drawHeight * aspectRatio;
        }

        // Calculate position to center the image within its cell
        const drawX = cellX + (cellWidth - drawWidth) / 2;
        const drawY = cellY + (cellHeight - drawHeight) / 2;
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    });

    // Convert canvas to a high-quality JPEG and return the data URL
    return canvas.toDataURL('image/jpeg', 0.9);
}