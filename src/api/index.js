    import axios from 'axios';

    const api = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const apiFormdata = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    const addAuthToken = (config) => {
        const tokenKey = localStorage.getItem('current_token_key') || 'token';
        const token = localStorage.getItem(tokenKey);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    };

    api.interceptors.request.use(addAuthToken, (error) =>
        Promise.reject(error)
    );

    apiFormdata.interceptors.request.use(addAuthToken, (error) =>
        Promise.reject(error)
    );

    const handleUnauthorized = (error) => {
        if (error?.response?.status === 401) {
            const tokenKey = localStorage.getItem('current_token_key');
            if (tokenKey) localStorage.removeItem(tokenKey);
            localStorage.removeItem("current_token_key");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    };

    api.interceptors.response.use(
        (response) => response,
        handleUnauthorized
    );

    apiFormdata.interceptors.response.use(
        (response) => response,
        handleUnauthorized
    );

    export { api, apiFormdata };