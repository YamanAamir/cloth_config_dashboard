import React from 'react';
import { Row, Col, Card, Statistic, Typography, List, Avatar, Tag, Space } from 'antd';
import {
    BankOutlined,
    UserOutlined,
    ShoppingOutlined,
    ArrowUpOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const DashboardPage = () => {
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

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Welcome to ClothConfig Admin</Title>
                <Text type="secondary">Here's what's happening today in your dashboard.</Text>
            </div>

            <Row gutter={[24, 24]}>
                {stats.map((stat, index) => (
                    <Col xs={24} sm={8} key={index}>
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
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Tag color="success" style={{ border: 'none', borderRadius: '4px' }}>
                                    <ArrowUpOutlined /> {stat.trend.split(' ')[0]}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: '12px' }}>{stat.trend.split(' ').slice(1).join(' ')}</Text>
                            </div>
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
                        <List
                            itemLayout="horizontal"
                            dataSource={recentActivities}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={
                                            <Avatar
                                                style={{ backgroundColor: item.status === 'success' ? '#f6ffed' : '#e6f7ff' }}
                                                icon={item.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ClockCircleOutlined style={{ color: '#1890ff' }} />}
                                            />
                                        }
                                        title={<strong>{item.action}</strong>}
                                        description={
                                            <Space>
                                                <Text type="secondary">{item.item}</Text>
                                                <Tag color="cyan">{item.time}</Tag>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
