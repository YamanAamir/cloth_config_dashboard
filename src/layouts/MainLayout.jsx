import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    BankOutlined,
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const menuItems = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        },
        {
            key: '/schools',
            icon: <BankOutlined />,
            label: 'Schools',
        },
        {
            key: '/class-reps',
            icon: <UserOutlined />,
            label: 'Class Representatives',
        },
    ];

    const userMenuItems = [
        {
            key: 'profile',
            label: 'Profile',
            icon: <SettingOutlined />,
        },
        {
            key: 'logout',
            label: 'Logout',
            icon: <LogoutOutlined />,
            onClick: () => {
                logout();
                navigate('/login');
            },
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <h2 style={{
                        fontSize: collapsed ? '1.2rem' : '1.5rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #00b96b 0%, #006d75 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0,
                        transition: '0.3s'
                    }}>
                        {collapsed ? 'CC' : 'ClothConfig'}
                    </h2>
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    defaultSelectedKeys={[location.pathname]}
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ padding: '16px 0' }}
                />
            </Sider>
            <Layout>
                <Header style={{
                    padding: '0 24px',
                    background: colorBgContainer,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    zIndex: 1
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ backgroundColor: '#00b96b' }} icon={<UserOutlined />} />
                                <span style={{ fontWeight: 500 }}>{user?.name || 'Admin'}</span>
                            </Space>
                        </Dropdown>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: '24px',
                        minHeight: 280,
                        borderRadius: borderRadiusLG,
                        overflow: 'initial'
                    }}
                >
                    <div className="fade-in">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
