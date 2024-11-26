// Environment-specific settings
const ENV = import.meta.env.MODE;

interface Settings {
    apiUrl: string;
    // Add other settings here as needed
}

const productionSettings: Settings = {
    apiUrl: 'https://cognify-api.ironcliff.ai',
};

const developmentSettings: Settings = {
    apiUrl: 'http://localhost:8000',
};

// Select settings based on environment
const settings: Settings = ENV === 'production' ? productionSettings : developmentSettings;

export default settings; 