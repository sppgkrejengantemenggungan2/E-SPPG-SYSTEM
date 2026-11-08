/**
 * Utility for automatic image compression and official SPPG watermark burning.
 * Ensures storage optimization while maintaining crisp audit evidence.
 * Stamp format: SPPG HAFSHAWATY 2 • [DD-MM-YYYY HH:mm WIB] • [SUB MENU]
 */

export interface WatermarkOptions {
  subModuleTag: string;
  customDate?: string;
  institutionName?: string;
}

export async function compressAndWatermarkImage(
  fileOrUrl: File | Blob | string,
  options: WatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleImageLoad = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // 1. Calculate dimensions (Max 1280px on long edge)
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw original scaled image
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Prepare Watermark Text
        const now = new Date();
        const dateStr = options.customDate || now.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '-');
        const timeStr = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const instName = options.institutionName || 'SPPG HAFSHAWATY 2';
        const watermarkText = `${instName} • ${dateStr} ${timeStr} WIB • ${options.subModuleTag.toUpperCase()}`;
        const subText = 'E-SPPG MANAGEMENT SYSTEM • BADAN GIZI NASIONAL (BGN RI) • AUDIT QUALITY CONTROL';

        // 3. Draw Watermark Bar at bottom
        const barHeight = Math.max(54, Math.round(height * 0.08));
        const barY = height - barHeight;

        // Gradient dark background for high contrast
        const gradient = ctx.createLinearGradient(0, barY, width, height);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
        gradient.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, barY, width, barHeight);

        // Top accent line (amber/emerald for official seal feel)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, barY, width, 3);

        // Red Security Badge
        const badgeY = barY + Math.round(barHeight * 0.22);
        const badgeHeight = Math.round(barHeight * 0.56);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        const radius = 4;
        const badgeX = 14;
        const badgeWidth = 62;
        ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius) : ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.round(barHeight * 0.26))}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VERIFIED', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

        // Main Watermark Text
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, Math.round(barHeight * 0.30))}px Arial, sans-serif`;
        const textX = badgeX + badgeWidth + 14;
        ctx.fillText(watermarkText, textX, barY + Math.round(barHeight * 0.38));

        // Subtitle Text
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${Math.max(9, Math.round(barHeight * 0.20))}px Arial, sans-serif`;
        ctx.fillText(subText, textX, barY + Math.round(barHeight * 0.76));

        // 4. Export as compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      reject(new Error('Failed to load image for watermarking'));
    };

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('FileReader empty'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrUrl);
    }
  });
}
