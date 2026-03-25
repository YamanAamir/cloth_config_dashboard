import React, { useState, useEffect } from 'react';
import {
    Card,
    Typography,
    Spin,
    message,
    Empty
} from 'antd';
import { getMyClass } from '../api/api';
import NameListManager from '../components/NameListManager';

const { Title } = Typography;

const NameListPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchMyClass = async () => {
        setLoading(true);
        try {
            const classRes = await getMyClass();
            setMyClass(classRes.data.data?.[0]);
        } catch (error) {
            message.error('Failed to fetch class details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyClass();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!myClass) {
        return (
            <Card className="glass-card" style={{ margin: 24, textAlign: 'center' }}>
                <Empty description="No class assigned to you yet." />
            </Card>
        );
    }

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Class Name List</Title>
                <Typography.Text type="secondary">
                    Manage your class student name list for graduation garments
                </Typography.Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <NameListManager classId={myClass.id} isAdmin={false} />
            </Card>
        </div>
    );
};

export default NameListPage;
