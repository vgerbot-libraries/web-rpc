export default function uid(template = '********') {
    return template.replace(/\*/g, () => {
        const character = Math.floor(random() * 16).toString(16);
        if (random() >= 0.5) {
            return character;
        } else {
            return character.toUpperCase();
        }
    });
}
const cryptoArray = new Uint32Array(1);
function random() {
    if (typeof crypto === 'undefined') {
        return Math.random();
    }
    const value = crypto.getRandomValues(cryptoArray)[0];
    if (typeof value === 'undefined') {
        return Math.random();
    }
    return value / 0xffffffff;
}
