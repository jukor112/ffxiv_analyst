export async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
    }
    return res.json();
}

/**
 * Stream analysis results via SSE.
 * Calls onProgress(pct, msg) for each progress event.
 * Resolves with the final result object on completion.
 */
export function analyzeStream(params, onProgress) {
    return new Promise((resolve, reject) => {
        const url = `/api/analyze/stream?${params}`;
        const es = new EventSource(url);

        // Kill the stream if no message arrives within 200 s (server timeout is 180 s)
        let watchdog = setTimeout(() => {
            es.close();
            reject(new Error("Analysis timed out — Universalis may be slow, try again"));
        }, 200_000);

        const done = (fn) => {
            clearTimeout(watchdog);
            fn();
        };

        es.onmessage = (e) => {
            // Reset watchdog on every message so progress keeps it alive
            clearTimeout(watchdog);
            watchdog = setTimeout(() => {
                es.close();
                reject(new Error("Analysis timed out — Universalis may be slow, try again"));
            }, 200_000);

            let event;
            try {
                event = JSON.parse(e.data);
            } catch {
                return;
            }
            if (event.type === "progress") {
                onProgress(event.pct, event.msg);
            } else if (event.type === "done") {
                done(() => {
                    es.close();
                    resolve(event.data);
                });
            } else if (event.type === "error") {
                done(() => {
                    es.close();
                    reject(new Error(event.msg));
                });
            }
        };

        es.onerror = () => {
            done(() => {
                es.close();
                reject(new Error("Stream connection error"));
            });
        };
    });
}
