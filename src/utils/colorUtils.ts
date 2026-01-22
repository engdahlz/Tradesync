/**
 * Converts HSL color values to Hex format for canvas compatibility.
 * Handles:
 * - "hsl(210, 50%, 50%)"
 * - "hsl(210 50% 50%)"
 * - "210 50% 50%" (raw CSS variable)
 * 
 * @param input - The HSL string or CSS variable value
 * @returns Hex color string (e.g., "#334455")
 */
export function hslToHex(input: string): string {
    // 1. Normalize input: remove "hsl(", ")", and commas
    let cleanInput = input
        .replace(/hsl\(/g, '')
        .replace(/\)/g, '')
        .replace(/,/g, ' ')
        .trim();

    // 2. Split into components
    // Handles multiple spaces
    const parts = cleanInput.split(/\s+/);
    
    if (parts.length < 3) {
        console.warn(`Invalid HSL input: ${input}, returning black`);
        return '#000000';
    }

    let h = parseFloat(parts[0]);
    let s = parseFloat(parts[1].replace('%', ''));
    let l = parseFloat(parts[2].replace('%', ''));

    // Normalize H (0-360)
    h = h % 360;
    if (h < 0) h += 360;

    // Normalize S and L (0-1)
    s = s / 100;
    l = l / 100;

    // 3. Convert to RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    // 4. Convert to Hex
    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
