export const getPublicIP = async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch('https://api.ipify.org?format=json', {
            signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('[Network] Failed to get public IP:', error.message);
        return null;
    }
};

export const verifyConnection = async (targetIp) => {
    const currentIp = await getPublicIP();
    return currentIp === targetIp;
};
