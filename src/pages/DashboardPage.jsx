import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Avatar, Spin, Badge } from 'antd';
import {
    BankOutlined, AppstoreOutlined, TeamOutlined, ShoppingCartOutlined,
    DollarOutlined, ClockCircleOutlined, UserOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { adminDashboard } from '../api/api';
import { formatDanishDate } from '../utils/constants';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    in_progress: '#1890ff',
    completed: '#52c41a',
    saved: '#faad14',
    partial_paid: '#13c2c2',
    cancelled: '#ff4d4f',
};

const STAT_CARDS = [
    { key: 'schools', label: 'Schools', icon: <BankOutlined />, color: '#1890ff', bg: '#e6f7ff' },
    { key: 'classes', label: 'Classes', icon: <AppstoreOutlined />, color: '#722ed1', bg: '#f9f0ff' },
    { key: 'class_reps', label: 'Class Reps', icon: <TeamOutlined />, color: '#722ed1', bg: '#f9f0ff' },
    { key: 'students', label: 'Students', icon: <UserOutlined />, color: '#52c41a', bg: '#f6ffed' },
    { key: 'orders', label: 'Orders', icon: <ShoppingCartOutlined />, color: '#fa8c16', bg: '#fff7e6' },
    { key: 'total_revenue', label: 'Revenue', icon: <DollarOutlined />, color: '#00b96b', bg: '#f0fff8', suffix: ' DKK' },
    // { key: 'pending_approvals', label: 'Pending Approvals', icon: <ClockCircleOutlined />, color: '#ff4d4f', bg: '#fff2f0' },
];

const DashboardPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await adminDashboard();
                setData(res.data.data);
            } catch { /* silent */ }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
    if (!data) return null;

    const monthlyLabels = (data.monthly_data || []).map(d => {
        const [y, m] = d.month.split('-');
        // Short month label for chart axis — use Danish locale with Copenhagen tz
        return new Intl.DateTimeFormat('da-DK', {
            timeZone: 'Europe/Copenhagen',
            month: 'short', year: '2-digit'
        }).format(new Date(y, m - 1));
    });

    const ordersData = (data.monthly_data || []).map((d, i) => ({
        month: monthlyLabels[i], orders: d.orders
    }));

    const revenueData = (data.monthly_data || []).map((d, i) => ({
        month: monthlyLabels[i], revenue: d.revenue
    }));

    const pieData = (data.order_status_distribution || []).map(d => ({
        name: d.status.replace(/_/g, ' '),
        value: d.count,
        color: STATUS_COLORS[d.status] || '#d9d9d9'
    }));

    const schoolData = (data.top_schools || []).map(s => ({
        name: s.name.length > 15 ? s.name.substring(0, 15) + '…' : s.name,
        students: s.student_count
    }));

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
                    <Text type="secondary">Welcome back, Admin</Text>
                </div>
            </div>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {STAT_CARDS.map(card => (
                    <Col xs={12} sm={8} md={6} lg={4} xl={4} key={card.key}>
                        <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 12, border: 'none', background: card.bg }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: 24, color: card.color }}>{card.icon}</div>
                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: card.color, lineHeight: 1.2 }}>
                                        {data.stats[card.key] || 0}{card.suffix || ''}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#888' }}>{card.label}</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Charts Row 1 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {/* Orders Bar Chart */}
                <Col xs={24} md={12}>
                    <Card title="Orders per Month" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={ordersData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="orders" fill="#00b96b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Revenue Line Chart */}
                <Col xs={24} md={12}>
                    <Card title="Revenue per Month (DKK)" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={v => `${v} DKK`} />
                                <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Charts Row 2 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {/* Order Status Pie */}
                <Col xs={24} md={8}>
                    <Card title="Order Status" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        {pieData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>No orders yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                        dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                                        labelLine={false}>
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>

                {/* Top Schools Bar */}
                <Col xs={24} md={16}>
                    <Card title="Top Schools by Students" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={schoolData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                                <Tooltip />
                                <Bar dataKey="students" fill="#722ed1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Recent Activity */}
            <Row gutter={[16, 16]}>
                {/* Recent Orders */}
                <Col xs={24} lg={8}>
                    <Card title="Recent Orders" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        {(data.recent_orders || []).length === 0 ? (
                            <Text type="secondary">No recent orders</Text>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {data.recent_orders.map(order => (
                                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar size={32} style={{ background: '#00b96b' }} icon={<ShoppingCartOutlined />} />
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{order.student}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{order.class}</Text>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text strong style={{ color: '#00b96b', fontSize: 13 }}>{order.amount} DKK</Text>
                                            <Tag color={STATUS_COLORS[order.status] ? undefined : 'default'}
                                                style={{ display: 'block', marginTop: 2, fontSize: 10, background: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status], border: 'none' }}>
                                                {order.status.replace(/_/g, ' ')}
                                            </Tag>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Recent Class Reps */}
                <Col xs={24} lg={8}>
                    <Card title="Recent Class Reps" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        {(data.recent_class_reps || []).length === 0 ? (
                            <Text type="secondary">No recent class reps</Text>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {data.recent_class_reps.map(rep => (
                                    <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar size={32} style={{ background: '#722ed1' }} icon={<UserOutlined />} />
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{rep.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{rep.class || ''}</Text>
                                            </div>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {formatDanishDate(rep.created_at || rep.time)}
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Recent Students */}
                <Col xs={24} lg={8}>
                    <Card title="Recent Students" style={{ borderRadius: 12, border: 'none' }} className="glass-card">
                        {(data.recent_students || []).length === 0 ? (
                            <Text type="secondary">No recent students</Text>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {data.recent_students.map(student => (
                                    <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar size={32} style={{ background: '#1890ff' }} icon={<UserOutlined />} />
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{student.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{student.class}</Text>
                                            </div>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {formatDanishDate(student.created_at || student.time)}
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
