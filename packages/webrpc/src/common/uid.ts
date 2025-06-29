export default function uid(template = '********') {
    return template.replace(/\*/g, () => {
        const chr = Math.floor(random() * 16).toString(16);
        if (random() >= 0.5) {
            return chr;
        } else {
            return chr.toUpperCase();
        }
    });
}
const u = new Uint32Array(1);
function random() {
    if (typeof crypto === 'undefined') {
        return Math.random();
    }
    const value = crypto.getRandomValues(u)[0];
    if (typeof value === 'undefined') {
        return Math.random();
    }
    return value / 0xffffffff;
}
