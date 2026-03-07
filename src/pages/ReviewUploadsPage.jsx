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
    Tooltip,
    Input,
    Select
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    FileImageOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import {
    getAllLogos,
    approveLogo,
    rejectLogo,
    getAllBackDesigns,
    approveBackDesign,
    rejectBackDesign
} from '../api/api';
import { Status, getUploadsUrl } from '../utils/constants';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All' },
    { value: '0', label: 'Approved' },
    { value: '2', label: 'Rejected' },
];

const ReviewUploadsPage = () => {
    const [logos, setLogos] = useState([]);
    const [backDesigns, setBackDesigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [logoPagination, setLogoPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
        status: '',
    });
    const [designPagination, setDesignPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
        status: '',
    });

    const fetchLogos = async () => {
        setLoading(true);
        try {
            const response = await getAllLogos({
                page: logoPagination.current,
                limit: logoPagination.limit,
                search: logoPagination.search,
                ...(logoPagination.status !== '' && { status: logoPagination.status }),
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setLogos(response.data.data || []);
            setLogoPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? 0,
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch logos');
        } finally {
            setLoading(false);
        }
    };

    const fetchBackDesigns = async () => {
        setLoading(true);
        try {
            const response = await getAllBackDesigns({
                page: designPagination.current,
                limit: designPagination.limit,
                search: designPagination.search,
                ...(designPagination.status !== '' && { status: designPagination.status }),
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setBackDesigns(response.data.data.filter(i => i.isFromConfigurator == false) || []);
            setDesignPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? 0,
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch back designs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === '1') fetchLogos();
    }, [activeTab, logoPagination.current, logoPagination.limit, logoPagination.search, logoPagination.status]);

    useEffect(() => {
        if (activeTab === '2') fetchBackDesigns();
    }, [activeTab, designPagination.current, designPagination.limit, designPagination.search, designPagination.status]);

    const handleApprove = async (id, type) => {
        try {
            if (type === 'logo') {
                await approveLogo(id);
                message.success('Logo approved');
                fetchLogos();
            } else {
                await approveBackDesign(id);
                message.success('Back design approved');
                fetchBackDesigns();
            }
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleReject = async (id, type) => {
        try {
            if (type === 'logo') {
                await rejectLogo(id);
                message.success('Logo rejected');
                fetchLogos();
            } else {
                await rejectBackDesign(id);
                message.success('Back design rejected');
                fetchBackDesigns();
            }
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const getStatusTag = (status) => {
        if (status === Status.ACTIVE) return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
        if (status === Status.INACTIVE) return <Tag color="warning" icon={<CheckCircleOutlined />}>Pending</Tag>;
        if (status === Status.DELETED) return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
        return <Tag color="default" icon={<ClockCircleOutlined />}>Pending</Tag>;
    };

    const logoColumns = [
        {
            title: 'Preview',
            dataIndex: 'file_path',
            key: 'file_path',
            render: (path) => (
                <Image
                    width={80}
                    height={80}
                    src={getUploadsUrl(path)}
                    fallback="https://via.placeholder.com/80?text=No+Logo"
                    style={{ borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                />
            ),
        },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t || '—'}</Text> },
        {
            title: 'School',
            key: 'school',
            render: (_, record) => <Text>{record.school?.name || '—'}</Text>,
        },
        {
            title: 'Uploaded By',
            key: 'user',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{record.user?.name || '—'}</Text>
                    {record.user?.email && <Text type="secondary" style={{ fontSize: 12 }}>{record.user.email}</Text>}
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
                            onConfirm={() => handleApprove(record.id, 'logo')}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                disabled={record.status === Status.ACTIVE}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Reject">
                        <Popconfirm
                            title="Reject this logo?"
                            onConfirm={() => handleReject(record.id, 'logo')}
                            okText="Yes"
                            cancelText="No"
                            okType="danger"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                disabled={record.status === Status.DELETED}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const designColumns = [
        {
            title: 'Preview',
            dataIndex: 'file_path',
            key: 'file_path',
            render: (path) => (
                <Image
                    width={80}
                    height={80}
                    src={getUploadsUrl(path)}
                    fallback="https://via.placeholder.com/80?text=No+Design"
                    style={{ borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                />
            ),
        },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t || '—'}</Text> },
        {
            title: 'Class',
            key: 'class',
            render: (_, record) => <Text>{record.class?.name || '—'}</Text>,
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
                            title="Approve this design?"
                            onConfirm={() => handleApprove(record.id, 'design')}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                disabled={record.status === Status.ACTIVE}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Reject">
                        <Popconfirm
                            title="Reject this design?"
                            onConfirm={() => handleReject(record.id, 'design')}
                            okText="Yes"
                            cancelText="No"
                            okType="danger"
                        >
                            <Button
                                type="text"
                                shape="circle"
                                icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                disabled={record.status === Status.DELETED}
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
                                Logos
                            </span>
                        }
                        key="1"
                    >
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <Select
                                placeholder="Status"
                                allowClear
                                style={{ width: 140 }}
                                options={STATUS_FILTER_OPTIONS}
                                value={logoPagination.status || undefined}
                                onChange={(v) => setLogoPagination(prev => ({ ...prev, status: v ?? '', current: 1 }))}
                            />
                            <Input.Search
                                placeholder="Search by name"
                                allowClear
                                enterButton
                                style={{ width: 260 }}
                                onSearch={(v) => setLogoPagination(prev => ({ ...prev, search: v ?? '', current: 1 }))}
                            />
                        </div>
                        <Table
                            columns={logoColumns}
                            dataSource={logos}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                current: logoPagination.current,
                                pageSize: logoPagination.limit,
                                total: logoPagination.total,
                                showSizeChanger: true,
                                showTotal: (total, range) =>
                                    `Showing ${range[0]}-${range[1]} of ${total} (Page ${logoPagination.current} of ${logoPagination.totalPages})`,
                                onChange: (page, pageSize) => {
                                    setLogoPagination(prev => ({
                                        ...prev,
                                        current: page,
                                        limit: pageSize,
                                    }));
                                },
                            }}
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
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <Select
                                placeholder="Status"
                                allowClear
                                style={{ width: 140 }}
                                options={STATUS_FILTER_OPTIONS}
                                value={designPagination.status || undefined}
                                onChange={(v) => setDesignPagination(prev => ({ ...prev, status: v ?? '', current: 1 }))}
                            />
                            <Input.Search
                                placeholder="Search by name"
                                allowClear
                                enterButton
                                style={{ width: 260 }}
                                onSearch={(v) => setDesignPagination(prev => ({ ...prev, search: v ?? '', current: 1 }))}
                            />
                        </div>
                        <Table
                            columns={designColumns}
                            dataSource={backDesigns}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                current: designPagination.current,
                                pageSize: designPagination.limit,
                                total: designPagination.total,
                                showSizeChanger: true,
                                showTotal: (total, range) =>
                                    `Showing ${range[0]}-${range[1]} of ${total} (Page ${designPagination.current} of ${designPagination.totalPages})`,
                                onChange: (page, pageSize) => {
                                    setDesignPagination(prev => ({
                                        ...prev,
                                        current: page,
                                        limit: pageSize,
                                    }));
                                },
                            }}
                        />
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default ReviewUploadsPage;
