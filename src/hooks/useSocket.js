import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

const getSocket = () => {
    if (!socketInstance) {
        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://cloth-config-backend.onrender.com';
        socketInstance = io(backendUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });
    }
    return socketInstance;
};

/**
 * useSocket hook for the admin dashboard
 * @param {string} room - room to join
 * @param {string} event - socket event name to listen for
 * @param {Function} callback - function when event fires
 */
const useSocket = (room, event, callback) => {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!room || !event) return;

        const socket = getSocket();
        socket.emit('join', room);

        const handler = (data) => callbackRef.current(data);
        socket.on(event, handler);

        return () => {
            socket.off(event, handler);
        };
    }, [room, event]);
};

export { getSocket };
export default useSocket;
