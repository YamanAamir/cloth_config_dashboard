import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

const getTokenKey = (role) => {
    if (role === 'admin' || role === 'server_owner') return 'admin_token';
    if (role === 'class_representative') return 'cr_token';
    if (role === 'student') return 'student_token';
    return 'token';
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        // Store with role-based key — overwrites same role, keeps other roles intact
        const tokenKey = getTokenKey(userData.role);
        localStorage.setItem(tokenKey, token);
        // Store current session key so API interceptor knows which to use
        localStorage.setItem('current_token_key', tokenKey);
    };

    const logout = () => {
        const role = user?.role;
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('current_token_key');
        const tokenKey = getTokenKey(role);
        localStorage.removeItem(tokenKey);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
