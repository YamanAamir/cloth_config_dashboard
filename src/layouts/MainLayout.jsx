import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space, Tag, Spin } from 'antd';
import {
    MenuFoldOutlined, MenuUnfoldOutlined,
    DashboardOutlined, BankOutlined, UserOutlined, LogoutOutlined,
    SettingOutlined, TeamOutlined, SolutionOutlined, AppstoreOutlined,
    PictureOutlined, FileImageOutlined, CloudUploadOutlined,
    OrderedListOutlined, FileZipOutlined, ShoppingCartOutlined,
    PrinterOutlined, GlobalOutlined, FontColorsOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sidebarMenus } from '../api/api';

const { Header, Sider, Content } = Layout;

const iconMap = {
    'DashboardIcon': <DashboardOutlined />,
    'SchoolIcon': <BankOutlined />,
    'PeopleIcon': <TeamOutlined />,
    'ClassIcon': <AppstoreOutlined />,
    'ImageIcon': <PictureOutlined />,
    'SettingsIcon': <SettingOutlined />,
    'SettingIcon': <SettingOutlined />,
    'GroupIcon': <SolutionOutlined />,
    'CloudUploadIcon': <CloudUploadOutlined />,
    'BrushIcon': <PictureOutlined />,
    'PeopleAltIcon': <TeamOutlined />,
    'ShoppingCartIcon': <ShoppingCartOutlined />,
    'PrintIcon': <PrinterOutlined />,
    'FolderZipIcon': <FileZipOutlined />,
    'FormatListBulletedIcon': <OrderedListOutlined />,
    'ReviewIcon': <FileImageOutlined />,
    'GlobalIcon': <GlobalOutlined />,
    'FontIcon': <FontColorsOutlined />,
    // Compat
    'DashboardOutlined': <DashboardOutlined />,
    'BankOutlined': <BankOutlined />,
    'UserOutlined': <UserOutlined />,
    'TeamOutlined': <TeamOutlined />,
    'SolutionOutlined': <SolutionOutlined />,
};

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const response = await sidebarMenus();
                const menus = response.data?.menus || [];

                if (menus.length > 0 && menus[0]?.module) {
                    // Module-wise structure from backend
                    const mapped = menus.map((module, idx) => ({
                        key: `module-${idx}`,
                        label: module.module,
                        type: 'group',
                        children: (module.children || []).map(item => ({
                            key: item.path,
                            label: item.title,
                            icon: iconMap[item.icon] || <DashboardOutlined />,
                        }))
                    }));
                    setMenuItems(mapped);
                } else if (Array.isArray(menus) && menus.length > 0) {
                    // Flat structure fallback
                    const mapped = menus.map(item => ({
                        key: item.path || item.key,
                        label: item.title || item.label,
                        icon: iconMap[item.icon] || <DashboardOutlined />,
                    }));
                    setMenuItems(mapped);
                }
            } catch (error) {
                console.error('Failed to fetch sidebar menus:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMenus();
    }, []);

    const userMenuItems = [
        {
            key: 'profile',
            label: 'Profile',
            icon: <SettingOutlined />,
            onClick: () => navigate('/profile'),
        },
        {
            key: 'logout',
            label: 'Logout',
            icon: <LogoutOutlined />,
            onClick: () => { logout(); navigate('/login'); },
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={220}>
                <div style={{
                    height: 64, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', padding: '0 16px',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <h2 style={{
                        fontSize: collapsed ? '1.2rem' : '1.4rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #00b96b 0%, #006d75 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0, transition: '0.3s'
                    }}>
                        {collapsed ? 'CC' : 'ClothConfig'}
                    </h2>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <Spin size="small" />
                    </div>
                ) : (
                    <Menu
                        theme="light"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        style={{ padding: '8px 0', borderRight: 0 }}
                    />
                )}
            </Sider>

            <Layout>
                <Header style={{
                    padding: '0 24px', background: colorBgContainer,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 1
                }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar style={{ backgroundColor: '#00b96b' }} icon={<UserOutlined />} />
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                <span style={{ fontWeight: 600 }}>{user?.name || 'User'}</span>
                                <Tag color="cyan" style={{ fontSize: '10px', margin: 0, border: 'none' }}>
                                    {user?.role?.replace(/_/g, ' ').toUpperCase() || 'NO ROLE'}
                                </Tag>
                            </div>
                        </Space>
                    </Dropdown>
                </Header>

                <Content style={{ margin: '24px', minHeight: 280, borderRadius: borderRadiusLG, overflow: 'initial' }}>
                    <div className="fade-in">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
