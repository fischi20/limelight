import { workspace } from 'vscode';

type Config = {
    opacity: number;
    lightThemeColor: string;
    darkThemeColor: string;
    persistOnTabSwitch: boolean;
}

let cachedConfig: Config | undefined;

/**
 * Gets the configuration for the extension
 * @param reload If true ignores the cached config and reloads the config
 * @returns Readonly reference of the config
 */
export const getConfig = (reload: boolean = false): Readonly<Config> => {
    if (cachedConfig && !reload) {
        return cachedConfig;
    }

    const config = workspace.getConfiguration('limelight');
    
    const newConfig:Config = Object.freeze({
        opacity: config.get("opacity", 0.1),
        lightThemeColor: config.get("lightThemeColor", "rgb(0, 0, 0)"),
        darkThemeColor: config.get("darkThemeColor", "rgb(255, 255, 255)"),
        persistOnTabSwitch: config.get("persistOnTabSwitch", true),
    });

    cachedConfig = newConfig;
    return newConfig;
};