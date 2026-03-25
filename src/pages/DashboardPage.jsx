import React from 'react';
import { Row, Col, Card, Statistic, Typography, Avatar, Tag, Space, Spin } from 'antd';
import {
    BankOutlined,
    UserOutlined,
    ShoppingOutlined,
    ArrowUpOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    AppstoreOutlined,
    PictureOutlined,
    ShoppingCartOutlined
} from '@ant-design/icons';
import { useEffect } from 'react';
import { adminDashboard } from '../api/api';
import { useState } from 'react';

const { Title } = Typography;

const DashboardPage = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    const stats = [
        { title: 'Total Schools', value: 12, icon: <BankOutlined />, color: '#00b96b', trend: '+2 this month' },
        { title: 'Active Class Reps', value: 45, icon: <UserOutlined />, color: '#006d75', trend: '+5 this month' },
        { title: 'New Orders', value: 128, icon: <ShoppingOutlined />, color: '#237804', trend: '+12% from last week' },
    ];

    const recentActivities = [
        { id: 1, action: 'New school added', item: 'Springfield High', time: '2 hours ago', status: 'success' },
        { id: 2, action: 'Class rep registered', item: 'John Doe', time: '5 hours ago', status: 'processing' },
        { id: 3, action: 'School status updated', item: 'Riverdale Academy', time: '1 day ago', status: 'warning' },
        { id: 4, action: 'New order placed', item: 'Order #1234', time: '2 days ago', status: 'success' },
    ];
    // const fetchStats = async () => {
    //     try {
    //         const res = await getDashboardStats();
    //         const data = res.data?.data;

    //         const updatedStats = [
    //             {
    //                 title: "Total Schools",
    //                 value: data.schoolCount,
    //                 icon: <BankOutlined />,
    //                 color: "#00b96b",
    //             },
    //             {
    //                 title: "Total Classes",
    //                 value: data.classCount,
    //                 icon: <AppstoreOutlined />,
    //                 color: "#006d75",
    //             },
    //             {
    //                 title: "Total Users",
    //                 value: data.userCount,
    //                 icon: <UserOutlined />,
    //                 color: "#237804",
    //             },
    //             {
    //                 title: "Logos",
    //                 value: data.logoCount,
    //                 icon: <PictureOutlined />,
    //                 color: "#722ed1",
    //             },
    //             {
    //                 title: "Back Designs",
    //                 value: data.backDesignCount,
    //                 icon: <PictureOutlined />,
    //                 color: "#d46b08",
    //             },
    //         ];

    //         setStats(updatedStats);

    //     } catch (error) {
    //         console.error("Failed to fetch dashboard stats:", error);
    //     }
    // };

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await adminDashboard();
                const { data } = response.data || {};
                console.log('Dashboard response:', data);
                if (response.data.success) {
                    const updatedStats = [
                        {
                            title: "Total Schools",
                            value: data.schoolCount,
                            icon: <BankOutlined />,
                            color: "#a38a00",
                        },
                        {
                            title: "Total Classes",
                            value: data.classCount,
                            icon: <AppstoreOutlined />,
                            color: "#7f00a3",
                        },
                        {
                            title: "Total Users",
                            value: data.userCount,
                            icon: <UserOutlined />,
                            color: "#008aa5",
                        },
                        {
                            title: "Orders",
                            value: data.ordersCount,
                            icon: <ShoppingCartOutlined />,
                            color: "#22d1f4",
                        },
                        // {
                        //     title: "Logos",
                        //     value: data.logoCount,
                        //     icon: <PictureOutlined />,
                        //     color: "#722ed1",
                        // },
                        // {
                        //     title: "Back Designs",
                        //     value: data.backDesignCount,
                        //     icon: <PictureOutlined />,
                        //     color: "#d46b08",
                        // },
                    ];
                    setDashboard(updatedStats)
                }

            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="normal" />
            </div>
        )
    };

    if (!dashboard) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Typography.Text type="danger">Failed to load dashboard data.</Typography.Text>
            </div>
        )
    };
    console.log("dashboard", dashboard);
    console.log("stats  ", stats);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Welcome to Dashboard</Title>
                <Typography.Text type="secondary">Here's what's happening today in your dashboard.</Typography.Text>
            </div>

            <Row gutter={[24, 24]}>
                {dashboard.map((stat, index) => (
                    <Col xs={24} sm={6} key={index}>
                        <Card
                            className="glass-card fade-in"
                            style={{
                                border: 'none',
                                borderLeft: `4px solid ${stat.color}`,
                                transition: 'all 0.3s ease'
                            }}
                            hoverable
                        >
                            <Statistic
                                title={<span style={{ fontWeight: 500, color: '#666' }}>{stat.title}</span>}
                                value={stat.value}
                                prefix={
                                    <div style={{
                                        background: `${stat.color}15`,
                                        padding: '8px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px'
                                    }}>
                                        {React.cloneElement(stat.icon, { style: { color: stat.color, fontSize: '24px' } })}
                                    </div>
                                }
                                valueStyle={{ color: '#006d75', fontWeight: '800', fontSize: '28px' }}
                            />
                            {/* <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Tag color="success" style={{ border: 'none', borderRadius: '4px' }}>
                                    <ArrowUpOutlined />
                                </Tag>
                                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>{stat.trend.split(' ').slice(1).join(' ')}</Typography.Text>
                            </div> */}
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Card
                        title="Recent Activity"
                        className="glass-card"
                        style={{ border: 'none' }}
                        extra={<a href="#">View All</a>}
                    >
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {recentActivities.map((item) => (
                                <div key={item.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #f0f0f0',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <Avatar
                                            style={{ backgroundColor: item.status === 'success' ? '#f6ffed' : '#e6f7ff' }}
                                            icon={item.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ClockCircleOutlined style={{ color: '#1890ff' }} />}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.action}</div>
                                            <Space>
                                                <Typography.Text type="secondary">{item.item}</Typography.Text>
                                                <Tag color="cyan">{item.time}</Tag>
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
