export const getPublicIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to get public IP:', error);
        return null;
    }
};

export const verifyConnection = async (targetIp) => {
    const currentIp = await getPublicIP();
    return currentIp === targetIp;
};
