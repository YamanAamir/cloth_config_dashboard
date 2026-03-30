import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space, Tag, Spin } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    BankOutlined,
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
    TeamOutlined,
    SolutionOutlined,
    AppstoreOutlined,
    PictureOutlined,
    FileImageOutlined,
    CloudUploadOutlined,
    OrderedListOutlined,
    FileZipOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminDashboard, sidebarMenus } from '../api/api';
import { Role } from '../utils/constants';
import { use } from 'react';

const { Header, Sider, Content } = Layout;

// Map icon names from backend to Ant Design icons
const iconMap = {
    'DashboardIcon': <DashboardOutlined />,
    'SchoolIcon': <BankOutlined />,
    'PeopleIcon': <TeamOutlined />,
    'ClassIcon': <AppstoreOutlined />,
    'ImageIcon': <PictureOutlined />,
    'SettingsIcon': <SettingOutlined />,
    // Compatibility names
    'DashboardOutlined': <DashboardOutlined />,
    'BankOutlined': <BankOutlined />,
    'UserOutlined': <UserOutlined />,
    'TeamOutlined': <TeamOutlined />,
    'SolutionOutlined': <SolutionOutlined />,
    'ReviewIcon': <FileImageOutlined />,
    'FormatListBulletedIcon': <OrderedListOutlined />,
    'FolderZipIcon': <FileZipOutlined />,
};

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const allMenuItems = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
            roles: [Role.ADMIN, Role.STUDENT],
        },
        {
            key: '/schools',
            icon: <BankOutlined />,
            label: 'Schools',
            roles: [Role.ADMIN],
        },
        {
            key: '/class-reps',
            icon: <UserOutlined />,
            label: 'Class Representatives',
            roles: [Role.ADMIN],
        },
        {
            key: '/all-classes',
            icon: <AppstoreOutlined />,
            label: 'All Classes',
            roles: [Role.ADMIN],
        },
        {
            key: '/review-uploads',
            icon: <FileImageOutlined />,
            label: 'Review Uploads',
            roles: [Role.ADMIN],
        },
        {
            key: '/name-list',
            icon: <OrderedListOutlined />,
            label: 'Name List',
            roles: [Role.ADMIN],
        },
        {
            key: '/my-class',
            icon: <SolutionOutlined />,
            label: 'My Class',
            roles: [Role.CLASS_REPRESENTATIVE],
        },
        {
            key: '/upload-files',
            icon: <CloudUploadOutlined />,
            label: 'Upload Files',
            roles: [Role.CLASS_REPRESENTATIVE],
        },
        {
            key: '/namelist',
            icon: <OrderedListOutlined />,
            label: 'Name List',
            roles: [Role.CLASS_REPRESENTATIVE],
        },
        {
            key: '/back-design-configurator',
            icon: <PictureOutlined />,
            label: 'Back Design Configurator',
            roles: [Role.CLASS_REPRESENTATIVE],
        },
        {
            key: '/student-overview',
            icon: <UserOutlined />,
            label: 'Student Overview',
            roles: [Role.CLASS_REPRESENTATIVE],
        },
        {
            key: '/orders-list',
            icon: <OrderedListOutlined />,
            label: 'Orders List',
            roles: [Role.ADMIN, Role.CLASS_REPRESENTATIVE],
        },
        {
            key: '/production-files',
            icon: <FileZipOutlined />,
            label: 'Production Files',
            roles: [Role.ADMIN],
        },
    ];


    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const response = await sidebarMenus();
                const menusData = response.data?.menus || (Array.isArray(response.data) ? response.data : null);

                if (menusData && menusData.length > 0) {
                    const mappedItems = menusData.map(item => ({
                        key: item.path || item.key,
                        label: item.title || item.label,
                        icon: iconMap[item.icon] || <DashboardOutlined />,
                        children: item.children ? item.children.map(child => ({
                            key: child.path || child.key,
                            label: child.title || child.label,
                            icon: iconMap[child.icon]
                        })) : undefined
                    }));
                    setMenuItems(mappedItems);
                } else {
                    setMenuItems(allMenuItems.filter(item =>
                        !item.roles || item.roles.includes(user?.role)
                    ));
                }
            } catch (error) {
                console.error('Failed to fetch sidebar menus:', error);
                setMenuItems(allMenuItems.filter(item =>
                    !item.roles || item.roles.includes(user?.role)
                ));
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
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <Spin size="small" />
                    </div>
                ) : (
                    <Menu
                        theme="light"
                        mode="inline"
                        defaultSelectedKeys={[location.pathname]}
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        style={{ padding: '16px 0' }}
                    />
                )}
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
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                    <span style={{ fontWeight: 600 }}>{user?.name || 'User'}</span>
                                    <Tag color="cyan" style={{ fontSize: '10px', margin: 0, border: 'none' }}>
                                        {user?.role?.toUpperCase() || 'NO ROLE'}
                                    </Tag>
                                </div>
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
