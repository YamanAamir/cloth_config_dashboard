import React from 'react';
import { Badge, Button, Dropdown, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';

const { Text } = Typography;

const NotificationBell = () => {
    // For now, return a simple bell without functionality
    // This prevents the socket import error while we focus on the upload issue
    
    const dropdownContent = (
        <div style={{ width: 300, padding: '16px', textAlign: 'center' }}>
            <Text type="secondary">
                Notifications will appear here when the backend is configured
            </Text>
        </div>
    );

    return (
        <Dropdown
            overlay={dropdownContent}
            trigger={['click']}
            placement="bottomRight"
        >
            <Badge count={0} size="small">
                <Button 
                    type="text" 
                    icon={<BellOutlined />}
                    style={{ fontSize: '16px' }}
                />
            </Badge>
        </Dropdown>
    );
};

export default NotificationBell;