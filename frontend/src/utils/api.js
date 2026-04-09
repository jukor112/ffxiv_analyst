export async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
    }
    return res.json();
}
