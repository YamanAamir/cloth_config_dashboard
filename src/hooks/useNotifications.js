import { useEffect, useState } from 'react';
import { message, notification } from 'antd';
import { getSocket } from './useSocket';

export const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        // Listen for logo upload notifications
        socket.on('logo_uploaded', (data) => {
            const { logoName, schoolName, uploaderName, logoId } = data;
            
            // Show notification popup
            notification.info({
                message: 'New Logo Uploaded',
                description: `${uploaderName} uploaded "${logoName}" for ${schoolName}`,
                duration: 6,
                placement: 'topRight',
                onClick: () => {
                    // Navigate to review page or logo details
                    window.location.href = `/admin/logos/${logoId}`;
                }
            });

            // Add to notifications list
            setNotifications(prev => [{
                id: Date.now(),
                type: 'logo_upload',
                message: `New logo uploaded: ${logoName}`,
                school: schoolName,
                uploader: uploaderName,
                timestamp: new Date(),
                read: false,
                logoId
            }, ...prev]);
        });

        // Listen for back design upload notifications
        socket.on('back_design_uploaded', (data) => {
            const { designName, className, uploaderName, designId } = data;
            
            notification.info({
                message: 'New Back Design Uploaded',
                description: `${uploaderName} uploaded "${designName}" for ${className}`,
                duration: 6,
                placement: 'topRight',
                onClick: () => {
                    window.location.href = `/admin/back-designs/${designId}`;
                }
            });

            setNotifications(prev => [{
                id: Date.now(),
                type: 'back_design_upload',
                message: `New back design uploaded: ${designName}`,
                class: className,
                uploader: uploaderName,
                timestamp: new Date(),
                read: false,
                designId
            }, ...prev]);
        });

        return () => {
            socket.off('logo_uploaded');
            socket.off('back_design_uploaded');
        };
    }, []);

    const markAsRead = (notificationId) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === notificationId 
                    ? { ...notif, read: true }
                    : notif
            )
        );
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
        markAsRead,
        clearAll
    };
};