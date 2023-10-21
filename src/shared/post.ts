export async function post(url: string, payload: any) {
    const res = await fetch(url, {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
            "Content-Type": "Application/json",
        },
    });

    if (!res.ok) {
        const json = await res.json();
        if (json.error) {
            throw new Error(json.error);
        } else {
            throw new Error("Request error");
        }
    }

    if (res.status < 200 && res.status > 300) {
        throw new Error(`Request responded with ${res.status}`);
    }
    return res.json();
}
