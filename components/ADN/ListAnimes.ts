import type { ADNSearchFetch } from "./Types";

export async function searchADN(q: string) {
    const { data, error } = await useFetch<ADNSearchFetch>(
        `https://gw.api.animationdigitalnetwork.fr/show/catalog`,
        {
            method: "GET",
            headers: {
                "x-target-distribution": "de",
            },
            query: {
                "maxAgeCategory": "18",
                "search": q
            }
        }
    );

    if (error.value) {
        throw new Error(error.value?.data.message as string)
    }

    if (!data.value) return

    return data.value.shows
}
