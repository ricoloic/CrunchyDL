import type { ADNSearchFetch } from "./Types";

export async function searchADN(q: string) {
    const { data: deData, error: deError } = await useFetch<ADNSearchFetch>(
        `https://gw.api.animationdigitalnetwork.fr/show/catalog`,
        {
            method: "GET",
            headers: {
                "x-target-distribution": 'de',
            },
            query: {
                "maxAgeCategory": "18",
                "search": q
            }
        }
    );

    if (deError.value) {
        throw new Error(deError.value?.data.message as string)
    }

    if (!deData.value) return

    const { data: frData, error: frError } = await useFetch<ADNSearchFetch>(
        `https://gw.api.animationdigitalnetwork.fr/show/catalog`,
        {
            method: "GET",
            headers: {
                "x-target-distribution": 'fr',
            },
            query: {
                "maxAgeCategory": "18",
                "search": q
            }
        }
    );

    if (frError.value) {
        throw new Error(frError.value?.data.message as string)
    }

    if (!frData.value) return

    const deShows = deData.value.shows;
    const frShows = frData.value.shows;

    const mergeLanguagesOfDuplicates = (shows: {
        id: number
        url: string
        title: string
        image2x: string
        episodeCount: number,
        languages: Array<string>
      }[]) => {
        shows.forEach(show => {
            const existingShow = shows.find(s => s.id === show.id);
            if (existingShow) {
                const existingShowIndex = shows.findIndex(s=> s === existingShow);
                const rawLanguages = [...show.languages, ...existingShow.languages];
                const languages: Array<string> = []

                for (const l of rawLanguages) {
                    if (!languages.includes(l)) {
                        languages.push(l)
                    }
                }
                show.languages = languages
            }
        });
        return shows;
    };

    const allShows = mergeLanguagesOfDuplicates([...deShows, ...frShows]);

    const unique = [...new Map(allShows.map((s) => [s.id, s])).values()];

    return unique
}
