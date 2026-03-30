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
        const token = localStorage.getItem('token');
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
            console.log("Session expired. Logging out...");

            // Clear storage
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Redirect to login
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