export interface ADNPlayerConfig {
    player: {
        image: string,
        options: {
            user: {
              hasAccess: true,
              profileId: number,
              refreshToken: string,
              refreshTokenUrl: string  
            },
            chromecast: {
               appId: string,
               refreshTokenUrl: string 
            },
            ios: {
                videoUrl: string,
                appUrl: string,
                title: string
            },
            video: {
                startDate: string,
                currentDate: string,
                available: boolean,
                free: boolean,
                url: string
            },
            dock: Array<string>,
            preference: {
                quality: string,
                autoplay: boolean,
                language: string,
                green: boolean
            }
        }
    }

}