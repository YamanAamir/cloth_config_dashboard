import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Typography,
    Space,
    Tag,
    Tabs,
    message,
    Image,
    Popconfirm,
    Tooltip
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    FileImageOutlined,
    ClockCircleOutlined,
    SyncOutlined
} from '@ant-design/icons';
import {
    getAllLogos,
    updateLogoStatus,
    getAllBackDesigns,
    updateBackDesignStatus
} from '../api/api';
import { LogoStatus, DesignStatus } from '../utils/constants';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ReviewUploadsPage = () => {
    const [logos, setLogos] = useState([]);
    const [backDesigns, setBackDesigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('1');

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === '1') {
                const response = await getAllLogos();
                setLogos(response.data.data || []);
            } else {
                const response = await getAllBackDesigns();
                setBackDesigns(response.data.data || []);
            }
        } catch (error) {
            message.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleStatusUpdate = async (id, status, type) => {
        try {
            if (type === 'logo') {
                await updateLogoStatus(id, { status });
                message.success(`Logo ${status} successfully`);
            } else {
                await updateBackDesignStatus(id, { status });
                message.success(`Back design ${status} successfully`);
            }
            fetchData();
        } catch (error) {
            message.error('Operation failed');
        }
    };

    const getStatusTag = (status) => {
        switch (status) {
            case LogoStatus.APPROVED:
            case DesignStatus.APPROVED:
                return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
            case LogoStatus.REJECTED:
            case DesignStatus.REJECTED:
                return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
            case LogoStatus.PENDING:
            case DesignStatus.PENDING:
                return <Tag color="processing" icon={<ClockCircleOutlined />}>Pending</Tag>;
            case LogoStatus.UPLOADED:
            case DesignStatus.UPLOADED:
                return <Tag color="default" icon={<SyncOutlined spin />}>Uploaded</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const logoColumns = [
        {
            title: 'Logo preview',
            dataIndex: 'file_path',
            key: 'file_path',
            render: (path) => (
                <Image
                    width={80}
                    height={80}
                    src={path}
                    fallback="https://via.placeholder.com/80?text=No+Logo"
                    style={{ borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                />
            ),
        },
        {
            title: 'Class / School',
            key: 'classInfo',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.class?.name || 'N/A'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.school?.name || 'N/A'}</Text>
                </Space>
            ),
        },
        {
            title: 'Uploaded By',
            dataIndex: 'user',
            key: 'user',
            render: (user) => (
                <Space direction="vertical" size={0}>
                    <Text>{user?.name || 'Unknown'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Approve">
                        <Popconfirm
                            title="Approve this logo?"
                            onConfirm={() => handleStatusUpdate(record.id, LogoStatus.APPROVED, 'logo')}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                disabled={record.status === LogoStatus.APPROVED}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Reject">
                        <Popconfirm
                            title="Reject this logo?"
                            onConfirm={() => handleStatusUpdate(record.id, LogoStatus.REJECTED, 'logo')}
                            okText="Yes"
                            cancelText="No"
                            okType="danger"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                disabled={record.status === LogoStatus.REJECTED}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const designColumns = [
        ...logoColumns.slice(0, 4),
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Approve">
                        <Popconfirm
                            title="Approve this design?"
                            onConfirm={() => handleStatusUpdate(record.id, DesignStatus.APPROVED, 'design')}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                disabled={record.status === DesignStatus.APPROVED}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Reject">
                        <Popconfirm
                            title="Reject this design?"
                            onConfirm={() => handleStatusUpdate(record.id, DesignStatus.REJECTED, 'design')}
                            okText="Yes"
                            cancelText="No"
                            okType="danger"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                disabled={record.status === DesignStatus.REJECTED}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Review Uploads</Title>
                <Text type="secondary">Review and approve class logos and back designs</Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab} animated={{ inkBar: true, tabPane: true }}>
                    <TabPane
                        tab={
                            <span>
                                <FileImageOutlined />
                                Class Logos
                            </span>
                        }
                        key="1"
                    >
                        <Table
                            columns={logoColumns}
                            dataSource={logos}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                    <TabPane
                        tab={
                            <span>
                                <EyeOutlined />
                                Back Designs
                            </span>
                        }
                        key="2"
                    >
                        <Table
                            columns={designColumns}
                            dataSource={backDesigns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default ReviewUploadsPage;
